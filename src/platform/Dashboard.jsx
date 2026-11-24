import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LuArrowUpRight, LuArrowDownRight, LuMinus, LuPlus, LuDownload, LuChevronRight, LuPhone } from 'react-icons/lu'
import { api, fmtInt, fmtDate, fmtDateTime } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useProspect, emptyConfig } from './Platform'

const PERIODS = [[7, '7 dias'], [30, '30 dias'], [90, '90 dias']]
const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0)
const shortDay = d => new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')

// Variação em relação ao período anterior de mesmo tamanho
function Delta({ now, before }) {
  if (!before && !now) return <span className="delta delta--flat"><LuMinus /> sem dados anteriores</span>
  if (!before) return <span className="delta delta--up"><LuArrowUpRight /> novo no período</span>
  const d = Math.round(((now - before) / before) * 100)
  if (d === 0) return <span className="delta delta--flat"><LuMinus /> igual ao período anterior</span>
  return (
    <span className={`delta ${d > 0 ? 'delta--up' : 'delta--down'}`}>
      {d > 0 ? <LuArrowUpRight /> : <LuArrowDownRight />} {d > 0 ? '+' : ''}{d}% vs. período anterior
    </span>
  )
}

function Kpi({ icon, label, value, foot }) {
  return (
    <div className="card kpi">
      <img className="kpi__icon" src={`/icons/${icon}.webp`} alt="" width="44" height="44" />
      <div className="kpi__body">
        <small>{label}</small>
        <strong>{value}</strong>
        {foot}
      </div>
    </div>
  )
}

