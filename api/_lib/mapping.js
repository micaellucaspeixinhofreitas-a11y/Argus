import { query, tx } from './db.js'
import { fail, num, str } from './http.js'
import { provider } from './providers/index.js'
import * as tomtom from './providers/tomtom.js'
import { resolveSegments, ALL_BUSINESS } from './segments.js'
import { creditStatus, tierFor, searchCost } from './credits.js'
import { parseQualification, qualify } from './qualify.js'

export const LIMITS = { maxAreas: 10, minRadiusKm: 0.2, maxRadiusKm: 15, maxSegments: 8 }

// Valida e normaliza a configuração de prospecção vinda do cliente
export function parseConfig(input = {}) {
  const segments = (Array.isArray(input.segments) ? input.segments : [])
    .map(s => str(s, 60)).filter(Boolean).slice(0, LIMITS.maxSegments)
  const country = str(input.country, 2).toUpperCase()
  if (!/^[A-Z]{2}$/.test(country)) fail(400, 'Selecione um país.')
  const locality = str(input.locality, 160)
  const radiusKm = num(input.radiusKm, LIMITS.minRadiusKm, LIMITS.maxRadiusKm, 2)
  const areas = (Array.isArray(input.areas) ? input.areas : []).slice(0, LIMITS.maxAreas).map((a, i) => {
    const lat = Number(a.lat)
    const lng = Number(a.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      fail(400, `Área ${i + 1} com coordenadas inválidas.`)
    }
    return {
      lat, lng,
      radiusKm: num(a.radiusKm, LIMITS.minRadiusKm, LIMITS.maxRadiusKm, radiusKm),
      label: str(a.label || `Área ${i + 1}`, 120),
    }
  })
  // quantidade sempre numa faixa da tabela de créditos (20, 50, 100, 250, 500, 1000)
  const maxResults = tierFor(Math.round(num(input.maxResults, 1, 1000, 100))).max
  return { segments, country, locality, radiusKm, areas, maxResults, qualification: parseQualification(input.qualification) }
}

// Geocodifica com cache no banco (política de uso do Nominatim)
export async function geocode(q, country) {
  const term = str(q, 160)
  if (term.length < 2) return []
  const cached = await query(
    `select display_name, st_y(geom::geometry) as lat, st_x(geom::geometry) as lng, kind, bbox
       from locations where lower(query) = lower($1) and country = $2
        and created_at > now() - interval '30 days' order by id limit 6`,
    [term, country || '']
  )
  if (cached.rows.length) return cached.rows
  const results = await provider().geocode(term, country)
  for (const r of results) {
    await query(
      `insert into locations (query, country, display_name, geom, bbox, kind)
       values ($1, $2, $3, st_setsrid(st_makepoint($5, $4), 4326)::geography, $6, $7)`,
      [term, country || '', r.display_name, r.lat, r.lng, JSON.stringify(r.bbox), r.kind]
    )
  }
  return results
}

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371000
  const toRad = x => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

// Remove duplicatas (mesmo lugar vindo duas vezes da mesma fonte ou de fontes diferentes).
// O primeiro registro prevalece; campos ausentes são completados pelo duplicado
// (ex.: Google traz telefone/site, OpenStreetMap completa e-mail e redes sociais).
const FILL = ['phone', 'website', 'email', 'address', 'city', 'opening_hours']
function dedupe(places) {
  const out = []
  const seen = new Map()
  for (const p of places) {
    const key = norm(p.name)
    const twin = (seen.get(key) || []).find(q => Math.abs(q.lat - p.lat) < 0.0006 && Math.abs(q.lng - p.lng) < 0.0006)
    if (twin) {
      for (const f of FILL) if (!twin[f] && p[f]) twin[f] = p[f]
      if (!Object.keys(twin.social || {}).length && Object.keys(p.social || {}).length) twin.social = p.social
      continue
    }
    seen.set(key, [...(seen.get(key) || []), p])
    out.push(p)
  }
  return out
}

