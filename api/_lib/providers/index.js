// Registro de provedores de dados. Cada provedor expõe { name, geocode(q, country), searchPlaces(opts) }.
// PLACES_PROVIDER escolhe: 'osm', 'google', 'tomtom' ou 'hybrid'. Sem a variável, usa 'hybrid'
// quando existe alguma chave (GOOGLE_PLACES_API_KEY e/ou TOMTOM_API_KEY) e 'osm' caso contrário.
import * as osm from './osm.js'
import * as google from './google.js'
import * as tomtom from './tomtom.js'

const PAID = [google, tomtom]

// Fontes com chave como principais; OpenStreetMap completa (e-mail, redes sociais) e cobre lacunas.
// Se uma fonte falhar, as outras ainda respondem.
const settle = p => p.then(value => ({ status: 'fulfilled', value }), reason => ({ status: 'rejected', reason }))
const wait = ms => new Promise(resolve => setTimeout(() => resolve({ status: 'rejected', reason: new Error('tempo esgotado') }), ms))

const hybrid = {
  name: 'hybrid',
  // endereços: fonte com chave primeiro (mais rápida), OpenStreetMap como reserva
  async geocode(q, country) {
    for (const p of [...PAID.filter(x => x.available()), osm]) {
      try {
        const r = await p.geocode(q, country)
        if (r.length) return r
      } catch { /* próxima fonte */ }
    }
    return []
  },
  // empresas: fontes com chave + OpenStreetMap; depois que as principais respondem,
  // o OpenStreetMap tem só mais alguns segundos para complementar
  async searchPlaces(opts) {
    const paid = PAID.filter(p => p.available())
    const osmTask = settle(osm.searchPlaces({ ...opts, deadlineMs: 18000 }))
    const paidSettled = await Promise.all(paid.map(p => settle(p.searchPlaces(opts))))
    const paidOk = paidSettled.some(s => s.status === 'fulfilled' && s.value.length)
    const osmSettled = await (paidOk ? Promise.race([osmTask, wait(4000)]) : osmTask)
    const settled = [...paidSettled, osmSettled]
    const names = [...paid.map(p => p.name), 'osm']
    const errors = {}
    settled.forEach((s, i) => { if (s.status === 'rejected') errors[names[i]] = String(s.reason?.message || s.reason).slice(0, 200) })
    if (settled.every(s => s.status === 'rejected')) {
      const err = new Error(Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join(' | '))
      err.sourceErrors = errors
      throw err
    }
    const places = settled.flatMap(s => (s.status === 'fulfilled' ? s.value : []))
    places.sourceErrors = errors
    return places
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
