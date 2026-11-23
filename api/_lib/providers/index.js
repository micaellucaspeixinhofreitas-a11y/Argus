// Registro de provedores de dados. Para adicionar outro (ex.: Google Places),
// crie um módulo com { name, geocode(q, country), searchPlaces(opts) } e registre aqui.
// O provedor ativo é escolhido pela variável PLACES_PROVIDER (padrão: osm).
import * as osm from './osm.js'

const PROVIDERS = { osm }

// usado apenas por testes automatizados
export function registerProvider(mod) {
  PROVIDERS[mod.name] = mod
}

export function provider() {
  return PROVIDERS[process.env.PLACES_PROVIDER || 'osm'] || osm
}
