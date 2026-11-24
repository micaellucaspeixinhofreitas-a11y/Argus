// Provedor TomTom (Search API v2): busca de estabelecimentos (POI) e geocodificação.
// Requer TOMTOM_API_KEY. Limite de chamadas por mapeamento: TOMTOM_MAX_REQUESTS (padrão 30).

const BASE = 'https://api.tomtom.com/search/2'

export const name = 'tomtom'
export const available = () => Boolean(process.env.TOMTOM_API_KEY)

async function get(path, params) {
  const qs = new URLSearchParams({ key: process.env.TOMTOM_API_KEY, language: 'pt-BR', ...params })
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(`${BASE}/${path}?${qs}`, { signal: ctrl.signal })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(`TomTom: ${data?.errorText || data?.detailedError?.message || res.status}`)
      err.status = res.status
      throw err
    }
    return data
  } finally {
    clearTimeout(timer)
  }
}

export async function searchPlaces({ areas, segments, country, limit = 2500 }) {
  let budget = Math.max(1, Number(process.env.TOMTOM_MAX_REQUESTS) || 30)
  const out = []
  for (const area of areas) {
    const base = {
      lat: area.lat.toFixed(6),
      lon: area.lng.toFixed(6),
      radius: String(Math.round(Math.min(area.radius_m, 50000))),
      limit: '100',
      ...(country ? { countrySet: country } : {}),
    }
    const queries = segments.length
      ? segments.map(seg => ({ path: `poiSearch/${encodeURIComponent(seg.label || seg.term)}.json` }))
      : [{ path: 'nearbySearch/.json' }]
    for (const q of queries) {
      // até 3 páginas de 100 resultados por consulta
      for (let page = 0; page < 3 && budget > 0; page++) {
        budget--
        const data = await get(q.path, { ...base, ofs: String(page * 100) })
        const results = data.results || []
        out.push(...results)
        if (results.length < 100) break
      }
    }
    if (out.length >= limit) break
  }
  return out.map(normalize).filter(Boolean)
}

const withProtocol = url => (!url ? null : /^https?:\/\//i.test(url) ? url : `https://${url}`)

function normalize(r) {
  const poi = r.poi
  if (!poi?.name || !r.position) return null
  const cat = poi.categories?.[0] || poi.classifications?.[0]?.code?.toLowerCase()
  return {
    source: 'tomtom',
    source_id: String(r.id),
    name: poi.name,
    category: cat ? `tomtom:${cat}` : null,
    tags: {
      categories: poi.categories || [],
      category_ids: (poi.categorySet || []).map(c => c.id),
      brands: (poi.brands || []).map(b => b.name),
    },
    phone: poi.phone || null,
    website: withProtocol(poi.url),
    email: null,
    address: r.address?.freeformAddress || null,
    city: r.address?.municipality || null,
    opening_hours: null,
    social: {},
    lat: r.position.lat,
    lng: r.position.lon,
  }
}

export async function geocode(q, country) {
  const data = await get(`geocode/${encodeURIComponent(q)}.json`, { limit: '6', ...(country ? { countrySet: country } : {}) })
  return (data.results || []).map(r => ({
    display_name: r.address?.freeformAddress || q,
    lat: r.position.lat,
    lng: r.position.lon,
    kind: r.entityType || r.type || null,
    bbox: r.viewport
      ? [r.viewport.btmRightPoint.lat, r.viewport.topLeftPoint.lat, r.viewport.topLeftPoint.lon, r.viewport.btmRightPoint.lon]
      : null,
  }))
}
