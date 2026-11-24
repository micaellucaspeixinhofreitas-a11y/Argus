// Envio de e-mails transacionais pela API da Resend (https://resend.com).
// Configure RESEND_API_KEY e MAIL_FROM (ex.: "Argus <nao-responda@seudominio.com>").

export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM)

export async function sendMail({ to, subject, html, text }) {
  if (!mailConfigured()) {
    console.warn(JSON.stringify({ evt: 'mail_not_configured', subject }))
    return false
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html, text }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    console.error(JSON.stringify({ evt: 'mail_failed', status: res.status, body: (await res.text()).slice(0, 300) }))
    return false
  }
  return true
}
