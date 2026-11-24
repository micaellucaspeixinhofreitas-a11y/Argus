// Registro de provedores de dados. Cada provedor expõe { name, geocode(q, country), searchPlaces(opts) }.
// PLACES_PROVIDER escolhe: 'osm', 'google', 'tomtom' ou 'hybrid'. Sem a variável, usa 'hybrid'
// quando existe alguma chave (GOOGLE_PLACES_API_KEY e/ou TOMTOM_API_KEY) e 'osm' caso contrário.
import * as osm from './osm.js'
import * as google from './google.js'
import * as tomtom from './tomtom.js'

const PAID = [google, tomtom]

// Fontes com chave como principais; OpenStreetMap completa (e-mail, redes sociais) e cobre lacunas.
// Se uma fonte falhar, as outras ainda respondem.
const hybrid = {
  name: 'hybrid',
  async geocode(q, country) {
    try {
      const r = await osm.geocode(q, country)
      if (r.length) return r
    } catch { /* tenta as outras fontes */ }
    for (const p of PAID.filter(x => x.available())) {
      try {
        const r = await p.geocode(q, country)
        if (r.length) return r
      } catch { /* próxima fonte */ }
    }
    return []
  },
  async searchPlaces(opts) {
    const sources = [...PAID.filter(p => p.available()), osm]
    const settled = await Promise.allSettled(sources.map(p => p.searchPlaces(opts)))
    if (settled.every(s => s.status === 'rejected')) throw settled[0].reason
    return settled.flatMap(s => (s.status === 'fulfilled' ? s.value : []))
  },
}

const PROVIDERS = { osm, google, tomtom, hybrid }

// usado apenas por testes automatizados
export function registerProvider(mod) {
  PROVIDERS[mod.name] = mod
}

export function provider() {
  const anyKey = PAID.some(p => p.available())
  const chosen = process.env.PLACES_PROVIDER || (anyKey ? 'hybrid' : 'osm')
  if (chosen === 'hybrid' && !anyKey) return osm
  if (PROVIDERS[chosen]?.available && !PROVIDERS[chosen].available()) return osm
  return PROVIDERS[chosen] || osm
}
