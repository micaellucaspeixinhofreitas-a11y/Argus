// Ponto único da API (todas as rotas /api/* chegam aqui via rewrite do vercel.json).
// Um único arquivo mantém o projeto dentro do limite de funções do plano gratuito da Vercel.
import { query, tx } from './_lib/db.js'
import { send, readJson, fail, HttpError, str, num } from './_lib/http.js'
import { hashPassword, verifyPassword, sessionCookie, clearCookie, currentUser, requireUser, requireAdmin, newResetToken, hashToken } from './_lib/auth.js'
import { sendMail } from './_lib/mail.js'
import { creditStatus, creditHistory, activePlan, hasPro, TZ } from './_lib/credits.js'
import { pixConfigured, pixPayload } from './_lib/pix.js'
import { runMapping, runResults, captureLeads, geocode, parseConfig, LIMITS } from './_lib/mapping.js'
import { catalogList, resolveSegments, ALL_BUSINESS } from './_lib/segments.js'
import { provider } from './_lib/providers/index.js'
import * as googleSource from './_lib/providers/google.js'
import * as tomtomSource from './_lib/providers/tomtom.js'
const PAID_SOURCES = { google: googleSource, tomtom: tomtomSource }
import { criteriaList } from './_lib/qualify.js'
import { createCheckout, periodMonths, paymentProvider } from './_lib/payments.js'

export const config = { maxDuration: 60 }

const routes = {}
const on = (method, path, fn) => { routes[`${method} ${path}`] = fn }

// ---------- saúde e metadados ----------
let lastSourceCheck = 0
on('GET', 'health', async ({ url }) => {
  let db = 'ok'
  try { await query('select 1') } catch (e) { db = e.code === 'DB_NOT_CONFIGURED' ? 'not_configured' : 'error' }
  const out = { ok: true, db, provider: provider().name, payments: paymentProvider() }
  // ?source=1: verifica se a fonte de dados responde (no máximo 1x por minuto por instância)
  if (url.searchParams.get('source') && Date.now() - lastSourceCheck > 60_000) {
    lastSourceCheck = Date.now()
    try {
      const prov = provider()
      const [place] = await prov.geocode('Avenida Paulista, São Paulo', 'BR')
      const found = await prov.searchPlaces({ areas: [{ lat: place.lat, lng: place.lng, radius_m: 400 }], segments: resolveSegments(['restaurantes']), allBusiness: ALL_BUSINESS, country: 'BR', limit: 50 })
      const by = s => found.filter(f => f.source === s)
      out.source = { ok: true, provider: prov.name, geocoded: place.display_name, sample: found.length, google: by('google').length, tomtom: by('tomtom').length, osm: by('osm').length, with_phone: found.filter(f => f.phone).length, with_website: found.filter(f => f.website).length, example: found[0]?.name }
    } catch (e) {
      out.source = { ok: false, error: e.message }
    }
    // testa cada fonte com chave isoladamente (só contagens e mensagens de erro)
    out.sources = {}
    for (const [label, mod] of Object.entries(PAID_SOURCES)) {
      if (!mod.available()) { out.sources[label] = 'sem chave'; continue }
      try {
        const r = await mod.searchPlaces({ areas: [{ lat: -23.5614, lng: -46.6559, radius_m: 500 }], segments: resolveSegments(['restaurantes']), allBusiness: ALL_BUSINESS, country: 'BR' })
        out.sources[label] = { ok: true, results: r.length, with_phone: r.filter(x => x.phone).length, with_website: r.filter(x => x.website).length, example: r[0]?.name }
      } catch (e) {
        out.sources[label] = { ok: false, error: String(e.message).slice(0, 200) }
      }
    }
  }
  // ?basemap=1: confere se a chave libera as imagens do mapa (só códigos HTTP)
  if (url.searchParams.get('basemap') && Date.now() - lastBasemapCheck > 30_000) {
    lastBasemapCheck = Date.now()
    out.basemap = {}
    for (const style of ['dark_all', 'voyager']) {
      try {
        const k = basemapKey()
        const r = await fetch(`https://basemaps.cartocdn.com/rastertiles/${style}/15/16046/12355.png${k ? `?key=${encodeURIComponent(k)}` : ''}`)
        out.basemap[style] = { status: r.status, type: r.headers.get('content-type'), with_key: Boolean(k) }
      } catch (e) {
        out.basemap[style] = { error: e.name }
      }
    }
  }
  return out
})

