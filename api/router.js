// Ponto único da API (todas as rotas /api/* chegam aqui via rewrite do vercel.json).
// Um único arquivo mantém o projeto dentro do limite de funções do plano gratuito da Vercel.
import { query, tx } from './_lib/db.js'
import { send, readJson, fail, HttpError, str, num } from './_lib/http.js'
import { hashPassword, verifyPassword, sessionCookie, clearCookie, currentUser, requireUser, requireAdmin, newResetToken, hashToken, NO_PASSWORD, hasPassword, oauthCookie, clearOauthCookie, readOauthCookie } from './_lib/auth.js'
import crypto from 'node:crypto'
import { sendMail, mailConfigured } from './_lib/mail.js'
import { getSettings, saveSetting, publicStatus } from './_lib/settings.js'
import { creditStatus, creditHistory, activePlan, hasPro, TZ } from './_lib/credits.js'
import { pixConfigured, pixPayload } from './_lib/pix.js'
import { runMapping, runResults, captureLeads, geocode, parseConfig, LIMITS } from './_lib/mapping.js'
import { catalogList, resolveSegments, ALL_BUSINESS } from './_lib/segments.js'
import { provider } from './_lib/providers/index.js'
import * as googleSource from './_lib/providers/google.js'
import * as tomtomSource from './_lib/providers/tomtom.js'
const PAID_SOURCES = { google: googleSource, tomtom: tomtomSource }
import { criteriaList } from './_lib/qualify.js'
import { findCoupon, applyCoupon, couponLabel, couponUsage, normalizeCode } from './_lib/coupons.js'
import { createCheckout, periodMonths, paymentProvider } from './_lib/payments.js'

export const config = { maxDuration: 60 }

const routes = {}
const on = (method, path, fn) => { routes[`${method} ${path}`] = fn }

