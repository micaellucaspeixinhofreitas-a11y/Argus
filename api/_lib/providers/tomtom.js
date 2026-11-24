// Provedor TomTom (Search API v2): busca de estabelecimentos (POI) e geocodificação.
// Requer TOMTOM_API_KEY. Limite de chamadas por mapeamento: TOMTOM_MAX_REQUESTS (padrão 30).

const BASE = 'https://api.tomtom.com/search/2'

export const name = 'tomtom'
export const available = () => Boolean(process.env.TOMTOM_API_KEY)

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function get(path, params, attempt = 0) {
  const qs = new URLSearchParams({ key: process.env.TOMTOM_API_KEY, language: 'pt-BR', ...params })
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(`${BASE}/${path}?${qs}`, { signal: ctrl.signal })
    if (res.status === 429 && attempt < 3) {
      clearTimeout(timer)
      await sleep(400 * (attempt + 1))
      return get(path, params, attempt + 1)
    }
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

// Categorias amplas usadas quando não há segmento ("todo tipo de comércio")
const BROAD = ['restaurante', 'loja', 'clínica', 'escritório', 'salão de beleza', 'academia', 'oficina', 'hotel', 'farmácia', 'imobiliária']

// A busca por CATEGORIA (categorySearch) traz todos os estabelecimentos do tipo dentro do raio;
// a busca por texto (poiSearch) só casa com o nome — usada apenas para palavras-chave livres.
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
    const jobs = segments.length
      ? segments.flatMap(seg => {
          const term = encodeURIComponent(seg.label || seg.term)
          const list = [{ path: `categorySearch/${term}.json`, pages: 3 }]
          if (!seg.key) list.push({ path: `poiSearch/${term}.json`, pages: 1 })
          return list
        })
      : BROAD.map(t => ({ path: `categorySearch/${encodeURIComponent(t)}.json`, pages: 1 }))
    for (const job of jobs) {
      for (let page = 0; page < job.pages && budget > 0; page++) {
        budget--
        let data
        try {
          data = await get(job.path, { ...base, ofs: String(page * 100) })
        } catch (err) {
          if (out.length) break // uma categoria falhou: segue com as demais
          throw err
        }
        const results = data.results || []
        out.push(...results)
        if (results.length < 100) break
      }
    }
    if (out.length >= limit) break
  }
  // remove repetidos (o mesmo POI pode vir em mais de uma categoria/consulta)
  const seen = new Set()
  return out.filter(r => (seen.has(r.id) ? false : seen.add(r.id))).map(normalize).filter(Boolean)
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

// Empresa do tipo mais próxima de um ponto (usada para orientar quando a área vem vazia)
export async function nearest({ lat, lng, term, country }) {
  const data = await get(`categorySearch/${encodeURIComponent(term)}.json`, {
    lat: lat.toFixed(6), lon: lng.toFixed(6), radius: '50000', limit: '1', ...(country ? { countrySet: country } : {}),
  })
  const r = data.results?.[0]
  return r ? { name: r.poi?.name, distance_m: Math.round(r.dist), city: r.address?.municipality || null, lat: r.position.lat, lng: r.position.lon } : null
}
