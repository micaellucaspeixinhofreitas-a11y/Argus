// Conteúdo da página de apresentação — edite aqui sem mexer nos componentes.

export const contact = {
  // canal para pedidos de privacidade (LGPD) e exclusão de conta — troque pelo e-mail oficial
  email: 'contato@argus.dev', // TODO
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
  { value: 50, suffix: '', label: 'Buscas por mês no plano Pro' },
  { value: 5000, suffix: '', label: 'Empresas por mês no plano Pro' },
  { value: 150, suffix: '', label: 'Créditos por busca de 20 empresas' },
  { value: 0, suffix: '', label: 'Créditos para capturar e exportar' },
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
  { title: 'Sem duplicidade', text: 'A mesma empresa nunca aparece duas vezes, e empresas que já são seus leads não entram na conta da busca.' },
  { title: 'Créditos transparentes', text: 'Você vê quantos créditos tem e quanto cada busca vai custar antes de clicar.' },
  { title: 'Foco em prospecção', text: 'Não é um CRM inchado. A Argus faz uma coisa muito bem: encontrar quem pode virar seu cliente.' },
  { title: 'Exportação em CSV', text: 'Leve seus leads capturados para a planilha ou para a ferramenta que você já usa.' },
]

export const segmentsLoop = [
  'Clínicas', 'Restaurantes', 'Academias', 'Imobiliárias', 'Oficinas', 'Salões de beleza', 'Escritórios',
  'Dentistas', 'Pet shops', 'Hotéis', 'Farmácias', 'Contabilidade', 'Advogados', 'Escolas', 'Lojas',
]

export const faq = [
  { q: 'De onde vêm as empresas encontradas?', a: 'De bases de mapas e estabelecimentos (OpenStreetMap e parceiros como TomTom e Google, quando ativos). Cada empresa tem localização real e, quando cadastrados, telefone, site, e-mail, horário e redes sociais.' },
  { q: 'Como funcionam os créditos?', a: 'Cada busca traz até 100 empresas: 20 empresas = 150 créditos, 50 = 300 e 100 = 450. Você paga só pelas empresas novas que vierem, proporcionalmente, e nunca paga duas vezes pela mesma empresa. Capturar e exportar leads não consome créditos. O Gratuito dá para testar com 2 buscas de 20 empresas; o Pro faz cerca de 50 buscas de 100 empresas por mês.' },
  { q: 'Posso prospectar em várias regiões ao mesmo tempo?', a: 'Sim. Você marca quantas áreas quiser (até 10 por operação), cada uma com seu próprio raio, e a Argus junta tudo sem repetir empresas.' },
  { q: 'O que é a qualificação?', a: 'São critérios que você escolhe — como ter telefone, ter e-mail ou não ter website. A Argus dá uma nota para cada empresa com base nos dados encontrados e destaca as de alta aderência.' },
  { q: 'Funciona fora do Brasil?', a: 'Sim. Você escolhe o país e a busca de cidades, bairros e endereços passa a usar esse país como referência.' },
  { q: 'Como pago a assinatura?', a: 'Por Pix, em planos mensais ou trimestrais. Não há cobrança automática: o plano vale pelo período pago e você renova com um novo Pix quando quiser, pela própria plataforma (renovando antes do vencimento, os dias que faltam são somados).' },
]
