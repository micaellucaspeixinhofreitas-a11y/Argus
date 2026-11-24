// Gera o "Pix Copia e Cola" (BR Code estático, padrão EMV do Banco Central).
// Configuração: PIX_KEY (chave Pix), PIX_NAME (nome do recebedor) e PIX_CITY (cidade).
// Pix estático não confirma o pagamento sozinho: o administrador confere e ativa o plano.

const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`

const clean = (s, max) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .\-]/g, '')
    .trim()
    .slice(0, max)
    .toUpperCase()

function crc16(payload) {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export const pixConfigured = () => Boolean(process.env.PIX_KEY && process.env.PIX_NAME && process.env.PIX_CITY)

export function pixPayload({ amountCents, txid, description }) {
  const key = String(process.env.PIX_KEY).trim()
  const account = field('00', 'br.gov.bcb.pix') + field('01', key) + (description ? field('02', clean(description, 40)) : '')
  let payload =
    field('00', '01') +
    field('26', account) +
    field('52', '0000') +
    field('53', '986') +
    field('54', (amountCents / 100).toFixed(2)) +
    field('58', 'BR') +
    field('59', clean(process.env.PIX_NAME, 25)) +
    field('60', clean(process.env.PIX_CITY, 15)) +
    field('62', field('05', String(txid).replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***'))
  payload += '6304'
  return payload + crc16(payload)
}

export const _crc16 = crc16