export async function runMapping(user, input) {
  const startedAt = Date.now()
  const config = parseConfig(input)

  // Sem áreas no mapa: usa a localidade informada como área central
  if (!config.areas.length) {
    if (!config.locality) fail(400, 'Selecione ao menos uma área no mapa ou informe uma localidade.')
    const [place] = await geocode(config.locality, config.country)
    if (!place) fail(404, 'Localidade não encontrada no país selecionado.')
    config.areas.push({ lat: Number(place.lat), lng: Number(place.lng), radiusKm: config.radiusKm, label: place.display_name.split(',').slice(0, 2).join(',') })
  }

  // Verificações e reserva de créditos numa transação com o usuário travado:
  // duas buscas simultâneas não passam juntas nem deixam o saldo negativo.
  const prov = provider()
  const price = searchCost(config.maxResults)
  const { run, reservation } = await tx(async db => {
    await db.query('select id from users where id = $1 for update', [user.id])
    // evita rajadas: 1 mapeamento a cada 8 segundos por usuário
    const recent = await db.query(
      `select 1 from mapping_runs where user_id = $1 and created_at > now() - interval '8 seconds' limit 1`, [user.id])
    if (recent.rows.length) fail(429, 'Aguarde alguns segundos antes de iniciar outro mapeamento.')
    const status = await creditStatus(user.id, db)
    if (status.today_used >= status.daily_limit) fail(429, `Você atingiu o limite de ${status.daily_limit} busca(s) por dia do seu plano. O limite renova à meia-noite.`, 'DAILY_LIMIT')
    if (status.available < price) fail(402, `Esta busca (${config.maxResults} empresas) custa ${price} créditos e você tem ${status.available}. Escolha uma quantidade menor ou assine um plano.`, 'NO_CREDITS')
    const { rows: [r] } = await db.query(
      `insert into mapping_runs (user_id, config, provider) values ($1, $2, $3) returning id, created_at`,
      [user.id, JSON.stringify(config), prov.name])
    // reserva o valor cheio; no fim, ajusta para a faixa do que veio (ou devolve tudo)
    const { rows: [res] } = await db.query(
      `insert into credit_ledger (user_id, amount, reason, note) values ($1, $2, 'search', $3) returning id`,
      [user.id, -price, `busca #${r.id} · reservado`])
    return { run: r, reservation: res.id }
  })
  const release = () => query('delete from credit_ledger where id = $1', [reservation]).catch(() => {})
  let settled = false
  try {
    for (const a of config.areas) {
      await query(
        `insert into mapping_areas (run_id, label, center, radius_m)
         values ($1, $2, st_setsrid(st_makepoint($4, $3), 4326)::geography, $5)`,
        [run.id, a.label, a.lat, a.lng, Math.round(a.radiusKm * 1000)]
      )
    }
    for (const term of config.segments) {
      await query(
        `insert into segments (user_id, term) values ($1, lower($2))
         on conflict (user_id, term) do update set uses = segments.uses + 1, last_used = now()`,
        [user.id, term]
      )
    }

    let places
    try {
      places = await prov.searchPlaces({
        areas: config.areas.map(a => ({ lat: a.lat, lng: a.lng, radius_m: a.radiusKm * 1000 })),
        segments: resolveSegments(config.segments),
        allBusiness: ALL_BUSINESS,
        country: config.country,
        want: config.maxResults,
      })
    } catch (err) {
      await release()
      settled = true
      await query(`update mapping_runs set status = 'failed', error = $2, finished_at = now() where id = $1`, [run.id, String(err.message).slice(0, 300)])
      console.log(JSON.stringify({ evt: 'mapping_failed', run: run.id, user: user.id, provider: prov.name, error: String(err.message).slice(0, 300) }))
      if (/tomtom|google/i.test(err.message) && /40[13]|invalid|key|chave|forbidden|unauthori/i.test(err.message)) {
        fail(502, 'A chave da fonte de empresas foi recusada. Confira a chave da TomTom/Google nas configurações.', 'SOURCE_KEY')
      }
      fail(502, 'A fonte de dados de estabelecimentos não respondeu. Tente novamente em instantes ou reduza o raio.')
    }
    const raw = places.length
    const sourceErrors = places.sourceErrors || {}
    const bySource = places.reduce((acc, p) => ({ ...acc, [p.source]: (acc[p.source] || 0) + 1 }), {})
    places = dedupe(places)
    // só o que está dentro de alguma área, do mais próximo ao mais distante, até a quantidade pedida
    for (const p of places) {
      p._dist = Math.min(...config.areas.map(a => {
        const d = haversine(p.lat, p.lng, a.lat, a.lng)
        return d <= a.radiusKm * 1000 ? d : Infinity
      }))
    }
    places = places.filter(p => p._dist !== Infinity).sort((a, b) => a._dist - b._dist)
    const available = places.length
    // a quantidade pedida vale para empresas NOVAS: as que já são leads do usuário não ocupam vaga
    const keys = places.map(p => `${p.source}:${p.source_id}`)
    const { rows: mine } = keys.length ? await query(
      `select c.source || ':' || c.source_id as k from leads l join companies c on c.id = l.company_id
        where l.user_id = $1 and c.source || ':' || c.source_id = any($2::text[])`, [user.id, keys]) : { rows: [] }
    const owned = new Set(mine.map(r => r.k))
    const fresh = places.filter(p => !owned.has(`${p.source}:${p.source_id}`)).slice(0, config.maxResults)
    const already = places.filter(p => owned.has(`${p.source}:${p.source_id}`)).slice(0, 1000)
    places = [...fresh, ...already]
    places.forEach(p => delete p._dist)

    // Grava empresas (sem duplicidade) e associa ao mapeamento respeitando os limites das áreas
    const idBySource = new Map()
    for (let i = 0; i < places.length; i += 400) {
      const chunk = places.slice(i, i + 400)
      const { rows } = await query(
        `insert into companies (source, source_id, name, category, tags, phone, website, email, address, city, opening_hours, social, geom)
         select r.source, r.source_id, r.name, r.category, r.tags, r.phone, r.website, r.email, r.address, r.city, r.opening_hours, r.social,
                st_setsrid(st_makepoint(r.lng, r.lat), 4326)::geography
           from jsonb_to_recordset($1::jsonb) as r(source text, source_id text, name text, category text, tags jsonb, phone text,
                website text, email text, address text, city text, opening_hours text, social jsonb, lat float8, lng float8)
         on conflict (source, source_id) do update set
           name = excluded.name, category = excluded.category, tags = excluded.tags, phone = excluded.phone,
           website = excluded.website, email = excluded.email, address = excluded.address, city = excluded.city,
           opening_hours = excluded.opening_hours, social = excluded.social, geom = excluded.geom, updated_at = now()
         returning id, source, source_id`,
        [JSON.stringify(chunk)]
      )
      for (const r of rows) idBySource.set(`${r.source}:${r.source_id}`, r.id)
    }

    const ids = []
    const scores = []
    const fits = []
    for (const p of places) {
      const id = idBySource.get(`${p.source}:${p.source_id}`)
      if (!id) continue
      const q = qualify(p, config.qualification)
      ids.push(id)
      scores.push(q.score)
      fits.push(q.highFit)
    }

    await query(
      `insert into mapping_results (run_id, company_id, score, high_fit, distance_m)
       select $1, i.company_id, i.score, i.high_fit, min(st_distance(c.geom, a.center))::int
         from unnest($2::bigint[], $3::int[], $4::bool[]) as i(company_id, score, high_fit)
         join companies c on c.id = i.company_id
         join mapping_areas a on a.run_id = $1 and st_dwithin(c.geom, a.center, a.radius_m)
        group by i.company_id, i.score, i.high_fit
       on conflict do nothing`,
      [run.id, ids, scores, fits]
    )

    const { rows: [stats] } = await query(
      `select count(*)::int as total,
              count(*) filter (where r.high_fit)::int as high_fit,
              count(*) filter (where c.website is null)::int as no_website
         from mapping_results r join companies c on c.id = r.company_id where r.run_id = $1`,
      [run.id]
    )
    await query(
      `update mapping_runs set status = 'done', total = $2, high_fit = $3, no_website = $4, finished_at = now() where id = $1`,
      [run.id, stats.total, stats.high_fit, stats.no_website]
    )
    // cobra a faixa do que realmente veio de empresas novas (nada, se não veio nenhuma)
    const charged = searchCost(Math.min(fresh.length, config.maxResults))
    if (charged) {
      await query(`update credit_ledger set amount = $2, note = $3 where id = $1`, [reservation, -charged, `busca #${run.id} · ${fresh.length} empresa(s)`])
    } else await release()
    settled = true
    await query(`insert into operations_log (user_id, type, detail) values ($1, 'mapping', $2)`, [user.id, JSON.stringify({ run_id: run.id, ...stats, charged })])
    if (input.savedSearchId) {
      await query(`update saved_searches set last_run_at = now() where id = $1 and user_id = $2`, [Number(input.savedSearchId), user.id])
    }
    if (Object.keys(sourceErrors).length) {
      await query(`update mapping_runs set error = $2 where id = $1`, [run.id, JSON.stringify(sourceErrors).slice(0, 300)])
    }
    console.log(JSON.stringify({ evt: 'mapping', sourceErrors, run: run.id, user: user.id, provider: prov.name, segments: config.segments, areas: config.areas.map(a => `${a.lat.toFixed(4)},${a.lng.toFixed(4)} r${a.radiusKm}km`), max: config.maxResults, raw, bySource, kept: places.length, fresh: fresh.length, already: already.length, total: stats.total, ms: Date.now() - startedAt }))
    // área vazia: procura a empresa do tipo mais próxima para orientar o usuário
    let hint = null
    if (!stats.total && tomtom.available()) {
      try {
        const a = config.areas[0]
        const seg = resolveSegments(config.segments)[0]
        const near = await tomtom.nearest({ lat: a.lat, lng: a.lng, term: seg ? seg.tt || seg.label || seg.term : 'loja', country: config.country })
        if (near) hint = { ...near, segment: seg ? seg.label || seg.term : 'comércio', radius_km: a.radiusKm }
      } catch { /* sem dica */ }
    }
    return { run_id: run.id, config, stats, sourceErrors, hint, charged, coverage: { requested: config.maxResults, fresh: fresh.length, alreadyLeads: already.length, available } }
  } catch (err) {
    // qualquer falha inesperada devolve a reserva
    if (!settled) await release()
    await query(`update mapping_runs set status = 'failed', finished_at = coalesce(finished_at, now()) where id = $1 and status <> 'done'`, [run.id]).catch(() => {})
    throw err
  }
}

