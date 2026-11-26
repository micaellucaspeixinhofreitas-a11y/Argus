import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LuCheck, LuQrCode } from 'react-icons/lu'
import { api, money, fmtDate, fmtInt } from '../lib/api'
import { useAuth } from '../lib/auth'
import Payment from './Payment'
import { planIcon } from '../lib/planIcon'

const STATUS = {
  pending_payment: 'Aguardando pagamento',
  active: 'Ativa',
  canceled: 'Cancelada',
  expired: 'Expirada',
}

export default function Subscription() {
  const { refresh, pro } = useAuth()
  const [params] = useSearchParams()
  const [plans, setPlans] = useState([])
  const [state, setState] = useState(null)
  const [period, setPeriod] = useState(params.get('periodo') === 'trimestral' ? 'quarterly' : 'monthly')
  // plano escolhido para pagar (abre o Pix logo abaixo dos planos)
  const [checkout, setCheckout] = useState(params.get('plano') && params.get('plano') !== 'gratuito' ? params.get('plano') : null)
  const checkoutRef = useRef(null)
  // cupom de desconto
  const [couponInput, setCouponInput] = useState(params.get('cupom') || '')
  const [coupon, setCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [checking, setChecking] = useState(false)
  const applyCoupon = async (code = couponInput) => {
    if (!code.trim() || !checkout) return
    setChecking(true); setCouponError('')
    try {
      setCoupon(await api('coupons/check', { method: 'POST', body: { code, planId: checkout, period } }))
    } catch (e) {
      setCoupon(null); setCouponError(e.message)
    } finally { setChecking(false) }
  }
  // o cupom vale para um plano/período específico: revalida quando eles mudam
  useEffect(() => {
    if (coupon) applyCoupon(coupon.code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout, period])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (checkout && state) setTimeout(() => checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [checkout, Boolean(state)])

  const load = () => Promise.all([api('plans'), api('subscription')]).then(([p, s]) => { setPlans(p.plans); setState(s) }).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const cancel = async resume => {
    if (!resume && !window.confirm('Cancelar a renovação? Você mantém o plano até o fim do período atual.')) return
    setBusy(true)
    try { setState(await api('subscription/cancel', { method: 'POST', body: { resume } })); refresh() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  if (!state) return <div className="page">{error ? <p className="form-error">{error}</p> : <p className="muted">Carregando…</p>}</div>
  const current = state.current
  const latest = state.subscriptions[0]

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <img className="page__icon" src="/icons/coroa.webp" alt="" width="56" height="56" /><p className="eyebrow">// Planos</p><h1>Plano e <span className="grad">assinatura</span></h1>
          <p className="muted">Compare limites, escolha a periodicidade, pague com Pix e acompanhe sua assinatura.</p>
        </div>
      </header>

      <div className="card sub-status">
        <img className="sub-status__icon" src={planIcon(current)} alt="" width="48" height="48" />
        <div>
          <small>Plano em uso</small>
          <strong>{current.name}</strong>
          <span className="muted">{fmtInt(current.monthly_credits)} créditos/mês · até {fmtInt(current.daily_limit)} leads/dia</span>
        </div>
        {latest && (
          <div>
            <small>Última assinatura</small>
            <strong>{latest.plan_name} · {latest.period === 'quarterly' ? 'Trimestral' : 'Mensal'}</strong>
            <span className={`flag ${latest.status === 'active' ? 'flag--fit' : latest.status === 'pending_payment' ? 'flag--noweb' : ''}`}>{STATUS[latest.status]}</span>
            {latest.status === 'active' && (
              <span className="muted">
                {latest.cancel_at_period_end ? `Encerra em ${fmtDate(latest.current_period_end)}` : `Renova em ${fmtDate(latest.current_period_end)}`}
              </span>
            )}
          </div>
        )}
        {latest?.status === 'active' && (
          <button className="btn-mini" disabled={busy} onClick={() => cancel(latest.cancel_at_period_end)}>
            {latest.cancel_at_period_end ? 'Reativar renovação' : 'Cancelar renovação'}
          </button>
        )}
        {latest?.status === 'pending_payment' && <button className="btn-mini" disabled={busy} onClick={() => cancel(false)}>Desistir</button>}
      </div>

      {message && <p className="form-notice">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <div className="sub-opts">
        <div className="period-toggle">
          <button className={period === 'monthly' ? 'is-on' : ''} onClick={() => setPeriod('monthly')}>Mensal</button>
          <button className={period === 'quarterly' ? 'is-on' : ''} onClick={() => setPeriod('quarterly')}>Trimestral</button>
        </div>

      </div>

      <div className="plan-grid">
        {plans.map(p => {
          const free = !p.price_monthly_cents && !p.price_quarterly_cents
          const cents = period === 'quarterly' ? p.price_quarterly_cents : p.price_monthly_cents
          const isCurrent = current.id === p.id
          return (
            <article key={p.id} className={`card plan-card ${isCurrent ? "is-current" : ""} ${free ? "" : "is-featured"}`}>
              <img className="plan-card__icon" src={planIcon(p)} alt="" width="52" height="52" />
              <h3>{p.name}</h3>
              <p className="muted">{p.description}</p>
              <div className="plan-card__price">{free ? 'Grátis' : money(cents)}<small>{free ? '' : period === 'quarterly' ? '/trimestre' : '/mês'}</small></div>
              <ul className="plain">
                <li><LuCheck /> {fmtInt(p.monthly_credits)} créditos por mês</li>
                <li><LuCheck /> Até {fmtInt(p.daily_limit)} leads por dia</li>
                {(p.features || []).filter(f => !/créditos por mês|leads por dia/i.test(f)).map(f => <li key={f}><LuCheck /> {f}</li>)}
              </ul>
              {isCurrent ? <span className="flag flag--fit">Plano atual</span>
                : free ? <span className="muted small">Disponível sem assinatura</span>
                : pro ? <span className="muted small">Você já tem um plano pago ativo</span>
                : <button className="btn btn--primary btn--sm btn--block" onClick={() => setCheckout(p.id)}><LuQrCode /> Assinar com Pix</button>}
            </article>
          )
        })}
      </div>

      {checkout && !pro && (
        <section className="checkout" ref={checkoutRef}>
          <div className="checkout__head">
            <div>
              <h2>Pagamento · {plans.find(p => p.id === checkout)?.name || 'Pro'} {period === 'quarterly' ? 'trimestral' : 'mensal'}</h2>
              <p className="muted">Pague com Pix pelo QR Code. Assim que o pagamento for confirmado, seu acesso é liberado.</p>
            </div>
            <button className="btn-mini" onClick={() => setCheckout(null)}>Fechar</button>
          </div>
          <form className="coupon" onSubmit={e => { e.preventDefault(); applyCoupon() }}>
            <label className="field">
              <span className="coupon__label"><img src="/icons/cupom.webp" alt="" width="22" height="22" /> Cupom de desconto</span>
              <div className="coupon__row">
                <input value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} placeholder="Ex.: LANCAMENTO20" autoComplete="off" />
                {coupon
                  ? <button type="button" className="btn-mini" onClick={() => { setCoupon(null); setCouponInput('') }}>Remover</button>
                  : <button className="btn-mini" disabled={checking || !couponInput.trim()}>{checking ? 'Verificando…' : 'Aplicar'}</button>}
              </div>
            </label>
            {coupon && (
              <p className="form-notice">
                Cupom <strong>{coupon.code}</strong> aplicado: {coupon.label}. De <s>{money(coupon.price_cents)}</s> por <strong>{money(coupon.amount_cents)}</strong>
                {coupon.amount_cents === 0 ? ' — o plano é liberado sem pagamento.' : '.'}
              </p>
            )}
            {couponError && <p className="form-error">{couponError}</p>}
          </form>
          <Payment planId={checkout} period={period} couponCode={coupon?.code || ''} />
        </section>
      )}
    </div>
  )
}