let lastBasemapCheck = 0

// A chave de mapas base da CARTO é pública por natureza (vai na URL das imagens do mapa)
const basemapKey = () => process.env.CARTO_BASEMAPS_KEY || process.env.CARTO_API_TOKEN || ''

on('GET', 'meta', async () => ({ segments: catalogList(), criteria: criteriaList(), limits: LIMITS, basemapKey: basemapKey() }))

// ---------- autenticação ----------
on('POST', 'auth/register', async ({ body }) => {
  const email = str(body.email, 160).toLowerCase()
  const name = str(body.name, 80)
  const password = String(body.password || '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Informe um e-mail válido.')
  if (password.length < 8) fail(400, 'A senha precisa ter pelo menos 8 caracteres.')
  if (body.acceptTerms !== true) fail(400, 'Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.')
  const hash = await hashPassword(password)
  const user = await tx(async db => {
    const exists = await db.query('select 1 from users where email = $1', [email])
    if (exists.rows.length) fail(409, 'Já existe uma conta com este e-mail.')
    // a primeira conta criada vira administradora da plataforma
    const { rows: [{ n }] } = await db.query('select count(*)::int as n from users')
    const { rows: [u] } = await db.query(
      'insert into users (email, name, password_hash, is_admin, accepted_terms_at) values ($1, $2, $3, $4, now()) returning id, email, name, is_admin',
      [email, name, hash, n === 0]
    )
    return u
  })
  return { status: 201, data: { user }, headers: { 'Set-Cookie': sessionCookie(user.id) } }
})

// limita tentativas por e-mail para dificultar ataques de força bruta
const recentEvents = async (type, key, minutes) => {
  const { rows: [{ n }] } = await query(
    `select count(*)::int as n from operations_log where type = $1 and detail->>'key' = $2 and created_at > now() - make_interval(mins => $3)`,
    [type, key, minutes])
  return n
}
const logEvent = (type, key, userId = null) =>
  query('insert into operations_log (user_id, type, detail) values ($1, $2, $3)', [userId, type, JSON.stringify({ key })])

on('POST', 'auth/login', async ({ body }) => {
  const email = str(body.email, 160).toLowerCase()
  if ((await recentEvents('login_failed', email, 15)) >= 8) fail(429, 'Muitas tentativas. Aguarde 15 minutos ou redefina sua senha.')
  const { rows: [u] } = await query('select id, email, name, is_admin, password_hash, session_version from users where email = $1', [email])
  if (!u || !(await verifyPassword(String(body.password || ''), u.password_hash))) {
    await logEvent('login_failed', email)
    fail(401, 'E-mail ou senha incorretos.')
  }
  const sv = u.session_version
  delete u.password_hash
  delete u.session_version
  return { data: { user: u }, headers: { 'Set-Cookie': sessionCookie(u.id, sv) } }
})

// endereço público do site para montar o link do e-mail (nunca a partir do cabeçalho Host em produção)
const appUrl = req => {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return `http://${req.headers['x-forwarded-host'] || req.headers.host}`
}

const RESET_MINUTES = 60

