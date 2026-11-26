// Catálogo de segmentos comerciais.
// Cada segmento tem: rótulo, grupo (para o seletor da tela), termo de busca nas fontes com
// chave (TomTom/Google), filtros de tags do OpenStreetMap ([chave, regex|null]) e sinônimos.
// Termos fora do catálogo viram busca por palavra-chave no nome do estabelecimento.

const S = (label, group, tt, filters, aliases = []) => ({ label, group, tt, filters, aliases })

export const GROUPS = [
  'Alimentação', 'Saúde', 'Beleza e bem-estar', 'Esporte e lazer', 'Varejo', 'Casa e construção',
  'Automotivo', 'Serviços profissionais', 'Finanças', 'Educação', 'Hospedagem e turismo', 'Pets',
  'Eventos e entretenimento', 'Indústria e atacado',
]

export const CATALOG = {
  // ---------- Alimentação ----------
  restaurantes: S('Restaurantes', 'Alimentação', 'restaurante', [['amenity', 'restaurant|food_court']], ['restaurante', 'comida', 'self service', 'marmitaria', 'marmitarias', 'cozinha']),
  lanchonetes: S('Lanchonetes', 'Alimentação', 'lanchonete', [['amenity', 'fast_food']], ['lanchonete', 'fast food', 'lanches', 'salgaderia', 'pastelaria', 'pastelarias']),
  hamburguerias: S('Hamburguerias', 'Alimentação', 'hamburgueria', [['cuisine', 'burger']], ['hamburgueria', 'hamburguer', 'burger']),
  pizzarias: S('Pizzarias', 'Alimentação', 'pizzaria', [['cuisine', 'pizza']], ['pizzaria', 'pizza']),
  japoneses: S('Restaurantes japoneses', 'Alimentação', 'restaurante japonês', [['cuisine', 'japanese|sushi|ramen']], ['japones', 'japonesa', 'sushi', 'temakeria', 'comida japonesa']),
  churrascarias: S('Churrascarias', 'Alimentação', 'churrascaria', [['cuisine', 'barbecue|steak_house|churrasco']], ['churrascaria', 'churrasco', 'steakhouse']),
  bares: S('Bares', 'Alimentação', 'bar', [['amenity', 'bar|pub|biergarten']], ['bar', 'boteco', 'botecos', 'pub', 'choperia', 'cervejaria']),
  cafes: S('Cafeterias', 'Alimentação', 'cafeteria', [['amenity', 'cafe'], ['shop', 'coffee|tea']], ['cafe', 'cafeteria', 'coffee', 'casa de cha']),
  padarias: S('Padarias', 'Alimentação', 'padaria', [['shop', 'bakery']], ['padaria', 'panificadora', 'panificadoras']),
  confeitarias: S('Confeitarias e docerias', 'Alimentação', 'confeitaria', [['shop', 'pastry|confectionery|chocolate']], ['confeitaria', 'doceria', 'docerias', 'doces', 'bolos', 'chocolateria']),
  sorveterias: S('Sorveterias e açaí', 'Alimentação', 'sorveteria', [['amenity', 'ice_cream'], ['shop', 'ice_cream|frozen_food'], ['cuisine', 'ice_cream|acai|frozen_yogurt']], ['sorveteria', 'sorvete', 'acai', 'acaiteria', 'acaiterias', 'gelateria', 'paleteria']),
  supermercados: S('Supermercados', 'Alimentação', 'supermercado', [['shop', 'supermarket']], ['supermercado', 'mercado', 'mercados', 'hipermercado']),
  mercearias: S('Mercearias e conveniência', 'Alimentação', 'loja de conveniência', [['shop', 'convenience|general|kiosk']], ['mercearia', 'conveniencia', 'loja de conveniencia', 'mini mercado', 'minimercado', 'emporio', 'emporios']),
  hortifrutis: S('Hortifrútis', 'Alimentação', 'hortifruti', [['shop', 'greengrocer|farm']], ['hortifruti', 'sacolao', 'quitanda', 'frutaria', 'verdurao']),
  acougues: S('Açougues e peixarias', 'Alimentação', 'açougue', [['shop', 'butcher|seafood|deli']], ['acougue', 'casa de carnes', 'peixaria', 'peixarias', 'frios', 'rotisseria']),
  adegas: S('Adegas e bebidas', 'Alimentação', 'loja de bebidas', [['shop', 'alcohol|wine|beverages']], ['adega', 'bebidas', 'distribuidora de bebidas', 'loja de vinhos', 'tabacaria e bebidas']),
  naturais: S('Produtos naturais', 'Alimentação', 'loja de produtos naturais', [['shop', 'health_food|nutrition_supplements|herbalist']], ['produtos naturais', 'loja natural', 'suplementos', 'suplemento', 'casa de suplementos', 'graos']),

  // ---------- Saúde ----------
  clinicas: S('Clínicas', 'Saúde', 'clínica', [['amenity', 'clinic|doctors|dentist'], ['healthcare', null]], ['clinica', 'consultorio', 'consultorios', 'saude', 'policlinica', 'clinica medica']),
  dentistas: S('Dentistas', 'Saúde', 'dentista', [['amenity', 'dentist'], ['healthcare', 'dentist']], ['dentista', 'odontologia', 'odontologico', 'odontologica', 'clinica odontologica', 'clinicas odontologicas', 'ortodontia', 'implante dentario']),
  medicos: S('Médicos', 'Saúde', 'médico', [['amenity', 'doctors'], ['healthcare', 'doctor']], ['medico', 'consultorio medico', 'pediatra', 'ginecologista', 'dermatologista', 'cardiologista']),
  hospitais: S('Hospitais', 'Saúde', 'hospital', [['amenity', 'hospital'], ['healthcare', 'hospital']], ['hospital', 'pronto socorro', 'pronto atendimento', 'maternidade']),
  laboratorios: S('Laboratórios e exames', 'Saúde', 'laboratório de análises clínicas', [['healthcare', 'laboratory|sample_collection|blood_donation'], ['amenity', 'laboratory']], ['laboratorio', 'analises clinicas', 'exames', 'diagnostico por imagem', 'radiologia']),
  fisioterapia: S('Fisioterapia', 'Saúde', 'fisioterapia', [['healthcare', 'physiotherapist|rehabilitation|occupational_therapist']], ['fisioterapia', 'fisioterapeuta', 'fisioterapeutas', 'reabilitacao', 'rpg']),
  psicologos: S('Psicólogos e terapias', 'Saúde', 'psicólogo', [['healthcare', 'psychotherapist|counselling|psychologist']], ['psicologo', 'psicologa', 'psicologia', 'terapia', 'terapeuta', 'psiquiatra']),
  nutricionistas: S('Nutricionistas', 'Saúde', 'nutricionista', [['healthcare', 'nutrition_counselling|dietitian']], ['nutricionista', 'nutricao', 'nutrologo']),
  fonoaudiologos: S('Fonoaudiólogos', 'Saúde', 'fonoaudiólogo', [['healthcare', 'speech_therapist|audiologist'], ['shop', 'hearing_aids']], ['fonoaudiologo', 'fonoaudiologia', 'fono', 'aparelho auditivo']),
  farmacias: S('Farmácias', 'Saúde', 'farmácia', [['amenity', 'pharmacy'], ['shop', 'chemist|medical_supply']], ['farmacia', 'drogaria', 'drogarias', 'manipulacao', 'farmacia de manipulacao']),
  oticas: S('Óticas', 'Saúde', 'ótica', [['shop', 'optician'], ['healthcare', 'optometrist']], ['otica', 'oculos', 'optometrista']),
  podologia: S('Podologia', 'Saúde', 'podólogo', [['healthcare', 'podiatrist']], ['podologo', 'podologia', 'podologa']),

  // ---------- Beleza e bem-estar ----------
  saloes: S('Salões de beleza', 'Beleza e bem-estar', 'salão de beleza', [['shop', 'hairdresser|beauty']], ['salao', 'salao de beleza', 'cabeleireiro', 'cabeleireira', 'cabeleireiros', 'escova', 'studio de beleza']),
  barbearias: S('Barbearias', 'Beleza e bem-estar', 'barbearia', [['shop', 'hairdresser|barber']], ['barbearia', 'barbeiro', 'barber', 'barber shop']),
  esteticas: S('Clínicas de estética', 'Beleza e bem-estar', 'clínica de estética', [['shop', 'beauty|massage'], ['healthcare', 'cosmetic']], ['estetica', 'clinica de estetica', 'depilacao', 'harmonizacao', 'harmonizacao facial', 'limpeza de pele', 'micropigmentacao']),
  manicures: S('Manicure e esmalteria', 'Beleza e bem-estar', 'manicure', [['shop', 'beauty|nails']], ['manicure', 'esmalteria', 'unhas', 'nail', 'pedicure', 'alongamento de unhas']),
  cosmeticos: S('Perfumarias e cosméticos', 'Beleza e bem-estar', 'perfumaria', [['shop', 'cosmetics|perfumery']], ['perfumaria', 'cosmeticos', 'maquiagem', 'loja de cosmeticos']),
  tatuagem: S('Estúdios de tatuagem', 'Beleza e bem-estar', 'estúdio de tatuagem', [['shop', 'tattoo|piercing']], ['tatuagem', 'tatuador', 'tattoo', 'piercing', 'body piercing']),
  spas: S('Spas e massagem', 'Beleza e bem-estar', 'spa', [['shop', 'massage'], ['leisure', 'spa'], ['amenity', 'spa|public_bath']], ['spa', 'massagem', 'massoterapia', 'day spa', 'quick massage']),

  // ---------- Esporte e lazer ----------
  academias: S('Academias', 'Esporte e lazer', 'academia', [['leisure', 'fitness_centre|sports_centre'], ['sport', 'fitness']], ['academia', 'musculacao', 'gym', 'fitness']),
  crossfit: S('CrossFit e funcional', 'Esporte e lazer', 'crossfit', [['sport', 'crossfit|functional_training']], ['crossfit', 'box de crossfit', 'funcional', 'treino funcional']),
  pilates: S('Pilates e yoga', 'Esporte e lazer', 'estúdio de pilates', [['sport', 'pilates|yoga'], ['leisure', 'fitness_centre']], ['pilates', 'yoga', 'ioga', 'estudio de pilates']),
  lutas: S('Artes marciais', 'Esporte e lazer', 'academia de artes marciais', [['sport', 'martial_arts|karate|judo|taekwondo|boxing|jiu-jitsu|capoeira|kickboxing|muay_thai']], ['luta', 'lutas', 'artes marciais', 'jiu jitsu', 'karate', 'judo', 'muay thai', 'boxe', 'capoeira']),
  danca: S('Escolas de dança', 'Esporte e lazer', 'escola de dança', [['leisure', 'dance'], ['amenity', 'dancing_school'], ['sport', 'dance']], ['danca', 'escola de danca', 'ballet', 'bale', 'studio de danca']),
  natacao: S('Natação e esportes aquáticos', 'Esporte e lazer', 'escola de natação', [['sport', 'swimming|aquatics'], ['leisure', 'swimming_pool']], ['natacao', 'escola de natacao', 'hidroginastica', 'piscina']),
  quadras: S('Quadras e arenas', 'Esporte e lazer', 'quadra esportiva', [['leisure', 'pitch|sports_hall|stadium'], ['sport', 'soccer|futsal|beachvolleyball|padel|tennis']], ['quadra', 'quadras', 'arena', 'society', 'futebol society', 'beach tennis', 'padel', 'quadra de tenis']),
  esportivas: S('Lojas de esporte', 'Esporte e lazer', 'loja de artigos esportivos', [['shop', 'sports|outdoor|fishing|hunting|scuba_diving']], ['loja de esportes', 'artigos esportivos', 'pesca', 'camping', 'aventura']),
  bicicletas: S('Bicicletarias', 'Esporte e lazer', 'bicicletaria', [['shop', 'bicycle']], ['bicicletaria', 'bicicleta', 'bike', 'bike shop']),

  // ---------- Varejo ----------
  lojas: S('Lojas (todas)', 'Varejo', 'loja', [['shop', null]], ['loja', 'comercio', 'varejo', 'lojista', 'lojistas']),
  roupas: S('Lojas de roupas', 'Varejo', 'loja de roupas', [['shop', 'clothes|boutique|fashion|fashion_accessories']], ['roupa', 'moda', 'boutique', 'loja de roupa', 'moda feminina', 'moda masculina', 'moda infantil', 'lingerie']),
  calcados: S('Calçados', 'Varejo', 'loja de calçados', [['shop', 'shoes|leather|bag']], ['calcado', 'sapataria', 'sapatos', 'tenis', 'bolsas', 'artigos de couro']),
  joalherias: S('Joalherias e relojoarias', 'Varejo', 'joalheria', [['shop', 'jewelry|watches']], ['joalheria', 'joias', 'relojoaria', 'relogios', 'bijuteria', 'semijoias']),
  papelarias: S('Papelarias', 'Varejo', 'papelaria', [['shop', 'stationery|office_supplies|copyshop']], ['papelaria', 'material escolar', 'material de escritorio']),
  livrarias: S('Livrarias', 'Varejo', 'livraria', [['shop', 'books|comics']], ['livraria', 'livros', 'sebo', 'quadrinhos']),
  presentes: S('Presentes e variedades', 'Varejo', 'loja de presentes', [['shop', 'gift|variety_store|party|souvenir']], ['presentes', 'variedades', 'loja de 1 99', 'utilidades', 'artigos para festa', 'souvenir']),
  brinquedos: S('Brinquedos e bebês', 'Varejo', 'loja de brinquedos', [['shop', 'toys|baby_goods|games']], ['brinquedo', 'brinquedos', 'loja infantil', 'bebe', 'enxoval', 'games']),
  eletronicos: S('Eletrônicos e celulares', 'Varejo', 'loja de eletrônicos', [['shop', 'electronics|mobile_phone|computer|hifi|video_games']], ['eletronicos', 'celular', 'celulares', 'smartphone', 'assistencia tecnica', 'informatica', 'computador', 'notebook']),
  eletrodomesticos: S('Eletrodomésticos', 'Varejo', 'loja de eletrodomésticos', [['shop', 'appliance|electrical|lighting']], ['eletrodomestico', 'eletrodomesticos', 'linha branca', 'iluminacao', 'material eletrico']),
  floriculturas: S('Floriculturas', 'Varejo', 'floricultura', [['shop', 'florist|garden_centre']], ['floricultura', 'flores', 'plantas', 'garden', 'paisagismo']),
  departamento: S('Lojas de departamento', 'Varejo', 'loja de departamento', [['shop', 'department_store|mall|wholesale']], ['loja de departamento', 'magazine', 'shopping']),
  tabacarias: S('Tabacarias', 'Varejo', 'tabacaria', [['shop', 'tobacco|e-cigarette']], ['tabacaria', 'charutaria', 'headshop']),
  musica: S('Instrumentos musicais', 'Varejo', 'loja de instrumentos musicais', [['shop', 'musical_instrument|music']], ['instrumentos musicais', 'loja de musica', 'luthier']),
  brechos: S('Brechós e usados', 'Varejo', 'brechó', [['shop', 'second_hand|charity|pawnbroker']], ['brecho', 'usados', 'seminovos', 'antiquario', 'antiguidades']),
  artesanato: S('Artesanato e armarinhos', 'Varejo', 'armarinho', [['shop', 'craft|fabric|sewing|art|frame']], ['artesanato', 'armarinho', 'aviamentos', 'tecidos', 'molduras', 'galeria de arte']),

  // ---------- Casa e construção ----------
  construcao: S('Materiais de construção', 'Casa e construção', 'loja de materiais de construção', [['shop', 'hardware|doityourself|trade|paint|building_materials|tiles|bathroom_furnishing']], ['material de construcao', 'materiais de construcao', 'home center', 'ferragens', 'ferragista', 'tintas', 'casa de tintas', 'pisos', 'revestimentos']),
  moveis: S('Móveis e decoração', 'Casa e construção', 'loja de móveis', [['shop', 'furniture|interior_decoration|houseware|bed|curtain|carpet|kitchen']], ['moveis', 'movel', 'decoracao', 'colchoes', 'cortinas', 'tapetes', 'cozinhas planejadas', 'planejados']),
  marcenarias: S('Marcenarias', 'Casa e construção', 'marcenaria', [['craft', 'carpenter|joiner|cabinet_maker']], ['marcenaria', 'marceneiro', 'carpintaria', 'moveis sob medida']),
  serralherias: S('Serralherias', 'Casa e construção', 'serralheria', [['craft', 'metal_construction|blacksmith|welder']], ['serralheria', 'serralheiro', 'portoes', 'esquadrias']),
  vidracarias: S('Vidraçarias', 'Casa e construção', 'vidraçaria', [['craft', 'glaziery'], ['shop', 'glaziery']], ['vidracaria', 'vidraceiro', 'box de banheiro', 'espelhos']),
  eletricistas: S('Eletricistas', 'Casa e construção', 'eletricista', [['craft', 'electrician']], ['eletricista', 'instalacoes eletricas']),
  encanadores: S('Encanadores', 'Casa e construção', 'encanador', [['craft', 'plumber|hvac']], ['encanador', 'hidraulica', 'ar condicionado', 'climatizacao', 'refrigeracao']),
  pintores: S('Pintores e reformas', 'Casa e construção', 'empresa de reformas', [['craft', 'painter|builder|tiler|roofer|plasterer|floorer']], ['pintor', 'pintura', 'reforma', 'reformas', 'pedreiro', 'gesseiro', 'drywall', 'telhados']),
  chaveiros: S('Chaveiros', 'Casa e construção', 'chaveiro', [['shop', 'locksmith'], ['craft', 'locksmith|key_cutter']], ['chaveiro', 'chaves', 'fechaduras']),
  lavanderias: S('Lavanderias', 'Casa e construção', 'lavanderia', [['shop', 'laundry|dry_cleaning']], ['lavanderia', 'tinturaria', 'lavagem a seco']),
  jardinagem: S('Jardinagem e paisagismo', 'Casa e construção', 'paisagismo', [['craft', 'gardener|landscaper'], ['shop', 'garden_centre']], ['jardinagem', 'jardineiro', 'paisagista', 'viveiro']),
  dedetizadoras: S('Dedetizadoras e limpeza', 'Casa e construção', 'dedetizadora', [['craft', 'pest_control|cleaning'], ['office', 'cleaning']], ['dedetizadora', 'dedetizacao', 'controle de pragas', 'limpeza', 'empresa de limpeza', 'faxina']),

  // ---------- Automotivo ----------
  oficinas: S('Oficinas mecânicas', 'Automotivo', 'oficina mecânica', [['shop', 'car_repair|motorcycle_repair'], ['craft', 'car_repair']], ['oficina', 'mecanica', 'mecanico', 'auto center', 'funilaria', 'auto eletrica', 'retifica']),
  autopecas: S('Autopeças', 'Automotivo', 'loja de autopeças', [['shop', 'car_parts|motorcycle_parts']], ['autopecas', 'auto pecas', 'pecas automotivas', 'acessorios automotivos']),
  concessionarias: S('Concessionárias e revendas', 'Automotivo', 'concessionária', [['shop', 'car|motorcycle|truck']], ['concessionaria', 'revenda de carros', 'garagem de carros', 'loja de carros', 'motos', 'loja de motos', 'seminovos']),
  lavajatos: S('Lava-jatos e estética automotiva', 'Automotivo', 'lava-rápido', [['amenity', 'car_wash'], ['shop', 'car_wash']], ['lava jato', 'lava rapido', 'lava car', 'estetica automotiva', 'polimento']),
  postos: S('Postos de combustível', 'Automotivo', 'posto de combustível', [['amenity', 'fuel']], ['posto', 'posto de gasolina', 'combustivel']),
  borracharias: S('Borracharias e pneus', 'Automotivo', 'borracharia', [['shop', 'tyres']], ['borracharia', 'pneus', 'alinhamento', 'balanceamento']),
  locadoras: S('Locadoras de veículos', 'Automotivo', 'locadora de veículos', [['amenity', 'car_rental|car_sharing|vehicle_inspection']], ['locadora', 'aluguel de carros', 'locadora de carros', 'vistoria']),
  autoescolas: S('Autoescolas', 'Automotivo', 'autoescola', [['amenity', 'driving_school']], ['autoescola', 'auto escola', 'cfc', 'centro de formacao de condutores']),

  // ---------- Serviços profissionais ----------
  escritorios: S('Escritórios e empresas', 'Serviços profissionais', 'escritório', [['office', null]], ['escritorio', 'empresa', 'empresas', 'corporativo']),
  advogados: S('Advogados e cartórios', 'Serviços profissionais', 'advogado', [['office', 'lawyer|notary|legal'], ['amenity', 'notary']], ['advogado', 'advocacia', 'escritorio de advocacia', 'cartorio', 'tabeliao']),
  contabilidade: S('Contabilidade', 'Serviços profissionais', 'contador', [['office', 'accountant|tax_advisor|bookkeeper']], ['contador', 'contadores', 'contabil', 'escritorio de contabilidade', 'contabilidade']),
  imobiliarias: S('Imobiliárias', 'Serviços profissionais', 'imobiliária', [['office', 'estate_agent|property_management'], ['shop', 'estate_agent']], ['imobiliaria', 'corretor de imoveis', 'corretora de imoveis', 'administradora de imoveis']),
  arquitetos: S('Arquitetura e engenharia', 'Serviços profissionais', 'escritório de arquitetura', [['office', 'architect|engineer|surveyor|geodesist']], ['arquiteto', 'arquitetura', 'engenharia', 'engenheiro', 'topografia', 'design de interiores']),
  marketing: S('Agências de marketing', 'Serviços profissionais', 'agência de marketing', [['office', 'advertising_agency|marketing|graphic_design']], ['agencia de marketing', 'agencia de publicidade', 'publicidade', 'marketing digital', 'design grafico']),
  tecnologia: S('Tecnologia e software', 'Serviços profissionais', 'empresa de software', [['office', 'it|software|telecommunication|web_design']], ['tecnologia', 'ti', 'software', 'desenvolvimento de sistemas', 'agencia web', 'provedor de internet', 'telecom']),
  consultorias: S('Consultorias', 'Serviços profissionais', 'consultoria', [['office', 'consulting|coaching|research|financial_advisor']], ['consultoria', 'consultor', 'assessoria', 'coach']),
  seguradoras: S('Corretoras de seguros', 'Serviços profissionais', 'corretora de seguros', [['office', 'insurance']], ['seguros', 'seguradora', 'corretora de seguros', 'corretor de seguros', 'plano de saude']),
  coworkings: S('Coworkings', 'Serviços profissionais', 'coworking', [['amenity', 'coworking_space'], ['office', 'coworking']], ['coworking', 'espaco compartilhado', 'escritorio compartilhado']),
  graficas: S('Gráficas e copiadoras', 'Serviços profissionais', 'gráfica', [['shop', 'copyshop|printing'], ['craft', 'printer|signmaker'], ['office', 'printing']], ['grafica', 'copiadora', 'impressao', 'comunicacao visual', 'placas', 'letreiros', 'banners']),
  fotografos: S('Fotógrafos e filmagem', 'Serviços profissionais', 'estúdio fotográfico', [['shop', 'photo|photo_studio'], ['craft', 'photographer|photographic_laboratory']], ['fotografo', 'fotografia', 'estudio fotografico', 'filmagem', 'videomaker']),
  rh: S('RH e recrutamento', 'Serviços profissionais', 'agência de empregos', [['office', 'employment_agency|recruitment']], ['agencia de empregos', 'recrutamento', 'recursos humanos', 'rh', 'trabalho temporario']),
  despachantes: S('Despachantes', 'Serviços profissionais', 'despachante', [['office', 'administrative|customs_broker|government']], ['despachante', 'despachante documentalista', 'documentacao de veiculos']),
  servicos: S('Prestadores de serviços (todos)', 'Serviços profissionais', 'prestador de serviços', [['craft', null], ['office', 'company|it|consulting|marketing|advertising_agency|telecommunication'], ['shop', 'dry_cleaning|laundry|copyshop|repair|mobile_phone|computer']], ['servico', 'servicos', 'prestadores de servicos', 'prestador de servico', 'autonomos']),
  costura: S('Costureiras e consertos', 'Serviços profissionais', 'costureira', [['craft', 'tailor|dressmaker|shoemaker|upholsterer'], ['shop', 'tailor|repair']], ['costureira', 'costura', 'alfaiate', 'ajustes de roupa', 'sapateiro', 'tapeceiro', 'estofador']),

  // ---------- Finanças ----------
  bancos: S('Bancos', 'Finanças', 'banco', [['amenity', 'bank'], ['office', 'financial']], ['banco', 'agencia bancaria', 'cooperativa de credito']),
  lotericas: S('Lotéricas', 'Finanças', 'casa lotérica', [['shop', 'lottery|bookmaker']], ['loterica', 'casa loterica']),
  cambio: S('Câmbio e crédito', 'Finanças', 'casa de câmbio', [['amenity', 'bureau_de_change|money_transfer|payment_centre'], ['shop', 'money_lender']], ['cambio', 'casa de cambio', 'emprestimo', 'credito', 'correspondente bancario', 'financeira']),

  // ---------- Educação ----------
  escolas: S('Escolas', 'Educação', 'escola', [['amenity', 'school|prep_school']], ['escola', 'colegio', 'colegios', 'ensino fundamental', 'ensino medio']),
  creches: S('Creches e educação infantil', 'Educação', 'creche', [['amenity', 'kindergarten|childcare']], ['creche', 'bercario', 'educacao infantil', 'escolinha']),
  idiomas: S('Escolas de idiomas', 'Educação', 'escola de idiomas', [['amenity', 'language_school']], ['idiomas', 'escola de ingles', 'curso de ingles', 'ingles', 'espanhol', 'escola de idiomas']),
  cursos: S('Cursos livres e profissionalizantes', 'Educação', 'curso profissionalizante', [['amenity', 'training|music_school|driving_school|prep_school'], ['office', 'educational_institution']], ['curso', 'cursos', 'curso profissionalizante', 'cursinho', 'pre vestibular', 'reforco escolar', 'escola de musica', 'informatica curso']),
  faculdades: S('Faculdades', 'Educação', 'faculdade', [['amenity', 'college|university']], ['faculdade', 'universidade', 'centro universitario', 'pos graduacao']),

  // ---------- Hospedagem e turismo ----------
  hoteis: S('Hotéis', 'Hospedagem e turismo', 'hotel', [['tourism', 'hotel|motel|apartment']], ['hotel', 'hoteis', 'flat', 'apart hotel', 'motel']),
  pousadas: S('Pousadas e hostels', 'Hospedagem e turismo', 'pousada', [['tourism', 'guest_house|hostel|chalet|camp_site']], ['pousada', 'hostel', 'albergue', 'chale', 'camping', 'hospedagem']),
  turismo: S('Agências de viagem e turismo', 'Hospedagem e turismo', 'agência de viagens', [['shop', 'travel_agency'], ['office', 'travel_agent|tour_operator|guide']], ['agencia de viagem', 'agencia de viagens', 'turismo', 'passagens', 'pacotes de viagem', 'receptivo']),

  // ---------- Pets ----------
  petshops: S('Pet shops', 'Pets', 'pet shop', [['shop', 'pet|pet_grooming']], ['pet shop', 'petshop', 'banho e tosa', 'racao', 'casa de racao', 'agropecuaria']),
  veterinarios: S('Veterinários', 'Pets', 'veterinário', [['amenity', 'veterinary']], ['veterinario', 'veterinaria', 'clinica veterinaria', 'hospital veterinario']),
  hotelpet: S('Hotel e creche pet', 'Pets', 'hotel para cães', [['amenity', 'animal_boarding|animal_training']], ['hotel pet', 'hotel para caes', 'creche pet', 'adestramento', 'adestrador']),

  // ---------- Eventos e entretenimento ----------
  eventos: S('Buffets e salões de festa', 'Eventos e entretenimento', 'salão de festas', [['amenity', 'events_venue|conference_centre'], ['shop', 'party']], ['buffet', 'salao de festas', 'espaco de eventos', 'eventos', 'cerimonial', 'festas infantis']),
  noturnos: S('Casas noturnas e shows', 'Eventos e entretenimento', 'casa noturna', [['amenity', 'nightclub|music_venue|karaoke_box']], ['balada', 'casa noturna', 'boate', 'casa de shows', 'karaoke']),
  cinemas: S('Cinemas e teatros', 'Eventos e entretenimento', 'cinema', [['amenity', 'cinema|theatre|arts_centre']], ['cinema', 'teatro', 'centro cultural']),
  diversao: S('Diversão e lazer', 'Eventos e entretenimento', 'centro de entretenimento', [['leisure', 'amusement_arcade|bowling_alley|escape_game|trampoline_park|water_park|playground|miniature_golf'], ['tourism', 'theme_park|zoo|aquarium']], ['boliche', 'escape room', 'fliperama', 'parque de diversoes', 'cama elastica', 'brinquedoteca', 'parque aquatico']),

  // ---------- Indústria e atacado ----------
  atacadistas: S('Atacadistas e distribuidoras', 'Indústria e atacado', 'atacadista', [['shop', 'wholesale'], ['office', 'wholesale|logistics']], ['atacado', 'atacadista', 'distribuidora', 'distribuidoras', 'revenda']),
  industrias: S('Indústrias e fábricas', 'Indústria e atacado', 'indústria', [['man_made', 'works'], ['craft', 'brewery|winery|distillery|confectionery|pottery|sawmill|stonemason']], ['industria', 'fabrica', 'fabricas', 'confeccao', 'confeccoes', 'cervejaria artesanal', 'marmoraria']),
  transportadoras: S('Transportadoras e logística', 'Indústria e atacado', 'transportadora', [['office', 'logistics|moving_company|courier'], ['amenity', 'post_office']], ['transportadora', 'logistica', 'mudancas', 'frete', 'fretes', 'motoboy', 'entregas', 'correios']),
  agro: S('Agropecuárias', 'Indústria e atacado', 'agropecuária', [['shop', 'agrarian|farm|feed']], ['agropecuaria', 'agro', 'produtos agricolas', 'sementes', 'adubos']),
}

