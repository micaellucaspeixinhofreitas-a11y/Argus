// Rótulo em português para a categoria de uma empresa (OpenStreetMap, Google ou TomTom)
const cap = s => { const t = String(s).replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1) }

const CATEGORY_PT = {
  shop: 'Loja', amenity: 'Serviço', office: 'Escritório', craft: 'Ofício', healthcare: 'Saúde', leisure: 'Lazer', tourism: 'Hospedagem',
}
const NAMES_PT = {
  restaurant: 'Restaurante', cafe: 'Cafeteria', bar: 'Bar', bakery: 'Padaria', gym: 'Academia', fitness_center: 'Academia',
  dentist: 'Dentista', dental_clinic: 'Clínica odontológica', doctor: 'Médico', medical_clinic: 'Clínica', hospital: 'Hospital',
  pharmacy: 'Farmácia', drugstore: 'Farmácia', beauty_salon: 'Salão de beleza', hair_salon: 'Cabeleireiro', barber_shop: 'Barbearia',
  spa: 'Spa', real_estate_agency: 'Imobiliária', lawyer: 'Advocacia', accounting: 'Contabilidade', car_repair: 'Oficina',
  store: 'Loja', clothing_store: 'Loja de roupas', supermarket: 'Supermercado', grocery_store: 'Mercado', pet_store: 'Pet shop',
  veterinary_care: 'Veterinário', hotel: 'Hotel', lodging: 'Hospedagem', school: 'Escola', insurance_agency: 'Seguros',
  pizza_restaurant: 'Pizzaria', fast_food_restaurant: 'Lanchonete', physiotherapist: 'Fisioterapia', point_of_interest: 'Estabelecimento',
  // valores do OpenStreetMap
  fast_food: 'Lanchonete', food_court: 'Praça de alimentação', pub: 'Bar', ice_cream: 'Sorveteria', clinic: 'Clínica', doctors: 'Consultório médico',
  fitness_centre: 'Academia', sports_centre: 'Centro esportivo', swimming_pool: 'Piscina', hairdresser: 'Cabeleireiro', beauty: 'Salão de beleza',
  massage: 'Massagem', tattoo: 'Estúdio de tatuagem', cosmetics: 'Cosméticos', optician: 'Ótica', veterinary: 'Veterinário', pet: 'Pet shop',
  estate_agent: 'Imobiliária', accountant: 'Contabilidade', insurance: 'Seguros', convenience: 'Loja de conveniência', clothes: 'Loja de roupas',
  shoes: 'Calçados', jewelry: 'Joalheria', florist: 'Floricultura', hardware: 'Material de construção', doityourself: 'Material de construção',
  furniture: 'Móveis', electronics: 'Eletrônicos', mobile_phone: 'Celulares', computer: 'Informática', books: 'Livraria', butcher: 'Açougue',
  greengrocer: 'Hortifrúti', confectionery: 'Doceria', pastry: 'Confeitaria', car: 'Concessionária', car_parts: 'Autopeças', tyres: 'Pneus',
  car_wash: 'Lava-rápido', fuel: 'Posto de combustível', bank: 'Banco', kindergarten: 'Educação infantil', college: 'Faculdade',
  language_school: 'Escola de idiomas', driving_school: 'Autoescola', dry_cleaning: 'Lavanderia', laundry: 'Lavanderia', nightclub: 'Casa noturna',
  cinema: 'Cinema', guest_house: 'Pousada', hostel: 'Hostel', motel: 'Motel', it: 'Tecnologia', company: 'Empresa', coworking: 'Coworking',
  photographer: 'Fotógrafo', printing: 'Gráfica', stationery: 'Papelaria', toys: 'Brinquedos', sports: 'Artigos esportivos', bicycle: 'Bicicletaria',
  variety_store: 'Variedades', department_store: 'Loja de departamentos', mall: 'Shopping', chemist: 'Drogaria', medical_supply: 'Artigos médicos',
}
export const catLabel = c => {
  if (!c) return 'Estabelecimento'
  const [k, v] = c.split(':')
  if (v === undefined) return NAMES_PT[k] || cap(k)
  if (k === 'google') return NAMES_PT[v] || cap(v)
  if (k === 'tomtom') return cap(v)
  return NAMES_PT[v] || `${CATEGORY_PT[k] || cap(k)} · ${String(v).replace(/_/g, ' ')}`
}
