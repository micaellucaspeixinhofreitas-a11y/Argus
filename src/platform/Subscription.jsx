import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LuCheck } from 'react-icons/lu'
import { api, money, fmtDate, fmtInt } from '../lib/api'
import { useAuth } from '../lib/auth'
import Glass from '../components/Glass'

const STATUS = {
  pending_payment: 'Aguardando pagamento',
  active: 'Ativa',
  canceled: 'Cancelada',
  expired: 'Expirada',
}

export default function Subscription() {
  const { refresh } = useAuth()
  const [plans, setPlans] = useState([])
  const [state, setState] = useState(null)
  const [period, setPeriod] = useState('monthly')
  const [method, setMethod] = useState('pix')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => Promise.all([api('plans'), api('subscription')]).then(([p, s]) => { setPlans(p.plans); setState(s) }).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const subscribe = async plan => {
    setBusy(true); setError(''); setMessage('')
    try {
      const d = await api('subscription', { method: 'POST', body: { planId: plan.id, period, paymentMethod: method } })
      setState(d)
      if (d.checkout?.checkout_url) window.location.href = d.checkout.checkout_url
      else setMessage(d.checkout?.message || 'Assinatura registrada.')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
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
          <h1>Plano e assinatura</h1>
          <p className="muted">Compare limites, escolha a periodicidade e acompanhe sua assinatura.</p>
        </div>
      </header>

      <div className="card has-glass sub-status">
            <Glass radius={18} />
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
            <article key={p.id} className={`card plan-card ${isCurrent ? 'is-current' : ''}`}>
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
                : <Link className="btn btn--primary btn--sm btn--block" to={`/app/pagamento?plano=${p.id}&periodo=${period === 'quarterly' ? 'trimestral' : 'mensal'}`}>Assinar com Pix</Link>}
            </article>
          )
        })}
      </div>
    </div>
  )
}
