import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { LuCopy, LuCheck, LuQrCode } from 'react-icons/lu'
import { api, money } from '../lib/api'
import { useAuth } from '../lib/auth'

// Pagamento por Pix (QR Code + Copia e Cola), exibido dentro da tela de planos
export default function Payment({ planId = 'pro', period = 'monthly', couponCode = '', onActivated }) {
  const { refresh } = useAuth()
  const [data, setData] = useState(null)
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [reported, setReported] = useState(false)

  // gera (ou reaproveita) o pedido e o QR Code
  useEffect(() => {
    setData(null); setQr(''); setError('')
    api('payment/pix', { method: 'POST', body: { planId, period, couponCode } })
      .then(async d => {
        // cupom de 100%: o plano já foi liberado
        if (d.activated) { await refresh(); onActivated?.(d.plan); return }
        setData(d)
        setReported(Boolean(d.subscription.payment_reported_at))
        setQr(await QRCode.toDataURL(d.payload, { width: 320, margin: 1, color: { dark: '#0b0914', light: '#ffffff' } }))
      })
      .catch(e => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, period, couponCode])

  // confere se ESTE pedido foi confirmado (Pix automático: a cada 5 s; manual: a cada 15 s)
  const subId = data?.subscription?.id
  useEffect(() => {
    if (!subId) return
    const t = setInterval(async () => {
      try {
        const s = await api('payment/check', { method: 'POST', body: { subscriptionId: subId } })
        if (s.status === 'active') { clearInterval(t); await refresh(); onActivated?.(data.plan) }
      } catch { /* tenta de novo */ }
    }, data?.automatic ? 5000 : 15000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subId])

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
              {data.discount_cents > 0 && <s className="muted">{money(data.price_cents)}</s>}
              <strong>{money(data.amount_cents)}</strong>
              {data.coupon && <span className="flag flag--fit">Cupom {data.coupon.code} · {data.coupon.label}</span>}
              {data.receiver && <span className="muted">Recebedor: {data.receiver}</span>}
              <span className="muted">Pedido: {data.subscription.payment_reference}</span>
              {data.expires_at && <span className="muted">Válido até {new Date(data.expires_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
            </div>
            <label className="field">
              <span>Pix Copia e Cola</span>
              <textarea readOnly rows="4" value={data.payload} onFocus={e => e.target.select()} />
            </label>
            <button className="btn btn--ghost btn--sm" onClick={copy}>{copied ? <><LuCheck /> Copiado</> : <><LuCopy /> Copiar código</>}</button>
            {data.automatic ? (
              <>
                <ol className="pay__steps">
                  <li>Pague pelo QR Code ou pelo código Copia e Cola no app do seu banco.</li>
                  <li>A confirmação é automática: em poucos segundos o plano {data.plan.name} é liberado nesta tela.</li>
                </ol>
                <p className="form-notice notice-icon"><img src="/icons/relogio.webp" alt="" width="26" height="26" /> <span>Aguardando o pagamento… pode deixar esta página aberta.</span></p>
              </>
            ) : <>
            <ol className="pay__steps">
              <li>Pague o valor exato pelo QR Code ou pelo código Copia e Cola.</li>
              <li>Clique em <strong>Já paguei</strong> para registrar o pagamento.</li>
              <li>Após a confirmação, o plano {data.plan.name} é liberado automaticamente nesta tela.</li>
            </ol>
            {reported
              ? <p className="form-notice notice-icon"><img src="/icons/sino.webp" alt="" width="26" height="26" /> <span>Recebemos seu aviso de pagamento. A liberação acontece assim que o Pix for confirmado — esta página atualiza sozinha.</span></p>
              : <button className="btn btn--primary btn--block" onClick={report}>Já paguei</button>}
            </>}
          </div>
        </div>
      )}
    </>
  )
}
