// Registro de provedores de dados. Cada provedor expõe { name, geocode(q, country), searchPlaces(opts) }.
// PLACES_PROVIDER escolhe: 'osm', 'google' ou 'hybrid'. Sem a variável, usa 'hybrid' quando
// GOOGLE_PLACES_API_KEY existe (Google + OpenStreetMap combinados) e 'osm' caso contrário.
import * as osm from './osm.js'
import * as google from './google.js'

// Google como fonte principal; OpenStreetMap completa (e-mail, redes sociais) e cobre lacunas.
// Se uma das fontes falhar, a outra ainda responde.
const hybrid = {
  name: 'hybrid',
  async geocode(q, country) {
    try {
      const r = await osm.geocode(q, country)
      if (r.length) return r
    } catch { /* tenta o Google */ }
    return google.geocode(q, country)
  },
  async searchPlaces(opts) {
    const [g, o] = await Promise.allSettled([google.searchPlaces(opts), osm.searchPlaces(opts)])
    if (g.status === 'rejected' && o.status === 'rejected') throw g.reason
    return [...(g.status === 'fulfilled' ? g.value : []), ...(o.status === 'fulfilled' ? o.value : [])]
  },
}

const PROVIDERS = { osm, google, hybrid }

// usado apenas por testes automatizados
export function registerProvider(mod) {
  PROVIDERS[mod.name] = mod
}

export function provider() {
  const chosen = process.env.PLACES_PROVIDER || (google.available() ? 'hybrid' : 'osm')
  if ((chosen === 'google' || chosen === 'hybrid') && !google.available()) return osm
  return PROVIDERS[chosen] || osm
}