on('POST', 'auth/forgot', async ({ req, body }) => {
  const email = str(body.email, 160).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Informe um e-mail válido.')
  // resposta sempre igual: não revela se o e-mail tem conta
  const done = { ok: true, message: 'Se houver uma conta com este e-mail, enviamos um link para redefinir a senha. Confira também a caixa de spam.' }
  if ((await recentEvents('password_forgot', email, 60)) >= 3) return done
  await logEvent('password_forgot', email)
  const { rows: [u] } = await query('select id, name from users where email = $1', [email])
  if (!u) return done
  const token = newResetToken()
  await query(`insert into password_resets (user_id, token_hash, expires_at) values ($1, $2, now() + make_interval(mins => $3))`,
    [u.id, hashToken(token), RESET_MINUTES])
  const link = `${appUrl(req)}/redefinir-senha?token=${token}`
  const hello = u.name ? `Olá, ${u.name.replace(/[<>&"]/g, '')}!` : 'Olá!'
  await sendMail({
    to: email,
    subject: 'Redefinir sua senha da Argus',
    text: `${hello}\n\nRecebemos um pedido para redefinir a senha da sua conta na Argus.\nAbra o link abaixo em até ${RESET_MINUTES} minutos:\n\n${link}\n\nSe não foi você, ignore este e-mail: sua senha continua a mesma.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111"><h2>${hello}</h2><p>Recebemos um pedido para redefinir a senha da sua conta na <strong>Argus</strong>.</p><p><a href="${link}" style="display:inline-block;padding:12px 22px;background:#7c3aed;color:#fff;border-radius:10px;text-decoration:none">Criar nova senha</a></p><p style="color:#555;font-size:14px">O link vale por ${RESET_MINUTES} minutos e só pode ser usado uma vez. Se não foi você, ignore este e-mail: sua senha continua a mesma.</p></div>`,
  })
  return done
})

on('POST', 'auth/reset', async ({ body }) => {
  const token = str(body.token, 200)
  const password = String(body.password || '')
  if (password.length < 8) fail(400, 'A senha precisa ter pelo menos 8 caracteres.')
  const hash = await hashPassword(password)
  const user = await tx(async db => {
    const { rows: [r] } = await db.query(
      `select id, user_id from password_resets where token_hash = $1 and used_at is null and expires_at > now() for update`, [hashToken(token)])
    if (!r) fail(400, 'Link inválido ou expirado. Peça um novo link de redefinição.', 'RESET_INVALID')
    // a troca de senha encerra todas as sessões abertas antes dela
    await db.query('update users set password_hash = $1, session_version = session_version + 1 where id = $2', [hash, r.user_id])
    await db.query('update password_resets set used_at = now() where user_id = $1 and used_at is null', [r.user_id])
    await db.query(`insert into operations_log (user_id, type, detail) values ($1, 'password_reset', '{}')`, [r.user_id])
    const { rows: [u] } = await db.query('select id, email, name, is_admin, session_version from users where id = $1', [r.user_id])
    return u
  })
  const sv = user.session_version
  delete user.session_version
  return { data: { user }, headers: { 'Set-Cookie': sessionCookie(user.id, sv) } }
})

on('POST', 'auth/logout', async () => ({ data: { ok: true }, headers: { 'Set-Cookie': clearCookie() } }))

on('GET', 'auth/me', async ({ req }) => {
  const user = await currentUser(req)
  if (!user) return { user: null }
  return { user, credits: await creditStatus(user.id), pro: await hasPro(user) }
})

// ---------- geolocalização ----------
on('GET', 'geo/search', async ({ req, url }) => {
  await requireUser(req)
  return { results: await geocode(url.searchParams.get('q'), str(url.searchParams.get('country'), 2)) }
})

// ---------- mapeamento de oportunidades ----------
on('POST', 'mapping/run', async ({ req, body }) => {
  const user = await requireUser(req)
  const result = await runMapping(user, body)
  return { ...(await runResults(user, result.run_id)), credits: await creditStatus(user.id), sourceErrors: result.sourceErrors, hint: result.hint }
})

on('GET', 'mapping/result', async ({ req, url }) => {
  const user = await requireUser(req)
  return runResults(user, Number(url.searchParams.get('run')))
})

on('GET', 'mapping/runs', async ({ req }) => {
  const user = await requireUser(req)
  const { rows } = await query(
    `select id, config, status, total, high_fit, no_website, created_at from mapping_runs
      where user_id = $1 order by created_at desc limit 30`, [user.id])
  return { runs: rows }
})

