// Conteúdo da página de apresentação — edite aqui sem mexer nos componentes.

export const contact = {
  // canal para pedidos de privacidade (LGPD) e exclusão de conta — troque pelo e-mail oficial
  email: 'contato@argus.dev', // TODO
}

export const nav = [
  { label: 'Demonstração', href: '#demo' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Planos', href: '#planos' },
  { label: 'FAQ', href: '#faq' },
]

// Fatos reais da plataforma (limites e catálogo atuais)
export const stats = [
  { value: 100, suffix: '', label: 'empresas por busca' },
  { value: 5000, suffix: '', label: 'empresas por mês no Pro' },
  { value: 119, suffix: '', label: 'categorias de negócio' },
  { value: 10, suffix: '', label: 'áreas no mapa por busca' },
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
  { q: 'Como pago a assinatura?', a: 'Por Pix, em planos mensais ou trimestrais. A confirmação é automática: pagou, o plano é liberado em segundos. Não há cobrança recorrente: o plano vale pelo período pago e você renova com um novo Pix quando quiser, pela própria plataforma (renovando antes do vencimento, os dias que faltam são somados).' },
]