// Todos os tipos de estabelecimento comercial (busca sem segmento)
export const ALL_BUSINESS = [
  ['shop', null], ['office', null], ['craft', null], ['healthcare', null],
  ['amenity', 'restaurant|fast_food|cafe|bar|pub|clinic|doctors|dentist|pharmacy|veterinary|bank|car_wash|fuel|language_school|driving_school|cinema|nightclub|ice_cream'],
  ['leisure', 'fitness_centre|sports_centre'], ['tourism', 'hotel|motel|guest_house|hostel'],
]

const normalize = s =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

// singular simples em português: "clinicas" -> "clinica", "hoteis" -> "hotel", "saloes" -> "salao"
const singular = w => w.replace(/oes$/, 'ao').replace(/aes$/, 'ao').replace(/eis$/, 'el').replace(/ais$/, 'al').replace(/ns$/, 'm').replace(/res$/, 'r').replace(/s$/, '')
const singularPhrase = t => t.split(' ').map(singular).join(' ')

// índice: chave, rótulo, sinônimos e suas formas no singular → segmento
const INDEX = new Map()
for (const [key, seg] of Object.entries(CATALOG)) {
  for (const name of [key, seg.label, seg.tt, ...seg.aliases]) {
    const n = normalize(name)
    if (!n) continue
    if (!INDEX.has(n)) INDEX.set(n, key)
    const s = singularPhrase(n)
    if (!INDEX.has(s)) INDEX.set(s, key)
  }
}

