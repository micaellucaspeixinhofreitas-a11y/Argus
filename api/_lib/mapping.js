import { query, tx } from './db.js'
import { fail, num, str } from './http.js'
import { provider } from './providers/index.js'
import { resolveSegments, ALL_BUSINESS } from './segments.js'
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
  return { segments, country, locality, radiusKm, areas, qualification: parseQualification(input.qualification) }
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
  const config = parseConfig(input)

  // Sem áreas no mapa: usa a localidade informada como área central
  if (!config.areas.length) {
    if (!config.locality) fail(400, 'Selecione ao menos uma área no mapa ou informe uma localidade.')
    const [place] = await geocode(config.locality, config.country)
    if (!place) fail(404, 'Localidade não encontrada no país selecionado.')
    config.areas.push({ lat: Number(place.lat), lng: Number(place.lng), radiusKm: config.radiusKm, label: place.display_name.split(',').slice(0, 2).join(',') })
  }

  // Evita rajadas: 1 mapeamento a cada 8 segundos por usuário
  const recent = await query(
    `select 1 from mapping_runs where user_id = $1 and created_at > now() - interval '8 seconds' limit 1`,
    [user.id]
  )
  if (recent.rows.length) fail(429, 'Aguarde alguns segundos antes de iniciar outro mapeamento.')

  const prov = provider()
  const { rows: [run] } = await query(
    `insert into mapping_runs (user_id, config, provider) values ($1, $2, $3) returning id, created_at`,
    [user.id, JSON.stringify(config), prov.name]
  )
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
    })
  } catch (err) {
    await query(`update mapping_runs set status = 'failed', error = $2, finished_at = now() where id = $1`, [run.id, String(err.message).slice(0, 300)])
    fail(502, 'A fonte de dados de estabelecimentos não respondeu. Tente novamente em instantes ou reduza o raio.')
  }
  places = dedupe(places)

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
       returning id, source_id`,
      [JSON.stringify(chunk)]
    )
    for (const r of rows) idBySource.set(r.source_id, r.id)
  }

  const ids = []
  const scores = []
  const fits = []
  for (const p of places) {
    const id = idBySource.get(p.source_id)
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
  await query(`insert into operations_log (user_id, type, detail) values ($1, 'mapping', $2)`, [user.id, JSON.stringify({ run_id: run.id, ...stats })])
  if (input.savedSearchId) {
    await query(`update saved_searches set last_run_at = now() where id = $1 and user_id = $2`, [Number(input.savedSearchId), user.id])
  }
  return { run_id: run.id, config, stats }
}

// Resultados de um mapeamento do usuário. Contatos só aparecem para leads capturados.
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
            case when l.id is not null then c.phone end as phone,
            case when l.id is not null then c.website end as website,
            case when l.id is not null then c.email end as email,
            case when l.id is not null then c.address end as address
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

// Captura leads: 1 crédito por lead NOVO, respeitando limites diário e mensal.
export async function captureLeads(user, { runId, companyIds }, creditStatus) {
  const ids = [...new Set((companyIds || []).map(Number).filter(Number.isInteger))].slice(0, 1000)
  if (!ids.length) fail(400, 'Selecione ao menos uma empresa.')
  return tx(async db => {
    // trava o usuário para contabilizar créditos sem condição de corrida
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
    const status = await creditStatus(user.id, db)
    const allowed = fresh.slice(0, status.can_spend)
    for (const v of allowed) {
      const { rows: [lead] } = await db.query(
        `insert into leads (user_id, company_id, run_id, score, high_fit) values ($1, $2, $3, $4, $5)
         on conflict (user_id, company_id) do nothing returning id`,
        [user.id, v.company_id, v.run_id, v.score, v.high_fit]
      )
      if (lead) {
        await db.query(`insert into credit_ledger (user_id, amount, reason, lead_id) values ($1, -1, 'lead', $2)`, [user.id, lead.id])
      }
    }
    await db.query(`insert into operations_log (user_id, type, detail) values ($1, 'capture', $2)`, [
      user.id, JSON.stringify({ requested: ids.length, captured: allowed.length, already: already.size }),
    ])
    return {
      captured: allowed.length,
      already_captured: already.size,
      blocked_by_limit: fresh.length - allowed.length,
      credits_spent: allowed.length,
    }
  })
}
