// Cliente da API (mesma origem; cookies de sessão httpOnly).
export class ApiError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api/${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* resposta sem JSON */
  }
  if (!res.ok) throw new ApiError(res.status, data?.error || `Erro ${res.status}`, data?.code)
  return data
}

export const money = cents =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: cents % 100 ? 2 : 0 })

export const fmtDate = d => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')
export const fmtDateTime = d => (d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—')
export const fmtInt = n => Number(n || 0).toLocaleString('pt-BR')
