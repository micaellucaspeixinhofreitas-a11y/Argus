// Conteúdo da página de apresentação — edite aqui sem mexer nos componentes.

export const contact = {
  whatsapp: '5500000000000', // TODO: seu número com DDI + DDD, só dígitos
  email: 'contato@argus.dev', // TODO
  instagram: 'https://instagram.com/', // TODO
  linkedin: 'https://linkedin.com/', // TODO
  github: 'https://github.com/', // TODO
}

export const nav = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Módulos', href: '#modulos' },
  { label: 'Radar', href: '#radar' },
  { label: 'Planos', href: '#planos' },
  { label: 'FAQ', href: '#faq' },
]

// Fatos reais da regra de créditos do plano Pro (configuráveis no painel admin)
export const stats = [
  { value: 7000, suffix: '', label: 'Créditos por mês no plano Pro' },
  { value: 700, suffix: '', label: 'Leads por dia, no máximo' },
  { value: 1, suffix: '', label: 'Crédito por novo lead capturado' },
  { value: 0, suffix: '', label: 'Cobrança por lead repetido' },
]

export const services = [
  {
    icon: 'target',
    title: 'Defina o alvo',
    text: 'Informe um ou vários segmentos — clínicas, academias, imobiliárias ou qualquer palavra-chave — escolha o país e a localidade.',
    tags: ['Múltiplos segmentos', 'Palavras-chave', 'Vários países'],
  },
  {
    icon: 'filter',
    title: 'Qualificação',
    text: 'Escolha os critérios que importam para você: tem telefone, tem e-mail, está sem website, sem redes sociais. A Argus classifica cada empresa.',
    tags: ['Critérios reais', 'Nota de aderência', 'Opcional'],
  },
  {
    icon: 'layers',
    title: 'Território',
    text: 'Marque várias áreas no mapa, cada uma com seu próprio raio em quilômetros. A busca respeita exatamente os limites definidos.',
    tags: ['Múltiplas áreas', 'Raio por área', 'Coordenadas salvas'],
  },
  {
    icon: 'map',
    title: 'Mapa de prospecção',
    text: 'Pesquise cidades, bairros e endereços, navegue pelo território e veja as empresas encontradas direto no mapa.',
    tags: ['Busca de endereços', 'Zoom', 'Pontos no mapa'],
  },
  {
    icon: 'radar',
    title: 'Radar de oportunidades',
    text: 'Indicadores de empresas mapeadas, de alta aderência e sem website, com prioridade para quem mais precisa do que você vende.',
    tags: ['Mapeadas', 'Alta aderência', 'Sem website'],
  },
  {
    icon: 'bookmark',
    title: 'Buscas salvas',
    text: 'Guarde segmento, país, localidade, qualificação, raio e áreas. Recupere e execute de novo quando quiser.',
    tags: ['Reutilizável', 'Histórico', 'Um clique'],
  },
]

export const steps = [
  { n: '01', title: 'Defina o alvo', text: 'Segmento, país e localidade. Pode deixar o segmento em branco para ver todo tipo de comércio da região.', time: 'Alvo' },
  { n: '02', title: 'Qualifique', text: 'Ative os critérios de aderência — por exemplo, empresas com telefone e sem website — e a nota mínima.', time: 'Opcional' },
  { n: '03', title: 'Delimite o território', text: 'Clique no mapa para criar áreas, ajuste o raio de cada uma e sincronize. Use quantas regiões precisar.', time: 'Mapa' },
  { n: '04', title: 'Mapeie e capture', text: 'A Argus consulta fontes reais, organiza os resultados sem duplicidade e você captura os leads que quiser.', time: 'Leads' },
]

export const differentials = [
  { title: 'Empresas reais', text: 'Nada de dados fictícios: cada resultado vem de fontes públicas de estabelecimentos, com coordenadas e contatos quando cadastrados.' },
  { title: 'Território sob controle', text: 'Várias áreas na mesma operação, cada uma com raio próprio. O que está fora do raio não entra.' },
  { title: 'Sem duplicidade', text: 'A mesma empresa nunca aparece duas vezes e um lead já capturado nunca é cobrado de novo.' },
  { title: 'Créditos transparentes', text: 'Você vê quantos créditos tem, quanto usou hoje e o limite diário antes de cada captura.' },
  { title: 'Foco em prospecção', text: 'Não é um CRM inchado. A Argus faz uma coisa muito bem: encontrar quem pode virar seu cliente.' },
  { title: 'Exportação em CSV', text: 'Leve seus leads capturados para a planilha ou para a ferramenta que você já usa.' },
]

export const segmentsLoop = [
  'Clínicas', 'Restaurantes', 'Academias', 'Imobiliárias', 'Oficinas', 'Salões de beleza', 'Escritórios',
  'Dentistas', 'Pet shops', 'Hotéis', 'Farmácias', 'Contabilidade', 'Advogados', 'Escolas', 'Lojas',
]

export const faq = [
  { q: 'De onde vêm as empresas encontradas?', a: 'De fontes públicas de dados geográficos (OpenStreetMap). Cada empresa tem localização real e, quando cadastrados, telefone, site, e-mail, horário e redes sociais. A arquitetura permite adicionar outros provedores, como o Google Places.' },
  { q: 'Como funcionam os créditos?', a: 'Mapear e consultar o radar não consome créditos. Cada novo lead capturado consome 1 crédito. No plano Pro são 7.000 créditos por mês, com limite de 700 por dia. Capturar de novo uma empresa que já é sua não cobra nada.' },
  { q: 'Posso prospectar em várias regiões ao mesmo tempo?', a: 'Sim. Você marca quantas áreas quiser (até 10 por operação), cada uma com seu próprio raio, e a Argus junta tudo sem repetir empresas.' },
  { q: 'O que é a qualificação?', a: 'São critérios que você escolhe — como ter telefone, ter e-mail ou não ter website. A Argus dá uma nota para cada empresa com base nos dados encontrados e destaca as de alta aderência.' },
  { q: 'Funciona fora do Brasil?', a: 'Sim. Você escolhe o país e a busca de cidades, bairros e endereços passa a usar esse país como referência.' },
  { q: 'Como pago a assinatura?', a: 'Por Pix ou cartão, em planos mensais ou trimestrais. Você acompanha a situação, a renovação e pode cancelar quando quiser pela própria plataforma.' },
]