// ---------- radar ----------
on('GET', 'radar', async ({ req, url }) => {
  const user = await requireUser(req)
  const runId = Number(url.searchParams.get('run')) || null
  const { rows: [all] } = await query(
    `select count(distinct r.company_id)::int as mapped,
            count(distinct r.company_id) filter (where r.high_fit)::int as high_fit,
            count(distinct r.company_id) filter (where c.website is null)::int as no_website
       from mapping_results r join mapping_runs m on m.id = r.run_id and m.user_id = $1
       join companies c on c.id = r.company_id`, [user.id])
  const { rows: [leads] } = await query(
    `select count(*)::int as captured,
            count(*) filter (where l.high_fit)::int as captured_high_fit,
            count(*) filter (where c.website is null)::int as captured_no_website
       from leads l join companies c on c.id = l.company_id where l.user_id = $1`, [user.id])
  let run = null
  if (runId) {
    const r = await query('select id, total as mapped, high_fit, no_website from mapping_runs where id = $1 and user_id = $2', [runId, user.id])
    run = r.rows[0] || null
  }
  // prioridade: alta aderência + sem presença digital, ainda não capturadas
  const { rows: priority } = await query(
    `select distinct on (c.id) c.id, c.name, c.category, r.score, r.high_fit, (c.website is null) as no_website, r.run_id
       from mapping_results r join mapping_runs m on m.id = r.run_id and m.user_id = $1
       join companies c on c.id = r.company_id
       left join leads l on l.company_id = c.id and l.user_id = $1
      where l.id is null and (r.high_fit or c.website is null)
      order by c.id, r.run_id desc limit 400`, [user.id])
  priority.sort((a, b) => (b.high_fit - a.high_fit) || (b.no_website - a.no_website) || ((b.score ?? -1) - (a.score ?? -1)))
  return { run, all, leads, priority: priority.slice(0, 12) }
})

// ---------- leads ----------
on('POST', 'leads/capture', async ({ req, body }) => {
  const user = await requireUser(req)
  const result = await captureLeads(user, { runId: body.runId, companyIds: body.companyIds }, creditStatus)
  return { ...result, credits: await creditStatus(user.id) }
})

const leadsQuery = `
  select l.id, l.captured_at, l.score, l.high_fit, l.run_id, c.id as company_id, c.name, c.category, c.phone, c.website,
         c.email, c.address, c.city, c.opening_hours, c.social,
         st_y(c.geom::geometry) as lat, st_x(c.geom::geometry) as lng
    from leads l join companies c on c.id = l.company_id
   where l.user_id = $1 and ($2 = '' or c.name ilike '%' || $2 || '%' or coalesce(c.category,'') ilike '%' || $2 || '%' or coalesce(c.city,'') ilike '%' || $2 || '%')
   order by l.captured_at desc`

on('GET', 'leads', async ({ req, url }) => {
  const user = await requireUser(req)
  const { rows } = await query(`${leadsQuery} limit 1000`, [user.id, str(url.searchParams.get('q'), 80)])
  return { leads: rows }
})

