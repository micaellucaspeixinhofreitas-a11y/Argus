// Pix automático pelo Mercado Pago (API de pagamentos v1).
// Requer MP_ACCESS_TOKEN (Access Token de produção, guardado como variável secreta na Vercel).
// O webhook só recebe o id do pagamento: o status é sempre conferido direto na API do Mercado Pago.

const BASE = 'https://api.mercadopago.com'

export const mpConfigured = () => Boolean(process.env.MP_ACCESS_TOKEN)

async function mp(path, { method = 'GET', body, idempotencyKey } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(`Mercado Pago ${res.status}: ${data.message || data.error || 'erro'}`)
    err.status = res.status
    err.detail = data
    throw err
  }
  return data
}

// data no formato que o Mercado Pago aceita (com fuso de Brasília)
const brDate = d => {
  const t = new Date(d.getTime() - 3 * 3600_000)
  return t.toISOString().replace('Z', '-03:00')
}

// Cria uma cobrança Pix e devolve o "copia e cola", o id e a validade
export async function createPixPayment({ amountCents, description, email, name, reference, notificationUrl, idempotencyKey, hours = 24 }) {
  const expires = new Date(Date.now() + hours * 3600_000)
  const [first, ...rest] = String(name || '').trim().split(/\s+/)
  const p = await mp('/v1/payments', {
    method: 'POST',
    idempotencyKey,
    body: {
      transaction_amount: Math.round(amountCents) / 100,
      description,
      payment_method_id: 'pix',
      external_reference: reference,
      ...(notificationUrl && /^https:\/\//.test(notificationUrl) ? { notification_url: notificationUrl } : {}),
      date_of_expiration: brDate(expires),
      payer: { email, ...(first ? { first_name: first } : {}), ...(rest.length ? { last_name: rest.join(' ') } : {}) },
    },
  })
  const td = p.point_of_interaction?.transaction_data || {}
  if (!td.qr_code) throw new Error('Mercado Pago não devolveu o código Pix.')
  return { id: String(p.id), status: p.status, payload: td.qr_code, ticketUrl: td.ticket_url || null, expiresAt: p.date_of_expiration || expires.toISOString() }
}

export async function getPayment(id) {
  const p = await mp(`/v1/payments/${encodeURIComponent(String(id))}`)
  return {
    id: String(p.id),
    status: p.status, // pending | approved | rejected | cancelled | refunded | charged_back | in_process ...
    reference: p.external_reference || '',
    amountCents: Math.round(Number(p.transaction_amount || 0) * 100),
    method: p.payment_method_id,
  }
}