// ---------- saúde e metadados ----------
let lastSourceCheck = 0
on('GET', 'health', async ({ req, url }) => {
  // os testes de fonte de dados e de mapas chamam APIs pagas: só o administrador pode disparar
  if ((url.searchParams.get('source') || url.searchParams.get('basemap')) && !(await currentUser(req))?.is_admin) {
    fail(403, 'Diagnóstico disponível só para administradores.')
  }
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

const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

on('GET', 'meta', async () => ({ segments: catalogList(), criteria: criteriaList(), limits: LIMITS, basemapKey: basemapKey(), googleAuth: googleConfigured(), mail: mailConfigured() }))

// ---------- status do site (manutenção, aviso) ----------
on('GET', 'site/status', async () => publicStatus(await getSettings()))

// ---------- autenticação ----------
on('POST', 'auth/register', async ({ req, body }) => {
  if (!(await getSettings()).registrationsOpen) fail(403, 'Novos cadastros estão temporariamente fechados.', 'REGISTRATIONS_CLOSED')
  await rateLimit('register', clientIp(req), 5, 60, 'Muitas contas criadas a partir desta conexão. Tente de novo mais tarde.')
  const email = str(body.email, 160).toLowerCase()
  const name = str(body.name, 80)
  const password = String(body.password || '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Informe um e-mail válido.')
  checkPasswordSize(password)
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

// IP do cliente atrás do proxy da Vercel
const clientIp = req => String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim().slice(0, 64) || 'desconhecido'

// limite de requisições: registra o uso e recusa com 429 quando passa do máximo na janela
async function rateLimit(type, key, max, minutes, message = 'Muitas requisições. Aguarde alguns minutos e tente de novo.') {
  if ((await recentEvents(type, key, minutes)) >= max) {
    await logEvent('rate_limited', `${type}:${key}`)
    fail(429, message, 'RATE_LIMITED')
  }
  await logEvent(type, key)
}

const PASSWORD_MAX = 200
const checkPasswordSize = (password, label = 'A senha') => {
  if (password.length < 8) fail(400, `${label} precisa ter pelo menos 8 caracteres.`)
  if (password.length > PASSWORD_MAX) fail(400, `${label} pode ter no máximo ${PASSWORD_MAX} caracteres.`)
}

on('POST', 'auth/login', async ({ body }) => {
  const email = str(body.email, 160).toLowerCase()
  if ((await recentEvents('login_failed', email, 15)) >= 8) fail(429, 'Muitas tentativas. Aguarde 15 minutos ou redefina sua senha.')
  const { rows: [u] } = await query('select id, email, name, is_admin, password_hash, session_version from users where email = $1', [email])
  if (u && !hasPassword(u.password_hash)) fail(400, 'Esta conta usa o login com Google. Clique em "Continuar com Google" ou crie uma senha em "Esqueci minha senha".')
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
  // sem envio de e-mail configurado, não finge que mandou (vale igual para qualquer e-mail)
  if (!mailConfigured()) fail(503, 'A recuperação de senha por e-mail está indisponível no momento. Tente novamente mais tarde.', 'MAIL_NOT_CONFIGURED')
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

// Recuperação de emergência sem e-mail: ACCOUNT_RECOVERY="email|sha256 do token|validade ISO", definida pelo dono
// do projeto na Vercel. Vale uma única vez (o uso fica registrado) e só até a validade.
async function recoveryReset(db, token) {
  const [email, hash, until] = String(process.env.ACCOUNT_RECOVERY || '').split('|')
  if (!email || !hash || !until || new Date(until) < new Date()) return null
  const given = Buffer.from(hashToken(token))
  const expected = Buffer.from(hash)
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null
  const { rows: [used] } = await db.query(`select 1 from operations_log where type = 'account_recovery' and detail->>'key' = $1`, [hash])
  if (used) return null
  const { rows: [u] } = await db.query('select id from users where email = $1', [email.toLowerCase()])
  if (!u) return null
  await db.query(`insert into operations_log (user_id, type, detail) values ($1, 'account_recovery', $2)`, [u.id, JSON.stringify({ key: hash })])
  return { id: 0, user_id: u.id }
}

on('POST', 'auth/reset', async ({ req, body }) => {
  await rateLimit('password_reset_try', clientIp(req), 10, 15)
  const token = str(body.token, 200)
  const password = String(body.password || '')
  checkPasswordSize(password)
  const hash = await hashPassword(password)
  const user = await tx(async db => {
    let { rows: [r] } = await db.query(
      `select id, user_id from password_resets where token_hash = $1 and used_at is null and expires_at > now() for update`, [hashToken(token)])
    if (!r) r = await recoveryReset(db, token)
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

// ---------- login com Google (OAuth 2.0 / OpenID Connect) ----------
const googleRedirectUri = req => `${appUrl(req)}/api/auth/google/callback`
const safeNext = n => (typeof n === 'string' && /^\/(app|entrar)(\/|\?|$)/.test(n) ? n : '/app')

on('GET', 'auth/google', async ({ req, url }) => {
  if (!googleConfigured()) return { redirect: '/entrar?erro=google_indisponivel' }
  const state = crypto.randomBytes(24).toString('base64url')
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })
  return {
    redirect: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    headers: { 'Set-Cookie': oauthCookie(state, safeNext(url.searchParams.get('next'))) },
  }
})

on('GET', 'auth/google/callback', async ({ req, url }) => {
  const saved = readOauthCookie(req)
  const back = code => ({ redirect: `/entrar?erro=${code}`, headers: { 'Set-Cookie': clearOauthCookie() } })
  if (url.searchParams.get('error')) return back('google_cancelado')
  const state = url.searchParams.get('state') || ''
  if (!googleConfigured() || !saved || !state || saved.st !== state) return back('google_falhou')
  // troca o código pelo token direto com o Google (servidor a servidor, via TLS)
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: url.searchParams.get('code') || '',
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: googleRedirectUri(req),
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!tokenRes.ok) return back('google_falhou')
  const { access_token } = await tokenRes.json()
  const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(10_000),
  })
  if (!infoRes.ok) return back('google_falhou')
  const info = await infoRes.json()
  if (!info.sub || !info.email || info.email_verified !== true) return back('google_email')
  const email = String(info.email).toLowerCase().slice(0, 160)
  const user = await tx(async db => {
    let { rows: [u] } = await db.query('select id, session_version from users where google_sub = $1', [info.sub])
    if (!u) {
      // e-mail já cadastrado com senha: vincula a conta Google (o Google confirmou o e-mail)
      ;({ rows: [u] } = await db.query('update users set google_sub = $1 where email = $2 returning id, session_version', [info.sub, email]))
    }
    if (!u) {
      if (!(await getSettings()).registrationsOpen) return null
      const { rows: [{ n }] } = await db.query('select count(*)::int as n from users')
      ;({ rows: [u] } = await db.query(
        `insert into users (email, name, password_hash, is_admin, google_sub, accepted_terms_at) values ($1, $2, $3, $4, $5, now())
         returning id, session_version`,
        [email, str(info.name, 80), NO_PASSWORD, n === 0, info.sub]))
    }
    return u
  })
  if (!user) return back('cadastro_fechado')
  return { redirect: safeNext(saved.next), headers: { 'Set-Cookie': [clearOauthCookie(), sessionCookie(user.id, user.session_version)] } }
})

// ---------- minha conta ----------
const accountInfo = async userId => {
  const { rows: [u] } = await query(
    'select id, name, email, created_at, password_hash, google_sub, session_version from users where id = $1', [userId])
  return {
    user: { id: u.id, name: u.name, email: u.email, created_at: u.created_at, has_password: hasPassword(u.password_hash), google: Boolean(u.google_sub) },
    raw: u,
  }
}
const checkPassword = async (raw, password) => {
  if (!hasPassword(raw.password_hash)) return
  if (!(await verifyPassword(String(password || ''), raw.password_hash))) fail(401, 'Senha atual incorreta.')
}

on('GET', 'account', async ({ req }) => {
  const user = await requireUser(req)
  return { user: (await accountInfo(user.id)).user }
})

on('POST', 'account/profile', async ({ req, body }) => {
  const me = await requireUser(req)
  const { raw } = await accountInfo(me.id)
  const name = str(body.name, 80)
  const email = str(body.email, 160).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Informe um e-mail válido.')
  if (email !== raw.email) {
    await checkPassword(raw, body.currentPassword)
    const taken = await query('select 1 from users where email = $1 and id <> $2', [email, me.id])
    if (taken.rows.length) fail(409, 'Já existe uma conta com este e-mail.')
  }
  await query('update users set name = $1, email = $2 where id = $3', [name, email, me.id])
  await query(`insert into operations_log (user_id, type, detail) values ($1, 'account_profile', $2)`, [me.id, JSON.stringify({ email_changed: email !== raw.email })])
  return { user: (await accountInfo(me.id)).user }
})

on('POST', 'account/password', async ({ req, body }) => {
  const me = await requireUser(req)
  const { raw } = await accountInfo(me.id)
  const password = String(body.newPassword || '')
  checkPasswordSize(password, 'A nova senha')
  await checkPassword(raw, body.currentPassword)
  // troca a senha e encerra as outras sessões; esta continua com um cookie novo
  const { rows: [u] } = await query(
    'update users set password_hash = $1, session_version = session_version + 1 where id = $2 returning session_version',
    [await hashPassword(password), me.id])
  await query(`insert into operations_log (user_id, type, detail) values ($1, 'account_password', '{}')`, [me.id])
  return { data: { user: (await accountInfo(me.id)).user }, headers: { 'Set-Cookie': sessionCookie(me.id, u.session_version) } }
})

on('POST', 'account/delete', async ({ req, body }) => {
  const me = await requireUser(req)
  const { raw } = await accountInfo(me.id)
  if (String(body.confirm || '').trim().toUpperCase() !== 'EXCLUIR') fail(400, 'Digite EXCLUIR para confirmar.')
  await checkPassword(raw, body.currentPassword)
  if (me.is_admin) {
    const { rows: [{ n }] } = await query('select count(*)::int as n from users where is_admin and id <> $1', [me.id])
    if (!n) fail(400, 'Você é o único administrador. Defina outro administrador antes de excluir sua conta.')
  }
  // apaga a conta e, em cascata, mapeamentos, leads, buscas, créditos e assinaturas
  await query('delete from users where id = $1', [me.id])
  console.log(JSON.stringify({ evt: 'account_deleted', user: String(me.id) }))
  return { data: { ok: true }, headers: { 'Set-Cookie': clearCookie() } }
})

on('POST', 'auth/logout', async () => ({ data: { ok: true }, headers: { 'Set-Cookie': clearCookie() } }))

on('GET', 'auth/me', async ({ req }) => {
  const user = await currentUser(req)
  if (!user) return { user: null }
  return { user, credits: await creditStatus(user.id), pro: await hasPro(user) }
})

// ---------- geolocalização ----------
on('GET', 'geo/search', async ({ req, url }) => {
  const me = await requireUser(req)
  await rateLimit('geo_search', String(me.id), 40, 1, 'Muitas pesquisas de endereço seguidas. Aguarde um minuto.')
  return { results: await geocode(url.searchParams.get('q'), str(url.searchParams.get('country'), 2)) }
})

// ---------- mapeamento de oportunidades ----------
on('POST', 'mapping/run', async ({ req, body }) => {
  const user = await requireUser(req)
  if (!(await getSettings()).mappingEnabled && !user.is_admin) fail(503, 'Os mapeamentos estão pausados no momento. Tente de novo em instantes.', 'MAPPING_PAUSED')
  const result = await runMapping(user, body)
  return { ...(await runResults(user, result.run_id)), charged: result.charged, credits: await creditStatus(user.id), sourceErrors: result.sourceErrors, hint: result.hint, coverage: result.coverage }
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

// ---------- dashboard (visão geral de tudo que o usuário produziu) ----------
on('GET', 'dashboard', async ({ req, url }) => {
  const user = await requireUser(req)
  const days = [7, 30, 90].includes(Number(url.searchParams.get('dias'))) ? Number(url.searchParams.get('dias')) : 30
  const uid = user.id
  const [totals, prev, series, segments, cities, categories, quality, runs, leads, searches] = await Promise.all([
    query(
      `select (select count(*) from leads where user_id = $1)::int as leads,
              (select count(*) from leads where user_id = $1 and high_fit)::int as leads_high_fit,
              (select count(*) from mapping_runs where user_id = $1)::int as runs,
              (select count(distinct r.company_id) from mapping_results r join mapping_runs m on m.id = r.run_id and m.user_id = $1)::int as mapped,
              (select count(*) from saved_searches where user_id = $1)::int as searches,
              (select count(*) from leads where user_id = $1 and captured_at > now() - make_interval(days => $2))::int as leads_period,
              (select count(*) from mapping_runs where user_id = $1 and created_at > now() - make_interval(days => $2))::int as runs_period,
              (select coalesce(-sum(amount), 0) from credit_ledger where user_id = $1 and amount < 0 and created_at > now() - make_interval(days => $2))::int as credits_period`,
      [uid, days]),
    query(
      `select (select count(*) from leads where user_id = $1 and captured_at <= now() - make_interval(days => $2) and captured_at > now() - make_interval(days => $2 * 2))::int as leads,
              (select count(*) from mapping_runs where user_id = $1 and created_at <= now() - make_interval(days => $2) and created_at > now() - make_interval(days => $2 * 2))::int as runs`,
      [uid, days]),
    query(
      `with d as (select generate_series((now() at time zone $3)::date - ($2 - 1), (now() at time zone $3)::date, interval '1 day')::date as day)
       select to_char(d.day, 'YYYY-MM-DD') as day,
              (select count(*) from leads l where l.user_id = $1 and (l.captured_at at time zone $3)::date = d.day)::int as leads,
              (select count(*) from mapping_runs m where m.user_id = $1 and (m.created_at at time zone $3)::date = d.day)::int as runs
         from d order by d.day`,
      [uid, days, TZ]),
    query(
      `select s as label, count(*)::int as n from mapping_runs m, jsonb_array_elements_text(coalesce(m.config->'segments', '[]'::jsonb)) s
        where m.user_id = $1 group by s order by n desc, s limit 6`, [uid]),
    query(
      `select coalesce(nullif(c.city, ''), 'Sem cidade') as label, count(*)::int as n
         from leads l join companies c on c.id = l.company_id where l.user_id = $1 group by 1 order by n desc, 1 limit 6`, [uid]),
    query(
      `select coalesce(c.category, 'Outros') as label, count(*)::int as n
         from leads l join companies c on c.id = l.company_id where l.user_id = $1 group by 1 order by n desc, 1 limit 6`, [uid]),
    query(
      `select count(*)::int as total,
              count(*) filter (where c.phone is not null)::int as phone,
              count(*) filter (where c.website is null)::int as no_website,
              count(*) filter (where c.email is not null)::int as email,
              count(*) filter (where l.high_fit)::int as high_fit,
              count(*) filter (where l.score is not null)::int as scored
         from leads l join companies c on c.id = l.company_id where l.user_id = $1`, [uid]),
    query(
      `select id, config, status, total, high_fit, no_website, created_at from mapping_runs
        where user_id = $1 order by created_at desc limit 6`, [uid]),
    query(
      `select l.id, l.captured_at, l.high_fit, c.name, c.city, c.category, c.phone
         from leads l join companies c on c.id = l.company_id where l.user_id = $1 order by l.captured_at desc limit 6`, [uid]),
    query('select id, name, last_run_at from saved_searches where user_id = $1 order by coalesce(last_run_at, created_at) desc limit 4', [uid]),
  ])
  return {
    days, totals: totals.rows[0], previous: prev.rows[0], series: series.rows,
    segments: segments.rows, cities: cities.rows, categories: categories.rows, quality: quality.rows[0],
    recentRuns: runs.rows, recentLeads: leads.rows, savedSearches: searches.rows,
    credits: await creditStatus(uid),
  }
})

// ---------- leads ----------
on('POST', 'leads/capture', async ({ req, body }) => {
  const user = await requireUser(req)
  const result = await captureLeads(user, { runId: body.runId, companyIds: body.companyIds })
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
  const q = str(url.searchParams.get('q'), 80)
  const { rows } = await query(`${leadsQuery} limit 1000`, [user.id, q])
  const total = rows.length < 1000 ? rows.length
    : (await query(`select count(*)::int as n from (${leadsQuery}) t`, [user.id, q])).rows[0].n
  return { leads: rows, total }
})

on('GET', 'leads/export', async ({ req }) => {
  const user = await requireUser(req)
  const { rows } = await query(leadsQuery, [user.id, ''])
  const cols = ['name', 'category', 'phone', 'website', 'email', 'address', 'city', 'opening_hours', 'social', 'lat', 'lng', 'score', 'captured_at']
  const escCsv = v => {
    if (v && typeof v === 'object' && !(v instanceof Date)) v = Object.entries(v).map(([k, x]) => `${k}: ${x}`).join(' | ')
    // evita fórmulas no Excel, sem estragar telefones como +55 11 ...
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) && !/^\+?[\d\s().-]+$/.test(v)) v = `'${v}`
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
  const { rows: [{ n }] } = await query('select count(*)::int as n from saved_searches where user_id = $1', [user.id])
  if (n >= 100) fail(400, 'Você chegou ao limite de 100 buscas salvas. Exclua alguma para salvar outra.')
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

// Pix não renova sozinho: assinatura cujo período acabou passa a "expirada"
const expireSubscriptions = (userId = null) => query(
  `update subscriptions set status = 'expired', updated_at = now()
    where status = 'active' and current_period_end is not null and current_period_end < now() and ($1::bigint is null or user_id = $1)`, [userId])

// Início do novo período: renovar o MESMO plano antes do fim soma os dias que faltam; trocar de plano começa agora
async function periodStart(db, userId, planId) {
  const { rows: [cur] } = await db.query(
    `select current_period_end from subscriptions where user_id = $1 and status = 'active' and plan_id = $2 and current_period_end > now()
      order by current_period_end desc limit 1`, [userId, planId])
  return cur ? cur.current_period_end : new Date()
}

async function subscriptionState(userId) {
  await expireSubscriptions(userId)
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

// ---------- cupons ----------
const planAndPrice = async (planId, periodIn) => {
  const period = periodIn === 'quarterly' ? 'quarterly' : 'monthly'
  const { rows: [plan] } = await query('select * from plans where id = $1 and active', [str(planId || 'pro', 40)])
  if (!plan) fail(404, 'Plano não encontrado.')
  const price = period === 'quarterly' ? plan.price_quarterly_cents : plan.price_monthly_cents
  if (!price) fail(400, 'Este plano é gratuito.')
  return { plan, period, price }
}

on('POST', 'coupons/check', async ({ req, body }) => {
  const user = await requireUser(req)
  await rateLimit('coupon_check', String(user.id), 15, 10, 'Muitas tentativas de cupom. Aguarde alguns minutos.')
  const { plan, period, price } = await planAndPrice(body.planId, body.period)
  const coupon = await findCoupon({ query }, body.code, { userId: user.id, plan, period })
  return { code: coupon.code, label: couponLabel(coupon), description: coupon.description, price_cents: price, ...applyCoupon(coupon, price) }
})

// ---------- pagamento por Pix (QR Code) ----------
on('POST', 'payment/pix', async ({ req, body }) => {
  const user = await requireUser(req)
  if (!(await getSettings()).paymentsEnabled) fail(503, 'Os pagamentos estão pausados no momento. Tente de novo mais tarde.', 'PAYMENTS_PAUSED')
  await rateLimit('payment_pix', String(user.id), 20, 10)
  const { plan, period, price } = await planAndPrice(body.planId, body.period)
  const code = normalizeCode(body.couponCode)
  return tx(async db => {
    await db.query('select id from users where id = $1 for update', [user.id])
    // reaproveita o pedido pendente do mesmo plano/período/cupom; senão cria um novo
    let { rows: [sub] } = await db.query(
      `select s.*, c.code as coupon_code from subscriptions s left join coupons c on c.id = s.coupon_id
        where s.user_id = $1 and s.status = 'pending_payment' and s.plan_id = $2 and s.period = $3 and s.payment_method = 'pix'
        order by s.created_at desc limit 1`, [user.id, plan.id, period])
    if (sub && (sub.coupon_code || '') !== code) sub = null
    const coupon = code ? await findCoupon(db, code, { userId: user.id, plan, period, ignoreSubscriptionId: sub?.id || 0 }) : null
    const { amount_cents, discount_cents } = applyCoupon(coupon, price)
    if (!sub) {
      await db.query(`update subscriptions set status = 'canceled', updated_at = now() where user_id = $1 and status = 'pending_payment'`, [user.id])
      ;({ rows: [sub] } = await db.query(
        `insert into subscriptions (user_id, plan_id, period, status, payment_method, payment_provider, coupon_id, amount_cents, discount_cents)
         values ($1, $2, $3, 'pending_payment', 'pix', 'pix_static', $4, $5, $6) returning *`,
        [user.id, plan.id, period, coupon?.id || null, amount_cents, discount_cents]))
      const txid = `ARGUS${sub.id}`
      await db.query('update subscriptions set payment_reference = $2 where id = $1', [sub.id, txid])
      sub.payment_reference = txid
    } else {
      await db.query('update subscriptions set amount_cents = $2, discount_cents = $3 where id = $1', [sub.id, amount_cents, discount_cents])
    }
    const base = { subscription: sub, plan: { id: plan.id, name: plan.name }, period, price_cents: price, discount_cents, amount_cents,
      coupon: coupon ? { code: coupon.code, label: couponLabel(coupon) } : null }
    // cupom de 100%: libera o plano na hora, sem Pix
    if (amount_cents === 0) {
      const start = await periodStart(db, user.id, plan.id)
      await db.query(`update subscriptions set status = 'canceled', updated_at = now() where user_id = $1 and status = 'active'`, [user.id])
      await db.query(
        `update subscriptions set status = 'active', payment_provider = 'coupon', current_period_start = $3,
                current_period_end = $3::timestamptz + ($2 || ' months')::interval, updated_at = now() where id = $1`,
        [sub.id, String(periodMonths(period)), start])
      await db.query(`insert into operations_log (user_id, type, detail) values ($1, 'coupon_free_activation', $2)`, [user.id, JSON.stringify({ subscription: sub.id, coupon: coupon.code })])
      return { ...base, activated: true }
    }
    if (!pixConfigured()) fail(503, 'O pagamento por Pix está indisponível no momento. Tente novamente mais tarde.', 'PIX_NOT_CONFIGURED')
    const payload = pixPayload({ amountCents: amount_cents, txid: sub.payment_reference, description: `Argus ${plan.name}` })
    return { ...base, amount_cents, payload, receiver: process.env.PIX_NAME }
  })
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
  await expireSubscriptions()
  const { rows: users } = await query(
    `select u.id, u.email, u.name, u.is_admin, u.created_at,
            (select json_build_object('id', s.id, 'plan_id', s.plan_id, 'status', s.status, 'period', s.period, 'current_period_end', s.current_period_end,
                    'payment_reference', s.payment_reference, 'payment_reported_at', s.payment_reported_at)
               from subscriptions s where s.user_id = u.id order by s.created_at desc limit 1) as subscription,
            (select count(*) from leads l where l.user_id = u.id)::int as leads,
            (select count(*) from mapping_runs m where m.user_id = u.id)::int as runs
       from users u order by u.created_at desc limit 500`)
  const { rows: plans } = await query('select * from plans where deleted_at is null order by sort, monthly_credits')
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
         price_quarterly_cents=$7, features=$8, is_default=$9, active=$10, sort=$11, deleted_at=null, updated_at=now()`,
      [id, str(body.name, 60) || id, str(body.description, 200), num(body.monthly_credits, 0, 10_000_000, 0),
        num(body.daily_limit, 0, 1_000_000, 0), num(body.price_monthly_cents, 0, 100_000_000, 0),
        num(body.price_quarterly_cents, 0, 100_000_000, 0), JSON.stringify(features), Boolean(body.is_default),
        body.active !== false, num(body.sort, 0, 1000, 0)])
  })
  const { rows } = await query('select * from plans where deleted_at is null order by sort, monthly_credits')
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
      // se há um pedido Pix pendente do mesmo plano/período, ele é o que foi pago (mantém cupom e valor)
      const { rows: [pending] } = await db.query(
        `select id from subscriptions where user_id = $1 and status = 'pending_payment' and plan_id = $2 and period = $3
          order by created_at desc limit 1`, [userId, plan.id, period])
      const start = await periodStart(db, userId, plan.id)
      await db.query(`update subscriptions set status = 'canceled', updated_at = now() where user_id = $1 and status in ('active','pending_payment') and id <> $2`, [userId, pending?.id || 0])
      if (pending) {
        await db.query(
          `update subscriptions set status = 'active', current_period_start = $3, current_period_end = $3::timestamptz + ($2 || ' months')::interval,
                  updated_at = now() where id = $1`, [pending.id, String(periodMonths(period)), start])
      } else {
        const price = period === 'quarterly' ? plan.price_quarterly_cents : plan.price_monthly_cents
        await db.query(
          `insert into subscriptions (user_id, plan_id, period, status, payment_provider, current_period_start, current_period_end, amount_cents)
           values ($1, $2, $3, 'active', 'manual', $6, $6::timestamptz + ($4 || ' months')::interval, $5)`,
          [userId, plan.id, period, String(periodMonths(period)), price, start])
      }
    })
  } else if (action === 'cancel') {
    await query(`update subscriptions set status = 'canceled', updated_at = now() where user_id = $1 and status in ('active','pending_payment')`, [userId])
  } else fail(400, 'Ação inválida.')
  await query(`insert into operations_log (user_id, type, detail) values ($1, 'admin_subscription', $2)`, [admin.id, JSON.stringify({ userId, action, plan: body.planId })])
  return { ok: true }
})

// ---------- administração: controle do site ----------
on('GET', 'admin/settings', async ({ req }) => {
  await requireAdmin(req)
  const { rows } = await query(
    `select s.key, s.updated_at, u.email as updated_by from site_settings s left join users u on u.id = s.updated_by`)
  return { settings: await getSettings(true), history: rows }
})

on('POST', 'admin/settings', async ({ req, body }) => {
  const admin = await requireAdmin(req)
  const current = await getSettings(true)
  const changed = []
  if (body.maintenance) {
    const m = body.maintenance
    let eta = null
    if (m.eta) {
      const d = new Date(m.eta)
      if (Number.isNaN(d.getTime())) fail(400, 'Previsão de retorno inválida.')
      eta = d.toISOString()
    }
    await saveSetting('maintenance', {
      enabled: m.enabled === true,
      scope: m.scope === 'all' ? 'all' : 'platform',
      message: str(m.message, 400),
      eta,
    }, admin.id)
    changed.push('maintenance')
  }
  if (body.announcement) {
    const a = body.announcement
    await saveSetting('announcement', { enabled: a.enabled === true, text: str(a.text, 240), tone: ['info', 'warning', 'success'].includes(a.tone) ? a.tone : 'info' }, admin.id)
    changed.push('announcement')
  }
  for (const key of ['registrationsOpen', 'paymentsEnabled', 'mappingEnabled']) {
    if (typeof body[key] === 'boolean' && body[key] !== current[key]) {
      await saveSetting(key, body[key], admin.id)
      changed.push(key)
    }
  }
  await query(`insert into operations_log (user_id, type, detail) values ($1, 'admin_settings', $2)`, [admin.id, JSON.stringify({ key: changed.join(',') })])
  return { settings: await getSettings(true) }
})

// ---------- administração: excluir plano ----------
on('POST', 'admin/plans/delete', async ({ req, body }) => {
  const admin = await requireAdmin(req)
  const id = str(body.id, 40)
  const result = await tx(async db => {
    const { rows: [plan] } = await db.query('select * from plans where id = $1 and deleted_at is null for update', [id])
    if (!plan) fail(404, 'Plano não encontrado.')
    if (plan.is_default) fail(400, 'Este é o plano padrão de quem não assina. Marque outro plano como padrão antes de excluir.')
    const { rows: [{ n }] } = await db.query(
      `select count(*)::int as n from subscriptions where plan_id = $1 and (status = 'pending_payment' or (status = 'active' and current_period_end > now()))`, [id])
    if (n) fail(409, `Não dá para excluir: ${n} assinatura(s) ativa(s) ou aguardando pagamento usam este plano. Desmarque "Ativo" para parar novas assinaturas e exclua quando elas terminarem.`)
    const { rows: [{ h }] } = await db.query('select count(*)::int as h from subscriptions where plan_id = $1', [id])
    if (h) {
      // há histórico de assinaturas: o plano some do site e do painel, mas o histórico continua íntegro
      await db.query('update plans set active = false, is_default = false, deleted_at = now(), updated_at = now() where id = $1', [id])
      return 'arquivado'
    }
    await db.query('update coupons set plan_id = null where plan_id = $1', [id])
    await db.query('delete from plans where id = $1', [id])
    return 'excluido'
  })
  await query(`insert into operations_log (user_id, type, detail) values ($1, 'admin_plan_delete', $2)`, [admin.id, JSON.stringify({ plan: id, result })])
  const { rows } = await query('select * from plans where deleted_at is null order by sort, monthly_credits')
  return { result, plans: rows }
})

// ---------- administração: atividade suspeita ----------
on('GET', 'admin/security', async ({ req }) => {
  await requireAdmin(req)
  const [failed, bursts, limited, events] = await Promise.all([
    query(`select detail->>'key' as email, count(*)::int as n, max(created_at) as last
             from operations_log where type = 'login_failed' and created_at > now() - interval '24 hours'
            group by 1 order by n desc limit 20`),
    query(`select detail->>'key' as email, count(*)::int as n, min(created_at) as first, max(created_at) as last
             from operations_log where type = 'login_failed' and created_at > now() - interval '24 hours'
            group by 1, date_trunc('minute', created_at) having count(*) >= 5 order by last desc limit 20`),
    query(`select split_part(detail->>'key', ':', 1) as kind, count(*)::int as n, max(created_at) as last
             from operations_log where type = 'rate_limited' and created_at > now() - interval '24 hours'
            group by 1 order by n desc`),
    query(`select o.type, o.created_at, u.email, o.detail from operations_log o left join users u on u.id = o.user_id
            where o.type in ('admin_settings','admin_plan_delete','password_reset','account_recovery','account_password','account_profile','admin_subscription','admin_coupon','coupon_free_activation')
            order by o.created_at desc limit 30`),
  ])
  return { failedLogins: failed.rows, bursts: bursts.rows, rateLimited: limited.rows, events: events.rows }
})

// ---------- administração: cupons ----------
on('GET', 'admin/coupons', async ({ req }) => {
  await requireAdmin(req)
  return { coupons: await couponUsage({ query }) }
})

on('POST', 'admin/coupons', async ({ req, body }) => {
  const admin = await requireAdmin(req)
  const code = normalizeCode(body.code)
  if (code.length < 3) fail(400, 'O código precisa ter pelo menos 3 letras ou números.')
  const kind = body.kind === 'amount' ? 'amount' : 'percent'
  const percent = kind === 'percent' ? Math.trunc(num(body.percent_off, 0, 100, 0)) : null
  const amount = kind === 'amount' ? Math.round(num(body.amount_off_cents, 0, 100_000_000, 0)) : null
  if (kind === 'percent' && !percent) fail(400, 'Informe a porcentagem de desconto (1 a 100).')
  if (kind === 'amount' && !amount) fail(400, 'Informe o valor do desconto.')
  const planId = str(body.plan_id, 40) || null
  if (planId) {
    const { rows } = await query('select 1 from plans where id = $1', [planId])
    if (!rows.length) fail(404, 'Plano não encontrado.')
  }
  const period = ['monthly', 'quarterly'].includes(body.period) ? body.period : null
  const maxRedemptions = Math.trunc(num(body.max_redemptions, 0, 1_000_000, 0)) || null
  const maxPerUser = Math.trunc(num(body.max_per_user, 0, 1000, 1))
  const expires = body.expires_at ? new Date(body.expires_at) : null
  if (expires && Number.isNaN(expires.getTime())) fail(400, 'Data de validade inválida.')
  await query(
    `insert into coupons (code, description, percent_off, amount_off_cents, plan_id, period, max_redemptions, max_per_user, expires_at, active)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     on conflict (code) do update set description=$2, percent_off=$3, amount_off_cents=$4, plan_id=$5, period=$6,
       max_redemptions=$7, max_per_user=$8, expires_at=$9, active=$10`,
    [code, str(body.description, 160), percent, amount, planId, period, maxRedemptions, maxPerUser, expires, body.active !== false])
  await query(`insert into operations_log (user_id, type, detail) values ($1, 'admin_coupon', $2)`, [admin.id, JSON.stringify({ code })])
  return { coupons: await couponUsage({ query }) }
})

on('POST', 'admin/coupons/toggle', async ({ req, body }) => {
  await requireAdmin(req)
  await query('update coupons set active = not active where code = $1', [normalizeCode(body.code)])
  return { coupons: await couponUsage({ query }) }
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
const MAINTENANCE_OPEN = new Set(['health', 'site/status', 'meta', 'auth/me', 'auth/login', 'auth/logout', 'auth/forgot', 'auth/reset', 'auth/google', 'auth/google/callback'])
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
      if (req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'Origem não permitida.')
    }
    // manutenção: só administradores usam a API (login, status e saúde continuam liberados)
    if (!MAINTENANCE_OPEN.has(path) && !path.startsWith('admin/')) {
      const settings = await getSettings().catch(() => null)
      if (settings?.maintenance.enabled && !(await currentUser(req))?.is_admin) {
        fail(503, settings.maintenance.message || 'A Argus está em manutenção. Voltamos em instantes.', 'MAINTENANCE')
      }
    }
    const body = ['POST', 'PUT'].includes(req.method) ? await readJson(req) : {}
    const out = await route({ req, res, url, body })
    if (out && out.redirect) {
      res.statusCode = 302
      res.setHeader('Location', out.redirect)
      res.setHeader('Cache-Control', 'no-store')
      for (const [k, v] of Object.entries(out.headers || {})) res.setHeader(k, v)
      return res.end()
    }
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
    if (status >= 500 && !(err instanceof HttpError)) console.error(err)
    const known = err instanceof HttpError || err.code === 'DB_NOT_CONFIGURED'
    send(res, status, { error: known ? err.message : 'Erro interno. Tente novamente.', code: err.code })
  }
}