on('GET', 'leads/export', async ({ req }) => {
  const user = await requireUser(req)
  const { rows } = await query(leadsQuery, [user.id, ''])
  const cols = ['name', 'category', 'phone', 'website', 'email', 'address', 'city', 'lat', 'lng', 'score', 'captured_at']
  const escCsv = v => {
    const s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = '﻿' + [cols.join(','), ...rows.map(r => cols.map(c => escCsv(r[c])).join(','))].join('\n')
  return { raw: csv, contentType: 'text/csv; charset=utf-8', headers: { 'Content-Disposition': 'attachment; filename="leads-argus.csv"' } }
})

// ---------- buscas salvas ----------
on('GET', 'searches', async ({ req }) => {
  const user = await requireUser(req)
  const { rows } = await query(
    'select id, name, config, last_run_at, created_at from saved_searches where user_id = $1 order by created_at desc', [user.id])
  return { searches: rows }
})

on('POST', 'searches', async ({ req, body }) => {
  const user = await requireUser(req)
  const config = parseConfig(body.config)
  const name = str(body.name, 100) || [config.segments.join(', ') || 'Todos os segmentos', config.locality].filter(Boolean).join(' — ')
  const points = config.areas.length
    ? `st_setsrid(st_collect(array[${config.areas.map((_, i) => `st_makepoint($${i * 2 + 5}, $${i * 2 + 4})`).join(',')}]), 4326)::geography`
    : 'null'
  const params = [user.id, name, JSON.stringify(config)]
  config.areas.forEach(a => params.push(a.lat, a.lng))
  const { rows: [s] } = await query(
    `insert into saved_searches (user_id, name, config, areas) values ($1, $2, $3, ${points})
     returning id, name, config, last_run_at, created_at`, params)
  return { status: 201, data: { search: s } }
})

on('DELETE', 'searches', async ({ req, url }) => {
  const user = await requireUser(req)
  await query('delete from saved_searches where id = $1 and user_id = $2', [Number(url.searchParams.get('id')), user.id])
  return { ok: true }
})

// ---------- créditos ----------
on('GET', 'credits', async ({ req }) => {
  const user = await requireUser(req)
  const { rows: ledger } = await query(
    `select amount, reason, note, created_at from credit_ledger where user_id = $1 and (reason <> 'lead' or amount > 0)
      order by created_at desc limit 20`, [user.id])
  return { credits: await creditStatus(user.id), history: await creditHistory(user.id), adjustments: ledger, timezone: TZ }
})

// ---------- planos e assinaturas ----------
on('GET', 'plans', async () => {
  const { rows } = await query('select * from plans where active order by sort, monthly_credits')
  return { plans: rows }
})

async function subscriptionState(userId) {
  const { rows } = await query(
    `select s.*, p.name as plan_name from subscriptions s join plans p on p.id = s.plan_id
      where s.user_id = $1 order by s.created_at desc limit 10`, [userId])
  return { current: await activePlan(userId), subscriptions: rows }
}

on('GET', 'subscription', async ({ req }) => {
  const user = await requireUser(req)
  return subscriptionState(user.id)
})

on('POST', 'subscription', async ({ req, body }) => {
  const user = await requireUser(req)
  const period = body.period === 'quarterly' ? 'quarterly' : 'monthly'
  const method = body.paymentMethod === 'card' ? 'card' : 'pix'
  const { rows: [plan] } = await query('select * from plans where id = $1 and active', [str(body.planId, 40)])
  if (!plan) fail(404, 'Plano não encontrado.')
  if (plan.price_monthly_cents === 0 && plan.price_quarterly_cents === 0) fail(400, 'Este plano é gratuito e já está disponível.')
  await query(`update subscriptions set status = 'canceled', updated_at = now() where user_id = $1 and status = 'pending_payment'`, [user.id])
  const { rows: [sub] } = await query(
    `insert into subscriptions (user_id, plan_id, period, status, payment_method, payment_provider)
     values ($1, $2, $3, 'pending_payment', $4, $5) returning *`,
    [user.id, plan.id, period, method, paymentProvider()])
  const checkout = await createCheckout(sub, plan)
  await query(`insert into operations_log (user_id, type, detail) values ($1, 'subscribe', $2)`, [user.id, JSON.stringify({ plan: plan.id, period, method })])
  return { status: 201, data: { subscription: sub, checkout, ...(await subscriptionState(user.id)) } }
})

on('POST', 'subscription/cancel', async ({ req, body }) => {
  const user = await requireUser(req)
  const resume = body.resume === true
  await query(
    `update subscriptions set cancel_at_period_end = $2, updated_at = now()
      where user_id = $1 and status = 'active'`, [user.id, !resume])
  await query(`update subscriptions set status = 'canceled', updated_at = now() where user_id = $1 and status = 'pending_payment'`, [user.id])
  return subscriptionState(user.id)
})

// ---------- pagamento por Pix (QR Code) ----------
on('POST', 'payment/pix', async ({ req, body }) => {
  const user = await requireUser(req)
  const period = body.period === 'quarterly' ? 'quarterly' : 'monthly'
  const { rows: [plan] } = await query('select * from plans where id = $1 and active', [str(body.planId || 'pro', 40)])
  if (!plan) fail(404, 'Plano não encontrado.')
  const amountCents = period === 'quarterly' ? plan.price_quarterly_cents : plan.price_monthly_cents
  if (!amountCents) fail(400, 'Este plano é gratuito.')
  if (!pixConfigured()) fail(503, 'O pagamento por Pix ainda não foi configurado. Fale com o suporte.', 'PIX_NOT_CONFIGURED')
  // reaproveita o pedido pendente do mesmo plano/período; senão cria um novo
  let { rows: [sub] } = await query(
    `select * from subscriptions where user_id = $1 and status = 'pending_payment' and plan_id = $2 and period = $3 and payment_method = 'pix'
      order by created_at desc limit 1`, [user.id, plan.id, period])
  if (!sub) {
    await query(`update subscriptions set status = 'canceled', updated_at = now() where user_id = $1 and status = 'pending_payment'`, [user.id])
    const r = await query(
      `insert into subscriptions (user_id, plan_id, period, status, payment_method, payment_provider)
       values ($1, $2, $3, 'pending_payment', 'pix', 'pix_static') returning *`, [user.id, plan.id, period])
    sub = r.rows[0]
    const txid = `ARGUS${sub.id}`
    await query('update subscriptions set payment_reference = $2 where id = $1', [sub.id, txid])
    sub.payment_reference = txid
  }
  const payload = pixPayload({ amountCents, txid: sub.payment_reference, description: `Argus ${plan.name}` })
  return { subscription: sub, plan: { id: plan.id, name: plan.name }, period, amount_cents: amountCents, payload, receiver: process.env.PIX_NAME }
})

on('POST', 'payment/reported', async ({ req, body }) => {
  const user = await requireUser(req)
  const { rows: [sub] } = await query(
    `update subscriptions set payment_reported_at = now(), updated_at = now()
      where id = $1 and user_id = $2 and status = 'pending_payment' returning *`, [Number(body.subscriptionId), user.id])
  if (!sub) fail(404, 'Pedido de pagamento não encontrado.')
  await query(`insert into operations_log (user_id, type, detail) values ($1, 'payment_reported', $2)`, [user.id, JSON.stringify({ subscription: sub.id, ref: sub.payment_reference })])
  console.log(JSON.stringify({ evt: 'payment_reported', user: user.id, subscription: sub.id, ref: sub.payment_reference }))
  return { subscription: sub }
})

// ---------- administração ----------
on('GET', 'admin/runs', async ({ req }) => {
  await requireAdmin(req)
  const { rows } = await query(
    `select m.id, m.status, m.provider, m.total, m.high_fit, m.no_website, m.error, m.created_at, m.config, u.email
       from mapping_runs m join users u on u.id = m.user_id order by m.created_at desc limit 30`)
  return { runs: rows }
})

on('GET', 'admin/overview', async ({ req }) => {
  await requireAdmin(req)
  const { rows: users } = await query(
    `select u.id, u.email, u.name, u.is_admin, u.created_at,
            (select json_build_object('id', s.id, 'plan_id', s.plan_id, 'status', s.status, 'period', s.period, 'current_period_end', s.current_period_end,
                    'payment_reference', s.payment_reference, 'payment_reported_at', s.payment_reported_at)
               from subscriptions s where s.user_id = u.id order by s.created_at desc limit 1) as subscription,
            (select count(*) from leads l where l.user_id = u.id)::int as leads,
            (select count(*) from mapping_runs m where m.user_id = u.id)::int as runs
       from users u order by u.created_at desc limit 500`)
  const { rows: plans } = await query('select * from plans order by sort, monthly_credits')
  const { rows: [totals] } = await query(
    `select (select count(*) from users)::int as users, (select count(*) from companies)::int as companies,
            (select count(*) from leads)::int as leads, (select count(*) from mapping_runs)::int as runs`)
  return { users, plans, totals }
})

on('POST', 'admin/plans', async ({ req, body }) => {
  await requireAdmin(req)
  const id = str(body.id, 40).toLowerCase().replace(/[^a-z0-9_-]/g, '')
  if (!id) fail(400, 'Informe o identificador do plano.')
  const features = Array.isArray(body.features) ? body.features.map(f => str(f, 120)).filter(Boolean) : []
  await tx(async db => {
    if (body.is_default) await db.query('update plans set is_default = false')
    await db.query(
      `insert into plans (id, name, description, monthly_credits, daily_limit, price_monthly_cents, price_quarterly_cents, features, is_default, active, sort)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (id) do update set name=$2, description=$3, monthly_credits=$4, daily_limit=$5, price_monthly_cents=$6,
         price_quarterly_cents=$7, features=$8, is_default=$9, active=$10, sort=$11, updated_at=now()`,
      [id, str(body.name, 60) || id, str(body.description, 200), num(body.monthly_credits, 0, 10_000_000, 0),
        num(body.daily_limit, 0, 1_000_000, 0), num(body.price_monthly_cents, 0, 100_000_000, 0),
        num(body.price_quarterly_cents, 0, 100_000_000, 0), JSON.stringify(features), Boolean(body.is_default),
        body.active !== false, num(body.sort, 0, 1000, 0)])
  })
  const { rows } = await query('select * from plans order by sort, monthly_credits')
  return { plans: rows }
})

on('POST', 'admin/subscription', async ({ req, body }) => {
  const admin = await requireAdmin(req)
  const userId = Number(body.userId)
  const action = body.action
  if (action === 'activate') {
    const { rows: [plan] } = await query('select * from plans where id = $1', [str(body.planId, 40)])
    if (!plan) fail(404, 'Plano não encontrado.')
    const period = body.period === 'quarterly' ? 'quarterly' : 'monthly'
    await tx(async db => {
      await db.query(`update subscriptions set status = 'canceled', updated_at = now() where user_id = $1 and status in ('active','pending_payment')`, [userId])
      await db.query(
        `insert into subscriptions (user_id, plan_id, period, status, payment_provider, current_period_start, current_period_end)
         values ($1, $2, $3, 'active', 'manual', now(), now() + ($4 || ' months')::interval)`,
        [userId, plan.id, period, String(periodMonths(period))])
    })
  } else if (action === 'cancel') {
    await query(`update subscriptions set status = 'canceled', updated_at = now() where user_id = $1 and status in ('active','pending_payment')`, [userId])
  } else fail(400, 'Ação inválida.')
  await query(`insert into operations_log (user_id, type, detail) values ($1, 'admin_subscription', $2)`, [admin.id, JSON.stringify({ userId, action, plan: body.planId })])
  return { ok: true }
})

on('POST', 'admin/credits', async ({ req, body }) => {
  const admin = await requireAdmin(req)
  const amount = Math.trunc(num(body.amount, -100000, 100000, 0))
  if (!amount) fail(400, 'Informe a quantidade de créditos.')
  await query(`insert into credit_ledger (user_id, amount, reason, note) values ($1, $2, 'admin_adjustment', $3)`,
    [Number(body.userId), amount, str(body.note, 200) || `Ajuste por ${admin.email}`])
  return { ok: true }
})

// ---------- despacho ----------
export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const path = (url.searchParams.get('r') || url.pathname.replace(/^\/api\/?/, '')).replace(/\/+$/, '')
  const route = routes[`${req.method} ${path}`]
  try {
    if (!route) fail(404, 'Rota não encontrada.')
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      // proteção CSRF: aceita apenas JSON vindo da própria origem
      const ct = req.headers['content-type'] || ''
      if (req.method !== 'DELETE' && !ct.includes('application/json')) fail(415, 'Envie JSON.')
      const origin = req.headers.origin
      const host = req.headers['x-forwarded-host'] || req.headers.host
      if (origin && host && new URL(origin).host !== host) fail(403, 'Origem não permitida.')
    }
    const body = ['POST', 'PUT'].includes(req.method) ? await readJson(req) : {}
    const out = await route({ req, res, url, body })
    if (out && out.raw !== undefined) {
      res.statusCode = 200
      res.setHeader('Content-Type', out.contentType)
      for (const [k, v] of Object.entries(out.headers || {})) res.setHeader(k, v)
      return res.end(out.raw)
    }
    if (out && out.data !== undefined) return send(res, out.status || 200, out.data, out.headers)
    return send(res, 200, out)
  } catch (err) {
    const status = err instanceof HttpError || err.status ? err.status || 500 : 500
    if (status >= 500) console.error(err)
    const known = err instanceof HttpError || err.code === 'DB_NOT_CONFIGURED'
    send(res, status, { error: known ? err.message : 'Erro interno. Tente novamente.', code: err.code })
  }
}