// Gráfico de barras por dia (uma série por vez), com dica ao passar o mouse
function DailyBars({ series, metric }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...series.map(d => d[metric]))
  const nice = max <= 4 ? 4 : Math.ceil(max / 4) * 4
  const ticks = [nice, nice / 2, 0]
  const every = series.length > 45 ? 15 : series.length > 14 ? 5 : 1
  const label = metric === 'leads' ? 'lead(s)' : 'mapeamento(s)'
  return (
    <div className="bars" onMouseLeave={() => setHover(null)}>
      <div className="bars__grid" aria-hidden="true">
        {ticks.map(t => <div key={t} className="bars__tick"><span>{fmtInt(t)}</span></div>)}
      </div>
      <div className="bars__plot" role="img" aria-label={`Gráfico de ${label} por dia`}>
        {series.map((d, i) => (
          <div key={d.day} className={`bars__col ${hover === i ? 'is-hover' : ''}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}>
            <i style={{ height: `${(d[metric] / nice) * 100}%` }} className={d[metric] ? '' : 'is-zero'} />
            {(i % every === 0 || i === series.length - 1) && (
              <span className={`bars__x ${i === 0 || i === series.length - 1 || i === Math.floor(series.length / 2) ? 'is-key' : ''}`}>{shortDay(d.day)}</span>
            )}
          </div>
        ))}
        {hover != null && (
          <div className="bars__tip" style={{ left: `${((hover + 0.5) / series.length) * 100}%` }}>
            <strong>{fmtInt(series[hover][metric])}</strong> {label}
            <small>{new Date(`${series[hover].day}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' })}</small>
          </div>
        )}
      </div>
    </div>
  )
}

function BarList({ rows, empty }) {
  if (!rows.length) return <p className="muted small">{empty}</p>
  const max = Math.max(...rows.map(r => r.n))
  return (
    <ul className="barlist">
      {rows.map(r => (
        <li key={r.label}>
          <span className="barlist__fill" style={{ width: `${(r.n / max) * 100}%` }} />
          <span className="barlist__label">{r.label}</span>
          <strong>{fmtInt(r.n)}</strong>
        </li>
      ))}
    </ul>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { setConfig, setResult } = useProspect()
  const navigate = useNavigate()
  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState('leads')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`dashboard?dias=${days}`).then(setData).catch(e => setError(e.message))
  }, [days])

  const newProspect = () => { setConfig(emptyConfig()); setResult(null); navigate('/app/prospectar') }
  const hello = useMemo(() => {
    const h = new Date().getHours()
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  }, [])
  const firstName = (user.name || '').trim().split(/\s+/)[0]

  if (error) return <div className="page"><p className="form-error">{error}</p></div>
  if (!data) return <div className="page"><p className="muted">Carregando seu dashboard…</p></div>

  const { totals: t, previous: p, quality: q, credits: c } = data
  const periodSum = data.series.reduce((s, d) => s + d[metric], 0)
  const empty = !t.runs && !t.leads

  return (
    <div className="page dash">
      <header className="page__head">
        <div>
          <img className="page__icon" src="/icons/grafico.webp" alt="" width="56" height="56" />
          <h1>{hello}{firstName ? `, ${firstName}` : ''}</h1>
          <p className="muted">Tudo o que você já produziu na Argus: mapeamentos, leads, qualidade e créditos.</p>
        </div>
        <div className="dash__actions">
          <div className="period-toggle" role="group" aria-label="Período">
            {PERIODS.map(([d, l]) => <button key={d} className={days === d ? 'is-on' : ''} onClick={() => setDays(d)}>{l}</button>)}
          </div>
          <button className="btn btn--primary btn--sm" onClick={newProspect}><LuPlus /> Nova prospecção</button>
        </div>
      </header>

      {empty && (
        <div className="card dash__welcome">
          <img src="/icons/foguete.webp" alt="" width="96" height="96" />
          <div>
            <h2>Comece sua primeira prospecção</h2>
            <ol>
              <li>Escolha o segmento e a cidade.</li>
              <li>Marque as áreas no mapa.</li>
              <li>Capture as empresas que interessam — elas aparecem aqui com os números.</li>
            </ol>
          </div>
          <button className="btn btn--primary" onClick={newProspect}>Mapear minha região</button>
        </div>
      )}

      <section className="dash__kpis">
        <Kpi icon="chat" label={`Leads capturados · ${days} dias`} value={fmtInt(t.leads_period)} foot={<Delta now={t.leads_period} before={p.leads} />} />
        <Kpi icon="pino" label={`Mapeamentos · ${days} dias`} value={fmtInt(t.runs_period)} foot={<Delta now={t.runs_period} before={p.runs} />} />
        <Kpi icon="dados" label="Empresas mapeadas (total)" value={fmtInt(t.mapped)} foot={<span className="delta delta--flat">{fmtInt(t.leads)} capturadas · {pct(t.leads, t.mapped)}% de aproveitamento</span>} />
        <Kpi icon="raio" label="Créditos disponíveis" value={fmtInt(c.available)} foot={<span className="delta delta--flat">{fmtInt(t.credits_period)} usados em {days} dias · {c.plan?.name}</span>} />
      </section>

      <section className="dash__row dash__row--main">
        <div className="card dash__chart">
          <div className="dash__card-head">
            <div>
              <h2>{metric === 'leads' ? 'Leads capturados por dia' : 'Mapeamentos por dia'}</h2>
              <p className="muted small">{fmtInt(periodSum)} nos últimos {days} dias</p>
            </div>
            <div className="seg-tabs">
              <button className={metric === 'leads' ? 'is-on' : ''} onClick={() => setMetric('leads')}>Leads</button>
              <button className={metric === 'runs' ? 'is-on' : ''} onClick={() => setMetric('runs')}>Mapeamentos</button>
            </div>
          </div>
          <DailyBars series={data.series} metric={metric} />
        </div>

        <div className="card dash__quality">
          <div className="dash__card-head"><h2>Qualidade dos leads</h2></div>
          {q.total ? (
            <ul className="meters-list">
              {[
                ['Com telefone', q.phone, 'Contato direto disponível'],
                ['Alta aderência', q.high_fit, 'Atendem aos seus critérios'],
                ['Sem website', q.no_website, 'Oportunidade de presença digital'],
                ['Com e-mail', q.email, 'Endereço de e-mail encontrado'],
              ].map(([l, n, hint]) => (
                <li key={l}>
                  <div><span>{l}</span><strong>{pct(n, q.total)}%</strong></div>
                  <span className="meter"><i style={{ width: `${pct(n, q.total)}%` }} /></span>
                  <small>{fmtInt(n)} de {fmtInt(q.total)} · {hint}</small>
                </li>
              ))}
            </ul>
          ) : <p className="muted small">Capture leads para ver a qualidade dos contatos.</p>}
        </div>
      </section>

      <section className="dash__row">
        <div className="card">
          <div className="dash__card-head"><h2>Segmentos mais buscados</h2></div>
          <BarList rows={data.segments} empty="Nenhum segmento pesquisado ainda." />
        </div>
        <div className="card">
          <div className="dash__card-head"><h2>Cidades dos seus leads</h2></div>
          <BarList rows={data.cities} empty="Sem leads capturados ainda." />
        </div>
        <div className="card">
          <div className="dash__card-head"><h2>Tipos de empresa</h2></div>
          <BarList rows={data.categories.map(r => ({ ...r, label: r.label.replace(/_/g, ' ') }))} empty="Sem leads capturados ainda." />
        </div>
      </section>

      <section className="dash__row dash__row--two">
        <div className="card">
          <div className="dash__card-head">
            <h2>Últimos mapeamentos</h2>
            <Link to="/app/prospectar" className="dash__more">Prospectar <LuChevronRight /></Link>
          </div>
          {data.recentRuns.length ? (
            <ul className="activity">
              {data.recentRuns.map(r => (
                <li key={r.id}>
                  <span className="activity__dot" />
                  <div>
                    <strong>{(r.config.segments || []).join(', ') || 'Todos os segmentos'}</strong>
                    <small>{r.config.locality || `${(r.config.areas || []).length} área(s) no mapa`} · {fmtDateTime(r.created_at)}</small>
                  </div>
                  <span className="activity__num">{r.status === 'done' ? `${fmtInt(r.total)} empresas` : r.status}</span>
                </li>
              ))}
            </ul>
          ) : <p className="muted small">Nenhum mapeamento ainda.</p>}
        </div>
        <div className="card">
          <div className="dash__card-head">
            <h2>Últimos leads</h2>
            <span className="dash__links">
              <a href="/api/leads/export" className="dash__more"><LuDownload /> CSV</a>
              <Link to="/app/leads" className="dash__more">Ver todos <LuChevronRight /></Link>
            </span>
          </div>
          {data.recentLeads.length ? (
            <ul className="activity">
              {data.recentLeads.map(l => (
                <li key={l.id}>
                  <span className={`activity__dot ${l.high_fit ? 'is-fit' : ''}`} />
                  <div>
                    <strong>{l.name}</strong>
                    <small>{[l.city, fmtDate(l.captured_at)].filter(Boolean).join(' · ')}</small>
                  </div>
                  {l.phone ? <a className="activity__num" href={`tel:${l.phone}`}><LuPhone /> ligar</a> : <span className="activity__num muted">sem telefone</span>}
                </li>
              ))}
            </ul>
          ) : <p className="muted small">Nenhum lead capturado ainda.</p>}
        </div>
      </section>

      {data.savedSearches.length > 0 && (
        <section className="card dash__saved">
          <div className="dash__card-head">
            <h2>Buscas salvas</h2>
            <Link to="/app/buscas" className="dash__more">Abrir <LuChevronRight /></Link>
          </div>
          <div className="dash__chips">
            {data.savedSearches.map(s => (
              <Link key={s.id} to="/app/buscas" className="dash__chip">
                {s.name}<small>{s.last_run_at ? `última execução ${fmtDate(s.last_run_at)}` : 'nunca executada'}</small>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