// Resultados de um mapeamento do usuário (a busca foi paga: os contatos vêm junto).
export async function runResults(user, runId) {
  const { rows: [run] } = await query(
    `select id, config, status, total, high_fit, no_website, created_at, finished_at
       from mapping_runs where id = $1 and user_id = $2`,
    [runId, user.id]
  )
  if (!run) fail(404, 'Mapeamento não encontrado.')
  const { rows } = await query(
    `select c.id, c.name, c.category, c.city, c.source,
            (c.tags->>'rating')::float as rating, (c.tags->>'user_ratings')::int as user_ratings,
            st_y(c.geom::geometry) as lat, st_x(c.geom::geometry) as lng,
            r.score, r.high_fit, r.distance_m,
            (c.phone is not null) as has_phone, (c.website is not null) as has_website,
            (c.email is not null) as has_email, (c.address is not null) as has_address,
            (c.opening_hours is not null) as has_hours, (c.social <> '{}'::jsonb) as has_social,
            (l.id is not null) as captured,
            c.phone, c.website, c.email, c.address
       from mapping_results r
       join companies c on c.id = r.company_id
       left join leads l on l.company_id = c.id and l.user_id = $2
      where r.run_id = $1
      order by r.high_fit desc, (c.website is null) desc, r.score desc nulls last, r.distance_m asc
      limit 3000`,
    [runId, user.id]
  )
  const areas = await query(
    `select label, st_y(center::geometry) as lat, st_x(center::geometry) as lng, radius_m from mapping_areas where run_id = $1 order by id`,
    [runId]
  )
  return { run, areas: areas.rows, results: rows }
}

