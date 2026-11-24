import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, fmtDate, fmtDateTime, fmtInt } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Credits() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const { setCredits } = useAuth()

  useEffect(() => {
    api('credits').then(d => { setData(d); setCredits(d.credits) }).catch(e => setError(e.message))
  }, [setCredits])

  if (error) return <div className="page"><p className="form-error">{error}</p></div>
  if (!data) return <div className="page"><p className="muted">Carregando…</p></div>
  const c = data.credits
  const max = Math.max(1, ...data.history.map(h => h.used))
  const monthPct = c.monthly_credits ? Math.min(100, (c.month_used / c.monthly_credits) * 100) : 0
  const dayPct = c.daily_limit ? Math.min(100, (c.today_used / c.daily_limit) * 100) : 0

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1>Créditos</h1>
          <p className="muted">Plano atual: <strong>{c.plan.name}</strong>. <Link to="/app/planos">Ver planos</Link></p>
        </div>
      </header>
      <div className="stat-grid">
        <div className="card stat-card">
            <small>Créditos disponíveis</small><strong>{fmtInt(c.available)}</strong><span className="muted">de {fmtInt(c.monthly_credits)} no mês</span></div>
        <div className="card stat-card">
            <small>Usados hoje</small><strong>{fmtInt(c.today_used)}</strong><span className="muted">limite diário de {fmtInt(c.daily_limit)}</span></div>
        <div className="card stat-card">
            <small>Usados no mês</small><strong>{fmtInt(c.month_used)}</strong><span className="muted">renova no dia 1º</span></div>
        <div className="card stat-card">
            <small>Pode capturar agora</small><strong>{fmtInt(c.can_spend)}</strong><span className="muted">leads novos</span></div>
      </div>
      <div className="card meters">
        <label>Mês <span>{fmtInt(c.month_used)} / {fmtInt(c.monthly_credits)}</span></label>
        <div className="meter"><i style={{ width: `${monthPct}%` }} /></div>
        <label>Hoje <span>{fmtInt(c.today_used)} / {fmtInt(c.daily_limit)}</span></label>
        <div className="meter"><i style={{ width: `${dayPct}%` }} /></div>
      </div>
      <div className="card rules">
        <h2>Como os créditos funcionam</h2>
        <ul>
          <li>1 crédito por <strong>novo</strong> lead capturado. Mapear, ver o radar e salvar buscas não consome créditos.</li>
          <li>Capturar de novo uma empresa que já é sua não cobra nada (deduplicação).</li>
          <li>Os créditos renovam todo dia 1º e o limite diário reinicia à meia-noite (horário de Brasília).</li>
          <li>A contagem é feita no servidor no momento da captura.</li>
        </ul>
      </div>
      <div className="card">
        <h2>Histórico de consumo</h2>
        {data.history.length === 0 ? <p className="muted">Nenhum consumo ainda.</p> : (
          <ul className="history">
            {data.history.map(h => (
              <li key={h.day}>
                <span>{fmtDate(h.day + 'T12:00:00')}</span>
                <span className="history__bar"><i style={{ width: `${(h.used / max) * 100}%` }} /></span>
                <strong>{fmtInt(h.used)}</strong>
                {h.granted > 0 && <small className="flag flag--fit">+{fmtInt(h.granted)} bônus</small>}
              </li>
            ))}
          </ul>
        )}
        {data.adjustments.length > 0 && (
          <>
            <h3>Ajustes</h3>
            <ul className="plain">
              {data.adjustments.map((a, i) => <li key={i}>{fmtDateTime(a.created_at)} — {a.amount > 0 ? '+' : ''}{a.amount} ({a.note || a.reason})</li>)}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
