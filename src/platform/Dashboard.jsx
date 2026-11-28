import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LuArrowUpRight, LuArrowDownRight, LuMinus, LuPlus, LuDownload, LuChevronRight, LuPhone } from 'react-icons/lu'
import { api, fmtInt, fmtDate, fmtDateTime } from '../lib/api'
import { catLabel } from '../lib/category'
import { useAuth } from '../lib/auth'
import { useProspect, emptyConfig } from './Platform'
import MagicBento from '../components/MagicBento'
import CountUp from '../components/CountUp'
import { PageSkeleton } from './Skeleton'
import SwipeRow from '../components/SwipeRow'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, WhatsappIcon, PlayIcon } from '@hugeicons/core-free-icons'
import { toDraft } from './Saved'

// WhatsApp exige o número com código do país (Brasil = 55 quando vier só DDD + número)
const waLink = phone => {
  let d = String(phone || '').replace(/\D/g, '').replace(/^0+/, '')
  if (d.length === 10 || d.length === 11) d = '55' + d
  return d.length >= 12 ? `https://wa.me/${d}` : null
}
// cores das linhas deslizáveis, no tom dos cartões da plataforma
const SWIPE = { actionColor: '#e5484d', drawerColor: '#27272f', rowColor: '#141418', textColor: '#ededf0', height: 60, radius: 12, actionWidth: 84 }

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
          <div key={d.day} style={{ '--i': i }} className={`bars__col ${hover === i ? 'is-hover' : ''}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}>
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
      {rows.map((r, i) => (
        <li key={r.label} style={{ '--i': i }}>
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
  const { setConfig, setResult, setPendingRun } = useProspect()
  const navigate = useNavigate()
  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState('leads')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`dashboard?dias=${days}`).then(setData).catch(e => setError(e.message))
  }, [days])

  // ações das linhas deslizáveis
  const removeLead = async id => {
    setData(d => ({ ...d, recentLeads: d.recentLeads.filter(l => l.id !== id) }))
    try { await api(`leads?id=${id}`, { method: 'DELETE' }) } catch (e) { setError(e.message) }
    api(`dashboard?dias=${days}`).then(setData).catch(() => {})
  }
  const removeSaved = async id => {
    setData(d => ({ ...d, savedSearches: d.savedSearches.filter(s => s.id !== id) }))
    try { await api(`searches?id=${id}`, { method: 'DELETE' }) } catch (e) { setError(e.message) }
  }
  const runSaved = s => {
    setConfig(toDraft(s.config || {}))
    setResult(null)
    setPendingRun({ savedSearchId: s.id })
    navigate('/app/prospectar')
  }
  const newProspect = () => { setConfig(emptyConfig()); setResult(null); navigate('/app/prospectar') }
  const hello = useMemo(() => {
    const h = new Date().getHours()
    return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  }, [])
  const firstName = (user.name || '').trim().split(/\s+/)[0]

  if (error) return <div className="page"><p className="form-error">{error}</p></div>
  if (!data) return <PageSkeleton cards={6} rows={2} />

  const { totals: t, previous: p, quality: q, credits: c } = data
  const periodSum = data.series.reduce((s, d) => s + d[metric], 0)
  const empty = !t.runs && !t.leads
  const recent = data.series.slice(-14)
  const peak = Math.max(1, ...recent.map(d => d.leads))
  const creditPct = c.monthly_credits ? Math.min(100, (c.available / c.monthly_credits) * 100) : 0

  // cartões do bento com os números reais da conta
  const bentoItems = [
    {
      id: 'leads', colSpan: 2,
      content: (
        <div className="bk">
          <div className="bk__head"><img src="/icons/chat.webp" alt="" width="34" height="34" /><span>Leads capturados · {days} dias</span></div>
          <div className="bk__row">
            <div>
              <strong className="bk__num"><CountUp value={t.leads_period} /></strong>
              <Delta now={t.leads_period} before={p.leads} />
            </div>
            <div className="magic-bento__bars-plot bk__spark" aria-label="Leads nos últimos 14 dias">
              {recent.map((d, i) => (
                <span key={d.day} className="magic-bento__bar" title={`${shortDay(d.day)}: ${d.leads}`}
                  data-peak={d.leads && d.leads === peak ? '' : undefined} style={{ '--h': Math.max(0.04, d.leads / peak), '--i': i }} />
              ))}
            </div>
          </div>
          <small className="bk__foot">{fmtInt(t.leads)} leads no total · últimos 14 dias no gráfico</small>
        </div>
      ),
    },
    {
      id: 'runs',
      content: (
        <div className="bk">
          <div className="bk__head"><img src="/icons/pino.webp" alt="" width="34" height="34" /><span>Mapeamentos · {days} dias</span></div>
          <strong className="bk__num"><CountUp value={t.runs_period} /></strong>
          <Delta now={t.runs_period} before={p.runs} />
          <small className="bk__foot">{fmtInt(t.runs)} no total</small>
        </div>
      ),
    },
    {
      id: 'credits', onClick: () => navigate('/app/creditos'),
      content: (
        <div className="bk">
          <div className="bk__head"><img src="/icons/moeda.webp" alt="" width="34" height="34" /><span>Créditos disponíveis</span></div>
          <strong className="bk__num"><CountUp value={c.available} /></strong>
          <span className="bk__meter"><i style={{ width: `${creditPct}%` }} /></span>
          <small className="bk__foot">de {fmtInt(c.monthly_credits)} · plano {c.plan?.name} · buscas hoje {fmtInt(c.today_used)}/{fmtInt(c.daily_limit)}</small>
        </div>
      ),
    },
    {
      id: 'mapped',
      content: (
        <div className="bk">
          <div className="bk__head"><img src="/icons/dados.webp" alt="" width="34" height="34" /><span>Empresas mapeadas</span></div>
          <strong className="bk__num"><CountUp value={t.mapped} /></strong>
          <small className="bk__foot">{fmtInt(t.leads)} viraram leads · {pct(t.leads, t.mapped)}% de aproveitamento</small>
        </div>
      ),
    },
    {
      id: 'fit',
      content: (
        <div className="bk">
          <div className="bk__head"><img src="/icons/estrela.webp" alt="" width="34" height="34" /><span>Leads de alta aderência</span></div>
          {q.scored ? <>
            <strong className="bk__num"><CountUp value={pct(q.high_fit, q.scored)} suffix="%" /></strong>
            <small className="bk__foot">{fmtInt(q.high_fit)} de {fmtInt(q.scored)} leads qualificados atendem aos seus critérios</small>
          </> : <>
            <strong className="bk__num">—</strong>
            <small className="bk__foot">Ative a qualificação na prospecção para medir a aderência dos leads</small>
          </>}
        </div>
      ),
    },
    {
      id: 'new', colSpan: 2, onClick: newProspect,
      content: (
        <div className="bk bk--cta">
          <img className="bk__hero" src="/icons/foguete.webp" alt="" width="104" height="104" />
          <div>
            <h3>Nova prospecção</h3>
            <p>Escolha o segmento, marque o território no mapa e encontre empresas reais para capturar.</p>
            <span className="bk__link">Abrir o mapa <LuChevronRight /></span>
          </div>
        </div>
      ),
    },
  ]

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
      {error && <p className="form-error">{error}</p>}

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

      <MagicBento
        items={bentoItems}
        columns={4}
        rowHeight={200}
        gap={12}
        radius={20}
        enableBorderGlow
        enableSpotlight
        spotlightRadius={300}
        clickEffect
        enableStars={false}
        particleCount={24}
        enableTilt={false}
        enableMagnetism={false}
        textAutoHide
        intro
      />

      <section className="dash__row dash__row--main">
        <div className="card dash__chart">
          <div className="dash__card-head">
            <div>
              <h2 className="h2-icon"><img className="h2-ic" src="/icons/calendario.webp" alt="" width="24" height="24" /> {metric === 'leads' ? 'Leads capturados por dia' : 'Mapeamentos por dia'}</h2>
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
          <div className="dash__card-head"><h2 className="h2-icon"><img className="h2-ic" src="/icons/estrela.webp" alt="" width="24" height="24" /> Qualidade dos leads</h2></div>
          {q.total ? (
            <ul className="meters-list">
              {[
                ['Com telefone', q.phone, 'Contato direto disponível'],
                ...(q.scored ? [['Alta aderência', q.high_fit, 'Atendem aos seus critérios']] : []),
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
          <div className="dash__card-head"><h2 className="h2-icon"><img className="h2-ic" src="/icons/lupa.webp" alt="" width="24" height="24" /> Segmentos mais buscados</h2></div>
          <BarList rows={data.segments} empty="Nenhum segmento pesquisado ainda." />
        </div>
        <div className="card">
          <div className="dash__card-head"><h2 className="h2-icon"><img className="h2-ic" src="/icons/pino.webp" alt="" width="24" height="24" /> Cidades dos seus leads</h2></div>
          <BarList rows={data.cities} empty="Sem leads capturados ainda." />
        </div>
        <div className="card">
          <div className="dash__card-head"><h2 className="h2-icon"><img className="h2-ic" src="/icons/dados.webp" alt="" width="24" height="24" /> Tipos de empresa</h2></div>
          <BarList rows={data.categories.map(r => ({ ...r, label: r.label === 'Outros' ? r.label : catLabel(r.label) }))} empty="Sem leads capturados ainda." />
        </div>
      </section>

      <section className="dash__row dash__row--two">
        <div className="card">
          <div className="dash__card-head">
            <h2 className="h2-icon"><img className="h2-ic" src="/icons/relogio.webp" alt="" width="24" height="24" /> Últimos mapeamentos</h2>
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
            <h2 className="h2-icon"><img className="h2-ic" src="/icons/coracao.webp" alt="" width="24" height="24" /> Últimos leads</h2>
            <span className="dash__links">
              <a href="/api/leads/export" className="dash__more"><LuDownload /> CSV</a>
              <Link to="/app/leads" className="dash__more">Ver todos <LuChevronRight /></Link>
            </span>
          </div>
          {data.recentLeads.length ? (
            <div className="swipe-list">
              <p className="swipe-hint">Arraste uma linha para o lado para ver as ações.</p>
              {data.recentLeads.map(l => {
                const wa = waLink(l.phone)
                return (
                  <SwipeRow
                    key={l.id}
                    {...SWIPE}
                    label={`Lead ${l.name}`}
                    actions={[
                      { id: 'delete', label: 'Excluir', icon: <HugeiconsIcon icon={Delete02Icon} size={20} /> },
                      ...(wa ? [{ id: 'whatsapp', label: 'WhatsApp', color: '#16a34a', icon: <HugeiconsIcon icon={WhatsappIcon} size={20} />, onSelect: () => window.open(wa, '_blank', 'noopener') }] : []),
                    ]}
                    onCommit={a => a.id === 'delete' && removeLead(l.id)}
                    style={{ marginBottom: 8 }}
                  >
                    <span className={`activity__dot ${l.high_fit ? 'is-fit' : ''}`} />
                    <div className="swipe-text">
                      <strong>{l.name}</strong>
                      <small>{[l.city, fmtDate(l.captured_at)].filter(Boolean).join(' · ')}</small>
                    </div>
                    {l.phone ? <a className="activity__num" href={`tel:${l.phone}`} onPointerDown={e => e.stopPropagation()}><LuPhone /> ligar</a> : <span className="activity__num muted">sem telefone</span>}
                  </SwipeRow>
                )
              })}
            </div>
          ) : <p className="muted small">Nenhum lead capturado ainda.</p>}
        </div>
      </section>

      {data.savedSearches.length > 0 && (
        <section className="card dash__saved">
          <div className="dash__card-head">
            <h2 className="h2-icon"><img className="h2-ic" src="/icons/pasta.webp" alt="" width="24" height="24" /> Buscas salvas</h2>
            <Link to="/app/buscas" className="dash__more">Abrir <LuChevronRight /></Link>
          </div>
          <div className="swipe-list swipe-list--grid">
            {data.savedSearches.map(s => (
              <SwipeRow
                key={s.id}
                {...SWIPE}
                label={`Busca salva ${s.name}`}
                actions={[
                  { id: 'delete', label: 'Excluir', icon: <HugeiconsIcon icon={Delete02Icon} size={20} /> },
                  { id: 'run', label: 'Executar', color: '#7c3aed', icon: <HugeiconsIcon icon={PlayIcon} size={20} />, onSelect: () => runSaved(s) },
                ]}
                onCommit={a => a.id === 'delete' && removeSaved(s.id)}
              >
                <div className="swipe-text">
                  <strong>{s.name}</strong>
                  <small>{s.last_run_at ? `última execução ${fmtDate(s.last_run_at)}` : 'nunca executada'}</small>
                </div>
              </SwipeRow>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