// Captura leads (não consome créditos: a busca já foi cobrada).
export async function captureLeads(user, { runId, companyIds }) {
  const ids = [...new Set((companyIds || []).map(Number).filter(Number.isInteger))].slice(0, 1000)
  if (!ids.length) fail(400, 'Selecione ao menos uma empresa.')
  return tx(async db => {
    // trava o usuário para evitar capturas simultâneas duplicadas
    await db.query('select id from users where id = $1 for update', [user.id])
    // só empresas que pertencem a um mapeamento deste usuário
    const { rows: valid } = await db.query(
      `select distinct on (r.company_id) r.company_id, r.run_id, r.score, r.high_fit
         from mapping_results r join mapping_runs m on m.id = r.run_id and m.user_id = $1
        where r.company_id = any($2::bigint[]) ${runId ? 'and r.run_id = $3' : ''}
        order by r.company_id, r.run_id desc`,
      runId ? [user.id, ids, Number(runId)] : [user.id, ids]
    )
    const { rows: existing } = await db.query(
      'select company_id from leads where user_id = $1 and company_id = any($2::bigint[])',
      [user.id, valid.map(v => v.company_id)]
    )
    const already = new Set(existing.map(e => String(e.company_id)))
    const fresh = valid.filter(v => !already.has(String(v.company_id)))
    const allowed = fresh
    for (const v of allowed) {
      await db.query(
        `insert into leads (user_id, company_id, run_id, score, high_fit) values ($1, $2, $3, $4, $5)
         on conflict (user_id, company_id) do nothing`,
        [user.id, v.company_id, v.run_id, v.score, v.high_fit]
      )
    }
    await db.query(`insert into operations_log (user_id, type, detail) values ($1, 'capture', $2)`, [
      user.id, JSON.stringify({ requested: ids.length, captured: allowed.length, already: already.size }),
    ])
    return {
      captured: allowed.length,
      already_captured: already.size,
      blocked_by_limit: 0,
      credits_spent: 0,
    }
  })
}
