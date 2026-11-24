import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { LuCopy, LuCheck, LuQrCode } from 'react-icons/lu'
import { api, money } from '../lib/api'
import { useAuth } from '../lib/auth'

// Pagamento por Pix (QR Code + Copia e Cola), exibido dentro da tela de planos
export default function Payment({ planId = 'pro', period = 'monthly' }) {
  const { pro, refresh } = useAuth()
  const [data, setData] = useState(null)
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [reported, setReported] = useState(false)

  // gera (ou reaproveita) o pedido e o QR Code
  useEffect(() => {
    if (pro) return
    setData(null); setQr(''); setError('')
    api('payment/pix', { method: 'POST', body: { planId, period } })
      .then(async d => {
        setData(d)
        setReported(Boolean(d.subscription.payment_reported_at))
        setQr(await QRCode.toDataURL(d.payload, { width: 320, margin: 1, color: { dark: '#0b0914', light: '#ffffff' } }))
      })
      .catch(e => setError(e.message))
  }, [planId, period, pro])

  // confere a liberação do plano a cada 15 s
  useEffect(() => {
    if (pro) return
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [pro, refresh])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Não foi possível copiar. Selecione o código e copie manualmente.')
    }
  }
  const report = async () => {
    try {
      await api('payment/reported', { method: 'POST', body: { subscriptionId: data.subscription.id } })
      setReported(true)
    } catch (e) { setError(e.message) }
  }

  if (pro) return null

  return (
    <>
      {error && <p className="form-error">{error}</p>}
      {!data && !error && <p className="muted">Gerando seu QR Code…</p>}
      {data && (
        <div className="pay">
          <div className="card pay__qr">
            {qr ? <img src={qr} alt="QR Code Pix para pagamento" width="320" height="320" /> : <LuQrCode />}
            <small className="muted">Abra o app do seu banco, escolha <strong>Pix → Ler QR Code</strong> e aponte a câmera.</small>
          </div>
          <div className="card pay__info">
            <div className="pay__amount">
              <small>Plano {data.plan.name} · {data.period === 'quarterly' ? 'trimestral' : 'mensal'}</small>
              <strong>{money(data.amount_cents)}</strong>
              <span className="muted">Recebedor: {data.receiver}</span>
              <span className="muted">Pedido: {data.subscription.payment_reference}</span>
            </div>
            <label className="field">
              <span>Pix Copia e Cola</span>
              <textarea readOnly rows="4" value={data.payload} onFocus={e => e.target.select()} />
            </label>
            <button className="btn btn--ghost btn--sm" onClick={copy}>{copied ? <><LuCheck /> Copiado</> : <><LuCopy /> Copiar código</>}</button>
            <ol className="pay__steps">
              <li>Pague o valor exato pelo QR Code ou pelo código Copia e Cola.</li>
              <li>Clique em <strong>Já paguei</strong> para avisar a equipe.</li>
              <li>Após a confirmação, o plano Pro é liberado automaticamente nesta tela.</li>
            </ol>
            {reported
              ? <p className="form-notice">Recebemos seu aviso de pagamento. A liberação acontece assim que o Pix for confirmado — esta página atualiza sozinha.</p>
              : <button className="btn btn--primary btn--block" onClick={report}>Já paguei</button>}
          </div>
        </div>
      )}
    </>
  )
}
