// Provedor OpenStreetMap: Nominatim (geocodificação) + Overpass (estabelecimentos).
// Dados reais e gratuitos. Respeita as políticas de uso: identificação no
// User-Agent, cache de geocodificação e consultas em lote.

const UA = 'ArgusProspeccao/1.0 (plataforma de prospeccao geolocalizada)'
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']

async function fetchJson(url, options = {}, timeoutMs = 20000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...options,
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'application/json', ...(options.headers || {}) },
    })
    if (!res.ok) {
      const err = new Error(`Provedor respondeu ${res.status}`)
      err.status = res.status
      throw err
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export const name = 'osm'

export async function geocode(q, country) {
  const params = new URLSearchParams({ q, format: 'jsonv2', addressdetails: '1', limit: '6', 'accept-language': 'pt-BR' })
  if (country) params.set('countrycodes', country.toLowerCase())
  const rows = await fetchJson(`${NOMINATIM}/search?${params}`)
  return rows.map(r => ({
    display_name: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
    kind: r.addresstype || r.type,
    bbox: r.boundingbox ? r.boundingbox.map(Number) : null,
  }))
}

const esc = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')

function selector([key, regex], keyword) {
  let sel = regex ? `["${key}"~"^(${regex})$"]` : `["${key}"]`
  sel += keyword ? `["name"~"${esc(keyword)}",i]` : `["name"]`
  return sel
}

// areas: [{lat,lng,radius_m}], segments: resolveSegments(), allBusiness: filtros padrão
export async function searchPlaces({ areas, segments, allBusiness, limit = 2500 }) {
  const parts = []
  for (const a of areas) {
    const around = `(around:${Math.round(a.radius_m)},${a.lat.toFixed(6)},${a.lng.toFixed(6)})`
    const groups = segments.length ? segments : [{ filters: allBusiness }]
    for (const seg of groups) {
      const filters = seg.filters || allBusiness
      for (const f of filters) parts.push(`nwr${selector(f, seg.keyword)}${around};`)
    }
  }
  const ql = `[out:json][timeout:45];(${parts.join('')});out center tags ${limit};`
  let lastErr
  for (const endpoint of OVERPASS) {
    try {
      const data = await fetchJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(ql)}`,
      }, 50000)
      return (data.elements || []).map(normalizePlace).filter(Boolean)
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
}

const first = (...v) => v.find(x => x && String(x).trim()) || null

function normalizePlace(el) {
  const t = el.tags || {}
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  if (!t.name || lat == null || lng == null) return null
  const street = first(t['addr:street'])
  const address = street
    ? [street, t['addr:housenumber'], t['addr:suburb'] || t['addr:neighbourhood'], t['addr:city'], t['addr:postcode']].filter(Boolean).join(', ')
    : first(t['addr:full'])
  const social = {}
  for (const [k, label] of [['contact:instagram', 'instagram'], ['contact:facebook', 'facebook'], ['contact:whatsapp', 'whatsapp'], ['contact:linkedin', 'linkedin'], ['instagram', 'instagram'], ['facebook', 'facebook']]) {
    if (t[k] && !social[label]) social[label] = t[k]
  }
  const category = first(t.shop && `shop:${t.shop}`, t.amenity && `amenity:${t.amenity}`, t.office && `office:${t.office}`, t.craft && `craft:${t.craft}`, t.healthcare && `healthcare:${t.healthcare}`, t.leisure && `leisure:${t.leisure}`, t.tourism && `tourism:${t.tourism}`)
  return {
    source: 'osm',
    source_id: `${el.type}/${el.id}`,
    name: t.name,
    category,
    tags: t,
    phone: first(t.phone, t['contact:phone'], t['contact:mobile'], t.mobile),
    website: first(t.website, t['contact:website'], t.url),
    email: first(t.email, t['contact:email']),
    address,
    city: first(t['addr:city']),
    opening_hours: first(t.opening_hours),
    social,
    lat: Number(lat),
    lng: Number(lng),
  }
}
