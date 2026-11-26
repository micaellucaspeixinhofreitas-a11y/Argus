import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LuPlay, LuUpload, LuTrash2 } from 'react-icons/lu'
import { api, fmtDateTime, fmtInt } from '../lib/api'
import { countryByCode } from '../lib/countries'
import { useProspect, emptyConfig } from './Platform'
import { useAuth } from '../lib/auth'
import { tierOf, TIERS } from '../lib/tiers'

// Converte a configuração salva no servidor para o formato da tela de prospecção
const toDraft = c => ({
  ...emptyConfig(),
  segments: c.segments || [],
  country: c.country || 'BR',
  locality: c.locality || '',
  radiusKm: c.radiusKm || 2,
  maxResults: c.maxResults || 100,
  areas: (c.areas || []).map(a => ({ lat: a.lat, lng: a.lng, radiusKm: a.radiusKm, label: a.label })),
  qualification: {
    enabled: (c.qualification?.criteria || []).length > 0,
    criteria: c.qualification?.criteria?.length ? c.qualification.criteria : ['has_phone', 'no_website'],
    minScore: c.qualification?.minScore || 100,
  },
})

export default function Saved() {
  const [searches, setSearches] = useState(null)
  const [error, setError] = useState('')
  const { setConfig, setPendingRun, setResult, meta } = useProspect()
  const navigate = useNavigate()
  const { credits } = useAuth()
  const tiers = credits?.tiers || TIERS
  const critLabel = k => meta.criteria.find(c => c.key === k)?.label || k

  const load = () => api('searches').then(d => setSearches(d.searches)).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const open = (s, runNow) => {
    setConfig(toDraft(s.config))
    setResult(null)
    if (runNow) setPendingRun({ savedSearchId: s.id })
    navigate('/app/prospectar')
  }
  const remove = async s => {
    if (!window.confirm(`Excluir a busca "${s.name}"?`)) return
    await api(`searches?id=${s.id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <img className="page__icon" src="/icons/pasta.webp" alt="" width="56" height="56" /><p className="eyebrow">// Buscas salvas</p><h1>Buscas <span className="grad">salvas</span></h1>
          <p className="muted">Configurações de prospecção guardadas para reutilizar: segmento, país, localidade, qualificação, raio e áreas.</p>
        </div>
      </header>
      {error && <p className="form-error">{error}</p>}
      {searches === null ? <p className="muted">Carregando…</p> : searches.length === 0 ? (
        <div className="card empty-state"><img className="empty-state__icon" src="/icons/pasta.webp" alt="" width="88" height="88" /><p><strong>Nenhuma busca salva.</strong> Na tela Prospectar, configure sua busca e clique em <em>Salvar busca</em>.</p></div>
      ) : (
        <div className="saved-grid">
          {searches.map(s => (
            <article key={s.id} className="card saved">
              <h3>{s.name}</h3>
              <dl>
                <dt>Segmentos</dt><dd>{s.config.segments?.length ? s.config.segments.join(', ') : 'Todos'}</dd>
                <dt>País</dt><dd>{countryByCode(s.config.country).name}</dd>
                <dt>Localidade</dt><dd>{s.config.locality || '—'}</dd>
                <dt>Qualificação</dt><dd>{s.config.qualification?.criteria?.length ? `${s.config.qualification.criteria.map(critLabel).join(', ')} (mín. ${s.config.qualification.minScore}%)` : 'Sem filtros'}</dd>
                <dt>Áreas</dt><dd>{s.config.areas?.length ? s.config.areas.map(a => `${a.label} (${a.radiusKm} km)`).join(' · ') : `Localidade com raio de ${s.config.radiusKm} km`}</dd>
                <dt>Quantidade</dt><dd>{tierOf(s.config.maxResults, tiers).max} empresas · {fmtInt(tierOf(s.config.maxResults, tiers).cost)} créditos por execução</dd>
                <dt>Criada em</dt><dd>{fmtDateTime(s.created_at)}</dd>
                <dt>Última execução</dt><dd>{fmtDateTime(s.last_run_at)}</dd>
              </dl>
              <div className="btn-row">
                <button className="btn btn--primary btn--sm" onClick={() => open(s, true)}><LuPlay /> Executar · {fmtInt(tierOf(s.config.maxResults, tiers).cost)} créditos</button>
                <button className="btn-mini" onClick={() => open(s, false)}><LuUpload /> Carregar</button>
                <button className="btn-mini btn-mini--danger" onClick={() => remove(s)}><LuTrash2 /> Excluir</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
