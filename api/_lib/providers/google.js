// Provedor Google Places (API New): busca de estabelecimentos e geocodificação.
// Requer GOOGLE_PLACES_API_KEY (Places API (New) ativada no Google Cloud).
// Custo controlado por GOOGLE_MAX_REQUESTS (padrão 24 chamadas por mapeamento).

const BASE = 'https://places.googleapis.com/v1'
const FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location', 'places.types', 'places.primaryType',
  'places.nationalPhoneNumber', 'places.internationalPhoneNumber', 'places.websiteUri', 'places.regularOpeningHours',
  'places.businessStatus', 'places.rating', 'places.userRatingCount', 'places.googleMapsUri', 'places.addressComponents',
]

export const name = 'google'
export const available = () => Boolean(process.env.GOOGLE_PLACES_API_KEY)

async function call(path, body, fieldMask) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(`${BASE}/${path}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(`Google Places: ${data?.error?.message || res.status}`)
      err.status = res.status
      throw err
    }
    return data
  } finally {
    clearTimeout(timer)
  }
}

// retângulo que contém o círculo da área (o banco depois corta exatamente no raio)
function bbox(a) {
  const dLat = a.radius_m / 111320
  const dLng = a.radius_m / (111320 * Math.cos((a.lat * Math.PI) / 180))
  return { low: { latitude: a.lat - dLat, longitude: a.lng - dLng }, high: { latitude: a.lat + dLat, longitude: a.lng + dLng } }
}

// sub-círculos para cobrir áreas grandes na busca sem segmento (Nearby retorna no máx. 20 por chamada)
function cover(a) {
  if (a.radius_m <= 900) return [{ ...a }]
  const r = a.radius_m / 2
  const ring = Array.from({ length: 6 }, (_, i) => {
    const ang = (i * Math.PI) / 3
    const dLat = (Math.sin(ang) * r * 1.2) / 111320
    const dLng = (Math.cos(ang) * r * 1.2) / (111320 * Math.cos((a.lat * Math.PI) / 180))
    return { lat: a.lat + dLat, lng: a.lng + dLng, radius_m: r }
  })
  return [{ lat: a.lat, lng: a.lng, radius_m: r }, ...ring]
}

export async function searchPlaces({ areas, segments, country, limit = 2500 }) {
  let budget = Math.max(1, Number(process.env.GOOGLE_MAX_REQUESTS) || 24)
  const out = []
  const lang = { languageCode: 'pt-BR', ...(country ? { regionCode: country } : {}) }
  const fieldMask = FIELDS.join(',')

  for (const area of areas) {
    if (segments.length) {
      for (const seg of segments) {
        let pageToken
        for (let page = 0; page < 3 && budget > 0; page++) {
          budget--
          const data = await call('places:searchText', {
            textQuery: seg.label || seg.term,
            locationRestriction: { rectangle: bbox(area) },
            pageSize: 20,
            ...(pageToken ? { pageToken } : {}),
            ...lang,
          }, `${fieldMask},nextPageToken`)
          out.push(...(data.places || []))
          pageToken = data.nextPageToken
          if (!pageToken) break
        }
      }
    } else {
      for (const c of cover(area)) {
        if (budget <= 0) break
        budget--
        const data = await call('places:searchNearby', {
          maxResultCount: 20,
          locationRestriction: { circle: { center: { latitude: c.lat, longitude: c.lng }, radius: Math.min(50000, c.radius_m) } },
          rankPreference: 'POPULARITY',
          ...lang,
        }, fieldMask)
        out.push(...(data.places || []))
      }
    }
    if (out.length >= limit) break
  }
  return out.map(normalize).filter(Boolean)
}

function normalize(p) {
  if (!p?.id || !p.location || p.businessStatus === 'CLOSED_PERMANENTLY') return null
  const comp = type => p.addressComponents?.find(c => c.types?.includes(type))?.longText || null
  return {
    source: 'google',
    source_id: p.id,
    name: p.displayName?.text || 'Sem nome',
    category: p.primaryType ? `google:${p.primaryType}` : p.types?.[0] ? `google:${p.types[0]}` : null,
    tags: {
      types: p.types || [],
      rating: p.rating ?? null,
      user_ratings: p.userRatingCount ?? null,
      maps_url: p.googleMapsUri || null,
      business_status: p.businessStatus || null,
    },
    phone: p.nationalPhoneNumber || p.internationalPhoneNumber || null,
    website: p.websiteUri || null,
    email: null,
    address: p.formattedAddress || null,
    city: comp('administrative_area_level_2') || comp('locality'),
    opening_hours: p.regularOpeningHours?.weekdayDescriptions?.join('; ') || null,
    social: {},
    lat: p.location.latitude,
    lng: p.location.longitude,
  }
}

// Geocodificação via Text Search (uma chamada)
export async function geocode(q, country) {
  const data = await call('places:searchText', { textQuery: q, pageSize: 6, languageCode: 'pt-BR', ...(country ? { regionCode: country } : {}) },
    'places.displayName,places.formattedAddress,places.location,places.viewport,places.primaryType')
  return (data.places || []).map(p => ({
    display_name: p.formattedAddress || p.displayName?.text,
    lat: p.location.latitude,
    lng: p.location.longitude,
    kind: p.primaryType || null,
    bbox: p.viewport ? [p.viewport.low.latitude, p.viewport.high.latitude, p.viewport.low.longitude, p.viewport.high.longitude] : null,
  }))
}
