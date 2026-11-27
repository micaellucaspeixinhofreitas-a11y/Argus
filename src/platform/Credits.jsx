import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, fmtDate, fmtDateTime, fmtInt } from '../lib/api'
import { useAuth } from '../lib/auth'
import CountUp from '../components/CountUp'
import { PageSkeleton } from './Skeleton'

const REASONS = { search: 'Busca', admin_adjustment: 'Ajuste do administrador', lead: 'Captura (regra antiga)' }

export default function Credits() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const { setCredits } = useAuth()

  useEffect(() => {
    api('credits').then(d => { setData(d); setCredits(d.credits) }).catch(e => setError(e.message))
  }, [setCredits])

  if (error) return <div className="page"><p className="form-error">{error}</p></div>
  if (!data) return <PageSkeleton cards={4} rows={2} />
  const c = data.credits
  const max = Math.max(1, ...data.history.map(h => h.used))
  const monthPct = c.monthly_credits ? Math.min(100, (c.month_used / c.monthly_credits) * 100) : 0
  const dayPct = c.daily_limit ? Math.min(100, (c.today_used / c.daily_limit) * 100) : 0

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <img className="page__icon" src="/icons/moeda.webp" alt="" width="56" height="56" /><p className="eyebrow">// Créditos</p><h1>Seus <span className="grad">créditos</span></h1>
          <p className="muted">Plano atual: <strong>{c.plan.name}</strong>. <Link to="/app/planos">Ver planos</Link></p>
        </div>
      </header>
      <div className="stat-grid">
        <div className="card stat-card">
            <small>Créditos disponíveis</small><strong><CountUp value={c.available} /></strong><span className="muted">de {fmtInt(c.monthly_credits)} no mês</span></div>
        <div className="card stat-card">
            <small>Buscas hoje</small><strong><CountUp value={c.today_used} /></strong><span className="muted">limite de {fmtInt(c.daily_limit)} por dia</span></div>
        <div className="card stat-card">
            <small>Créditos usados no mês</small><strong><CountUp value={c.month_used} /></strong><span className="muted">renova em {c.renews_at ? fmtDate(c.renews_at) : "—"}</span></div>
        <div className="card stat-card">
            <small>Buscas de 20 empresas</small><strong><CountUp value={c.searches_available ?? 0} /></strong><span className="muted">possíveis com o saldo</span></div>
      </div>
      <div className="card meters">
        <label>Mês <span>{fmtInt(c.month_used)} / {fmtInt(c.monthly_credits)}</span></label>
        <div className="meter"><i style={{ width: `${monthPct}%` }} /></div>
        <label>Buscas hoje <span>{fmtInt(c.today_used)} / {fmtInt(c.daily_limit)}</span></label>
        <div className="meter"><i style={{ width: `${dayPct}%` }} /></div>
      </div>
      <div className="card rules">
        <h2 className="h2-icon"><img className="h2-ic" src="/icons/lupa.webp" alt="" width="24" height="24" /> Como os créditos funcionam</h2>
        <ul>
          <li>Cada <strong>busca</strong> traz até 100 empresas. O preço segue a tabela:
            <span className="tier-list">{(c.tiers || []).map(t => <span key={t.max}><b>{t.max}</b> empresas = {fmtInt(t.cost)} créditos</span>)}</span>
          </li>
          <li>Você paga só pelas empresas <strong>novas</strong> que vierem, proporcionalmente (ex.: 30 empresas = 200 créditos). Empresas que você já recebeu em outra busca vêm junto sem custo, e busca sem nenhuma empresa nova não cobra nada.</li>
          <li>Toda busca conta no limite de buscas por dia do seu plano.</li>
          <li>Capturar leads, ver o radar, salvar buscas e exportar não consomem créditos.</li>
          <li>Os créditos do plano renovam todo mês (no plano grátis, no dia 1º; nos planos pagos, no dia em que a assinatura começou) — próxima renovação em <strong>{c.renews_at ? fmtDate(c.renews_at) : '—'}</strong>. Créditos não usados não acumulam. O limite de buscas por dia reinicia à meia-noite (horário de Brasília).</li>
        </ul>
      </div>
      <div className="card">
        <h2 className="h2-icon"><img className="h2-ic" src="/icons/calendario.webp" alt="" width="24" height="24" /> Histórico de consumo</h2>
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
            <h3>Últimas movimentações</h3>
            <ul className="plain">
              {data.adjustments.map((a, i) => <li key={i}>{fmtDateTime(a.created_at)} — <strong>{a.amount > 0 ? '+' : ''}{fmtInt(a.amount)}</strong> · {REASONS[a.reason] || a.reason}{a.note ? ` (${a.note})` : ''}</li>)}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