// "estetica" -> "[eéêè]st[eéêè]t[iíì]c[aáàâã]" para casar nomes acentuados no OSM
const ACCENTS = { a: '[aáàâãä]', e: '[eéêèë]', i: '[iíìîï]', o: '[oóòôõö]', u: '[uúùûü]', c: '[cç]', n: '[nñ]' }
const accentInsensitive = t => t.replace(/[aeioucn]/g, ch => ACCENTS[ch])

export function matchSegment(raw) {
  const t = normalize(raw)
  if (!t) return null
  return INDEX.get(t) || INDEX.get(singularPhrase(t)) || INDEX.get(t.replace(/ /g, '')) || null
}

export function resolveSegments(terms) {
  const resolved = []
  for (const raw of terms) {
    const t = normalize(raw)
    if (!t) continue
    const key = matchSegment(raw)
    if (key) {
      const seg = CATALOG[key]
      resolved.push({ term: raw, key, label: seg.label, tt: seg.tt, filters: seg.filters })
    } else {
      resolved.push({ term: raw, key: null, label: raw, keyword: accentInsensitive(t) })
    }
  }
  return resolved
}

export const catalogList = () =>
  Object.entries(CATALOG).map(([key, v]) => ({ key, label: v.label, group: v.group, aliases: v.aliases.slice(0, 6) }))
