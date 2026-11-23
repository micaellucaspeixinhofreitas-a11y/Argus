// Catálogo de segmentos comerciais → filtros de tags do OpenStreetMap.
// Cada filtro é um par [chave, regex|null]. Termos fora do catálogo viram
// busca por palavra-chave no nome do estabelecimento.

export const CATALOG = {
  clinicas: { label: 'Clínicas', filters: [['amenity', 'clinic|doctors|dentist'], ['healthcare', null]] },
  dentistas: { label: 'Dentistas', filters: [['amenity', 'dentist'], ['healthcare', 'dentist']] },
  medicos: { label: 'Médicos', filters: [['amenity', 'doctors'], ['healthcare', 'doctor']] },
  restaurantes: { label: 'Restaurantes', filters: [['amenity', 'restaurant|fast_food|food_court']] },
  bares: { label: 'Bares', filters: [['amenity', 'bar|pub|biergarten']] },
  cafes: { label: 'Cafeterias', filters: [['amenity', 'cafe'], ['shop', 'coffee']] },
  padarias: { label: 'Padarias', filters: [['shop', 'bakery|pastry|confectionery']] },
  academias: { label: 'Academias', filters: [['leisure', 'fitness_centre|sports_centre'], ['sport', 'fitness']] },
  lojas: { label: 'Lojas', filters: [['shop', null]] },
  roupas: { label: 'Lojas de roupas', filters: [['shop', 'clothes|shoes|boutique|fashion_accessories']] },
  mercados: { label: 'Mercados', filters: [['shop', 'supermarket|convenience|greengrocer|butcher']] },
  farmacias: { label: 'Farmácias', filters: [['amenity', 'pharmacy'], ['shop', 'chemist']] },
  escritorios: { label: 'Escritórios', filters: [['office', null]] },
  imobiliarias: { label: 'Imobiliárias', filters: [['office', 'estate_agent'], ['shop', 'estate_agent']] },
  advogados: { label: 'Advogados', filters: [['office', 'lawyer|notary']] },
  contabilidade: { label: 'Contabilidade', filters: [['office', 'accountant|tax_advisor']] },
  oficinas: { label: 'Oficinas', filters: [['shop', 'car_repair|motorcycle_repair|tyres|car_parts'], ['craft', null]] },
  saloes: { label: 'Salões de beleza', filters: [['shop', 'hairdresser|beauty|cosmetics|nails|massage']] },
  petshops: { label: 'Pet shops', filters: [['shop', 'pet|pet_grooming'], ['amenity', 'veterinary']] },
  hoteis: { label: 'Hotéis', filters: [['tourism', 'hotel|motel|guest_house|hostel|apartment']] },
  escolas: { label: 'Escolas e cursos', filters: [['amenity', 'school|language_school|driving_school|music_school|college|kindergarten']] },
  servicos: { label: 'Prestadores de serviços', filters: [['craft', null], ['office', 'company|it|consulting|marketing|advertising_agency|telecommunication'], ['shop', 'dry_cleaning|laundry|copyshop|repair|mobile_phone|computer']] },
}

// Todos os tipos de estabelecimento comercial (busca sem segmento)
export const ALL_BUSINESS = [
  ['shop', null], ['office', null], ['craft', null], ['healthcare', null],
  ['amenity', 'restaurant|fast_food|cafe|bar|pub|clinic|doctors|dentist|pharmacy|veterinary|bank|car_wash|fuel|language_school|driving_school|cinema|nightclub|ice_cream'],
  ['leisure', 'fitness_centre|sports_centre'], ['tourism', 'hotel|motel|guest_house|hostel'],
]

const normalize = s =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

// sinônimos simples para casar o que o usuário digitar com o catálogo
const ALIASES = {
  clinica: 'clinicas', clinicas: 'clinicas', consultorio: 'clinicas', consultorios: 'clinicas', saude: 'clinicas',
  dentista: 'dentistas', odontologia: 'dentistas', medico: 'medicos',
  restaurante: 'restaurantes', lanchonete: 'restaurantes', lanchonetes: 'restaurantes', pizzaria: 'restaurantes', pizzarias: 'restaurantes',
  bar: 'bares', cafe: 'cafes', cafeteria: 'cafes', padaria: 'padarias',
  academia: 'academias', crossfit: 'academias', loja: 'lojas', comercio: 'lojas', roupa: 'roupas', moda: 'roupas',
  mercado: 'mercados', supermercado: 'mercados', supermercados: 'mercados', farmacia: 'farmacias', drogaria: 'farmacias',
  escritorio: 'escritorios', empresa: 'escritorios', empresas: 'escritorios', imobiliaria: 'imobiliarias',
  advogado: 'advogados', advocacia: 'advogados', contador: 'contabilidade', contadores: 'contabilidade', contabil: 'contabilidade',
  oficina: 'oficinas', mecanica: 'oficinas', mecanicas: 'oficinas', salao: 'saloes', 'salao de beleza': 'saloes', 'saloes de beleza': 'saloes',
  barbearia: 'saloes', barbearias: 'saloes', estetica: 'saloes', 'pet shop': 'petshops', petshop: 'petshops', veterinario: 'petshops',
  hotel: 'hoteis', pousada: 'hoteis', pousadas: 'hoteis', escola: 'escolas', curso: 'escolas', cursos: 'escolas',
  servico: 'servicos', 'prestadores de servicos': 'servicos', 'prestador de servico': 'servicos',
}

// "estetica" -> "[eéêè]st[eéêè]t[iíì]c[aáàâã]" para casar nomes acentuados no OSM
const ACCENTS = { a: '[aáàâãä]', e: '[eéêèë]', i: '[iíìîï]', o: '[oóòôõö]', u: '[uúùûü]', c: '[cç]', n: '[nñ]' }
const accentInsensitive = t => t.replace(/[aeioucn]/g, ch => ACCENTS[ch])

export function resolveSegments(terms) {
  const resolved = []
  for (const raw of terms) {
    const t = normalize(raw)
    if (!t) continue
    const key = CATALOG[t.replace(/ /g, '')] ? t.replace(/ /g, '') : ALIASES[t]
    if (key) resolved.push({ term: raw, key, label: CATALOG[key].label, filters: CATALOG[key].filters })
    else resolved.push({ term: raw, key: null, label: raw, keyword: accentInsensitive(t) })
  }
  return resolved
}

export const catalogList = () => Object.entries(CATALOG).map(([key, v]) => ({ key, label: v.label }))
