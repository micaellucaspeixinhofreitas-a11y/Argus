import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LuTarget, LuFilter, LuLayers, LuSearch, LuX, LuTrash2, LuRefreshCw, LuPlay, LuSave, LuCrosshair,
  LuGlobe, LuPhone, LuMail, LuMapPin, LuCheck, LuLoader, LuLocateFixed,
} from 'react-icons/lu'
import MapView from './MapView'
import { useProspect } from './Platform'
import { useAuth } from '../lib/auth'
import { api, fmtInt } from '../lib/api'
import { COUNTRIES, countryByCode } from '../lib/countries'

const CATEGORY_PT = {
  shop: 'Loja', amenity: 'Serviço', office: 'Escritório', craft: 'Ofício', healthcare: 'Saúde', leisure: 'Lazer', tourism: 'Hospedagem',
}
const GOOGLE_PT = {
  restaurant: 'Restaurante', cafe: 'Cafeteria', bar: 'Bar', bakery: 'Padaria', gym: 'Academia', fitness_center: 'Academia',
  dentist: 'Dentista', dental_clinic: 'Clínica odontológica', doctor: 'Médico', medical_clinic: 'Clínica', hospital: 'Hospital',
  pharmacy: 'Farmácia', drugstore: 'Farmácia', beauty_salon: 'Salão de beleza', hair_salon: 'Cabeleireiro', barber_shop: 'Barbearia',
  spa: 'Spa', real_estate_agency: 'Imobiliária', lawyer: 'Advocacia', accounting: 'Contabilidade', car_repair: 'Oficina',
  store: 'Loja', clothing_store: 'Loja de roupas', supermarket: 'Supermercado', grocery_store: 'Mercado', pet_store: 'Pet shop',
  veterinary_care: 'Veterinário', hotel: 'Hotel', lodging: 'Hospedagem', school: 'Escola', insurance_agency: 'Seguros',
  pizza_restaurant: 'Pizzaria', fast_food_restaurant: 'Lanchonete', physiotherapist: 'Fisioterapia', point_of_interest: 'Estabelecimento',
}
const catLabel = c => {
  if (!c) return 'Estabelecimento'
  const [k, v] = c.split(':')
  if (k === 'google') return GOOGLE_PT[v] || String(v).replace(/_/g, ' ')
  if (k === 'tomtom') return String(v).charAt(0).toUpperCase() + String(v).slice(1).replace(/_/g, ' ')
  return `${CATEGORY_PT[k] || k} · ${String(v).replace(/_/g, ' ')}`
}

export default function Prospect() {
  const { config, setConfig, result, setResult, meta, pendingRun, setPendingRun } = useProspect()
  const { credits, setCredits } = useAuth()
  const [segInput, setSegInput] = useState('')
  const [geo, setGeo] = useState({ q: '', results: [], busy: false, error: '' })
  const [flyTo, setFlyTo] = useState(null)
  const [fitKey, setFitKey] = useState(0)
  const [syncedAreas, setSyncedAreas] = useState(() => JSON.stringify(config.areas))
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(new Set())
  const [focusId, setFocusId] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [savedSearchId, setSavedSearchId] = useState(null)
  const listRef = useRef(null)

  const country = countryByCode(config.country)
  const view = useMemo(() => ({ lat: country.lat, lng: country.lng, zoom: country.zoom }), [country])
  const update = patch => setConfig(c => ({ ...c, ...patch }))
  const updateQ = patch => setConfig(c => ({ ...c, qualification: { ...c.qualification, ...patch } }))
  const limits = meta.limits

  // ---------- alvo ----------
  const addSegment = raw => {
    const terms = String(raw).split(',').map(s => s.trim()).filter(Boolean)
    if (!terms.length) return
    setConfig(c => ({ ...c, segments: [...new Set([...c.segments, ...terms])].slice(0, 8) }))
    setSegInput('')
  }

  // ---------- geolocalização ----------
  const searchPlace = async q => {
    const term = (q ?? geo.q).trim()
    if (term.length < 2) return
    setGeo(g => ({ ...g, q: term, busy: true, error: '', results: [] }))
    try {
      const { results } = await api(`geo/search?q=${encodeURIComponent(term)}&country=${config.country}`)
      setGeo(g => ({ ...g, busy: false, results, error: results.length ? '' : 'Nenhum local encontrado neste país.' }))
      if (results[0]) setFlyTo({ ...results[0] })
    } catch (err) {
      setGeo(g => ({ ...g, busy: false, error: err.message }))
    }
  }

  // ---------- território ----------
  const addArea = (latlng, label) => {
    setConfig(c => {
      if (c.areas.length >= limits.maxAreas) {
        setNotice(`Limite de ${limits.maxAreas} áreas por operação.`)
        return c
      }
      return { ...c, areas: [...c.areas, { lat: +latlng.lat.toFixed(6), lng: +latlng.lng.toFixed(6), radiusKm: c.radiusKm, label: label || `Área ${c.areas.length + 1}` }] }
    })
  }
  const moveArea = (i, latlng) =>
    setConfig(c => ({ ...c, areas: c.areas.map((a, j) => (j === i ? { ...a, lat: +latlng.lat.toFixed(6), lng: +latlng.lng.toFixed(6) } : a)) }))
  const setAreaRadius = (i, radiusKm) => setConfig(c => ({ ...c, areas: c.areas.map((a, j) => (j === i ? { ...a, radiusKm } : a)) }))
  const removeArea = i => setConfig(c => ({ ...c, areas: c.areas.filter((_, j) => j !== i) }))
  const applyRadiusToAll = () => setConfig(c => ({ ...c, areas: c.areas.map(a => ({ ...a, radiusKm: c.radiusKm })) }))
  const sync = () => {
    setSyncedAreas(JSON.stringify(config.areas))
    setFitKey(k => k + 1)
  }
  const synced = syncedAreas === JSON.stringify(config.areas)

  // ---------- mapeamento ----------
  const payload = () => ({
    segments: config.segments,
    country: config.country,
    locality: config.locality,
    radiusKm: config.radiusKm,
    areas: config.areas,
    qualification: config.qualification.enabled ? config.qualification : { criteria: [] },
    savedSearchId,
  })

  const keyOf = (areas = config.areas) => JSON.stringify({ ...payload(), areas, savedSearchId: null })

  const run = async () => {
    setError('')
    setNotice('')
    if (!config.areas.length && !config.locality.trim()) {
      setError('Marque ao menos uma área no mapa (clique no mapa) ou informe uma localidade.')
      return
    }
    setRunning(true)
    sync()
    try {
      const data = await api('mapping/run', { method: 'POST', body: payload() })
      let areas = config.areas
      if (!areas.length && data.areas?.length) {
        areas = data.areas.map(a => ({ lat: a.lat, lng: a.lng, radiusKm: a.radius_m / 1000, label: a.label }))
        update({ areas })
        setSyncedAreas(JSON.stringify(areas))
        setFitKey(k => k + 1)
      }
      setResult({ ...data, configKey: keyOf(areas) })
      if (data.credits) setCredits(data.credits)
      setSelected(new Set())
      setFilter('all')
      setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
      setSavedSearchId(null)
    }
  }

  // execução vinda de "Buscas salvas"
  useEffect(() => {
    if (!pendingRun) return
    setSavedSearchId(pendingRun.savedSearchId)
    setPendingRun(null)
    setSyncedAreas('')
    setTimeout(() => document.getElementById('run-btn')?.click(), 50)
  }, [pendingRun, setPendingRun])

  const saveSearch = async () => {
    setError('')
    const name = window.prompt('Nome da busca:', [config.segments.join(', ') || 'Todos os segmentos', config.locality].filter(Boolean).join(' — '))
    if (name === null) return
    try {
      await api('searches', { method: 'POST', body: { name, config: payload() } })
      setNotice('Busca salva. Você pode recuperá-la em "Buscas salvas".')
    } catch (err) {
      setError(err.message)
    }
  }

  // ---------- resultados ----------
  const results = result?.results || []
  const stale = result && result.configKey && result.configKey !== keyOf()
  const visible = useMemo(() => {
    if (filter === 'fit') return results.filter(r => r.high_fit)
    if (filter === 'noweb') return results.filter(r => !r.has_website)
    if (filter === 'open') return results.filter(r => !r.captured)
    if (filter === 'captured') return results.filter(r => r.captured)
    return results
  }, [results, filter])

  const toggle = id => setSelected(s => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const selectVisible = () => setSelected(new Set(visible.filter(r => !r.captured).map(r => r.id)))

  const capture = async ids => {
    const fresh = ids.filter(id => !results.find(r => r.id === id)?.captured)
    if (!fresh.length) return
    setCapturing(true)
    setError('')
    try {
      const data = await api('leads/capture', { method: 'POST', body: { runId: result.run.id, companyIds: fresh } })
      setCredits(data.credits)
      const refreshed = await api(`mapping/result?run=${result.run.id}`)
      setResult(r => ({ ...r, ...refreshed }))
      setSelected(new Set())
      setNotice(
        `${fmtInt(data.captured)} lead(s) capturado(s) · ${fmtInt(data.credits_spent)} crédito(s) usado(s)` +
          (data.already_captured ? ` · ${data.already_captured} já eram seus (sem cobrança)` : '') +
          (data.blocked_by_limit ? ` · ${data.blocked_by_limit} não capturado(s) por limite de créditos` : '')
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setCapturing(false)
    }
  }

  const freshSelected = [...selected].filter(id => !results.find(r => r.id === id)?.captured)

  return (
    <div className="pros">
      {/* ===== painel de configuração ===== */}
      <aside className="pros__panel">
        <section className="step card">
          <header className="step__head"><LuTarget /> <h2>1. Defina o alvo</h2></header>
          <label className="field">
            <span>Segmentos <em>(opcional)</em></span>
            <div className="chips-input">
              {config.segments.map(s => (
                <span key={s} className="chip is-on">
                  {s}
                  <button aria-label={`Remover ${s}`} onClick={() => update({ segments: config.segments.filter(x => x !== s) })}><LuX /></button>
                </span>
              ))}
              <input
                list="segment-list"
                value={segInput}
                placeholder={config.segments.length ? 'Adicionar outro…' : 'Ex.: clínicas, academias, pizzaria'}
                onChange={e => setSegInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSegment(segInput) }
                  if (e.key === 'Backspace' && !segInput && config.segments.length) update({ segments: config.segments.slice(0, -1) })
                }}
                onBlur={() => addSegment(segInput)}
              />
              <datalist id="segment-list">
                {meta.segments.map(s => <option key={s.key} value={s.label} />)}
              </datalist>
            </div>
            <small className="hint">Vazio = todo tipo de comércio da região. Aceita categorias e palavras-chave.</small>
          </label>
          <div className="row2">
            <label className="field">
              <span>País</span>
              <select value={config.country} onChange={e => update({ country: e.target.value })}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Localidade <em>(opcional)</em></span>
              <input
                value={config.locality}
                onChange={e => update({ locality: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchPlace(config.locality) } }}
                placeholder="Cidade, bairro ou estado"
              />
            </label>
          </div>
          {config.locality.trim().length > 1 && (
            <button className="btn-mini" onClick={() => searchPlace(config.locality)}><LuLocateFixed /> Localizar no mapa</button>
          )}
        </section>

        <section className="step card">
          <header className="step__head">
            <LuFilter /> <h2>2. Qualificação</h2>
            <label className="switch">
              <input type="checkbox" checked={config.qualification.enabled} onChange={e => updateQ({ enabled: e.target.checked })} />
              <span aria-hidden="true" /> <small>{config.qualification.enabled ? 'Ativa' : 'Sem filtros'}</small>
            </label>
          </header>
          {config.qualification.enabled ? (
            <>
              <div className="criteria">
                {meta.criteria.map(c => {
                  const on = config.qualification.criteria.includes(c.key)
                  return (
                    <button key={c.key} type="button" className={`chip ${on ? 'is-on' : ''}`} aria-pressed={on}
                      onClick={() => updateQ({ criteria: on ? config.qualification.criteria.filter(k => k !== c.key) : [...config.qualification.criteria, c.key] })}>
                      {on && <LuCheck />} {c.label}
                    </button>
                  )
                })}
              </div>
              <label className="field">
                <span>Aderência mínima para "alta aderência": <strong>{config.qualification.minScore}%</strong></span>
                <input type="range" min="25" max="100" step="25" value={config.qualification.minScore}
                  onChange={e => updateQ({ minScore: Number(e.target.value) })} />
              </label>
              <small className="hint">Cada empresa recebe uma nota pela % de critérios atendidos com os dados encontrados.</small>
            </>
          ) : (
            <p className="hint">Pesquise sem filtros ou ative para destacar as empresas com maior aderência ao que você vende.</p>
          )}
        </section>

        <section className="step card">
          <header className="step__head"><LuLayers /> <h2>3. Território</h2></header>
          <label className="field">
            <span>Raio das novas áreas: <strong>{config.radiusKm.toLocaleString('pt-BR')} km</strong></span>
            <input type="range" min={limits.minRadiusKm} max={limits.maxRadiusKm} step="0.1" value={config.radiusKm}
              onChange={e => update({ radiusKm: Number(e.target.value) })} />
          </label>
          <p className="hint"><LuCrosshair /> Clique no mapa para adicionar uma área. Arraste o número para mover.</p>
          {config.areas.length > 0 && (
            <ul className="areas">
              {config.areas.map((a, i) => (
                <li key={i}>
                  <span className="areas__n">{i + 1}</span>
                  <span className="areas__label" title={`${a.lat}, ${a.lng}`}>{a.label}<small>{a.lat.toFixed(4)}, {a.lng.toFixed(4)}</small></span>
                  <label className="areas__r">
                    <input type="number" min={limits.minRadiusKm} max={limits.maxRadiusKm} step="0.1" value={a.radiusKm}
                      onChange={e => setAreaRadius(i, Math.min(limits.maxRadiusKm, Math.max(limits.minRadiusKm, Number(e.target.value) || limits.minRadiusKm)))} />
                    km
                  </label>
                  <button className="pf-icon-btn" onClick={() => removeArea(i)} aria-label={`Remover área ${i + 1}`}><LuTrash2 /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="btn-row">
            <button className="btn-mini" onClick={sync} disabled={!config.areas.length}><LuRefreshCw /> Sincronizar com o mapa</button>
            {config.areas.length > 1 && <button className="btn-mini" onClick={applyRadiusToAll}>Aplicar raio a todas</button>}
            {config.areas.length > 0 && <button className="btn-mini btn-mini--danger" onClick={() => update({ areas: [] })}><LuTrash2 /> Limpar áreas</button>}
          </div>
        </section>

        <div className="pros__actions">
          <button id="run-btn" className="btn btn--primary btn--block" onClick={run} disabled={running}>
            {running ? <><LuLoader className="spin" /> Mapeando oportunidades…</> : <><LuPlay /> Mapear oportunidades</>}
          </button>
          <button className="btn-mini" onClick={saveSearch}><LuSave /> Salvar busca</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-notice" role="status">{notice}</p>}
      </aside>

      {/* ===== mapa + resultados ===== */}
      <section className="pros__work">
        <div className="map-wrap card">
          <form className="map-search" onSubmit={e => { e.preventDefault(); searchPlace() }}>
            <LuSearch aria-hidden="true" />
            <input value={geo.q} onChange={e => setGeo(g => ({ ...g, q: e.target.value }))} placeholder={`Pesquisar cidade, bairro ou endereço em ${country.name}`} aria-label="Pesquisar local" />
            {geo.busy && <LuLoader className="spin" />}
          </form>
          {(geo.results.length > 0 || geo.error) && (
            <ul className="map-results">
              {geo.error && <li className="muted">{geo.error}</li>}
              {geo.results.map((r, i) => (
                <li key={i}>
                  <button onClick={() => setFlyTo({ ...r })}><LuMapPin /> {r.display_name}</button>
                  <button className="btn-mini" onClick={() => { addArea({ lat: r.lat, lng: r.lng }, r.display_name.split(',').slice(0, 2).join(',')); setGeo(g => ({ ...g, results: [] })) }}>+ Área</button>
                </li>
              ))}
              <li><button className="link" onClick={() => setGeo(g => ({ ...g, results: [], error: '' }))}>Fechar</button></li>
            </ul>
          )}
          <div className="map-badge">
            <strong>{config.areas.length}</strong> área(s) selecionada(s)
            {config.areas.length > 0 && <span className={synced ? 'ok' : 'warn'}>{synced ? 'sincronizadas' : 'não sincronizadas'}</span>}
          </div>
          <MapView
            basemapKey={meta.basemapKey}
            view={view}
            areas={config.areas}
            results={results}
            selectedId={focusId}
            onAddArea={latlng => addArea(latlng)}
            onMoveArea={moveArea}
            onSelect={id => { setFocusId(id); document.getElementById(`r-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }}
            fitKey={fitKey}
            flyTo={flyTo}
            addMode
          />
          <div className="map-legend">
            <span><i className="lg lg--fit" /> Alta aderência</span>
            <span><i className="lg lg--noweb" /> Sem website</span>
            <span><i className="lg lg--base" /> Demais</span>
            <span><i className="lg lg--cap" /> Capturado</span>
          </div>
        </div>

        <div ref={listRef} className="radar">
          <h2 className="radar__title">Radar de oportunidades capturadas</h2>
          {stale && <p className="form-notice">Você alterou os critérios. Clique em <strong>Mapear oportunidades</strong> para atualizar os resultados.</p>}
          <div className="radar__cards">
            <button className={`radar-card ${filter === 'all' ? 'is-on' : ''}`} onClick={() => setFilter('all')}>
              <small>Mapeadas</small><strong>{fmtInt(result?.run.total ?? 0)}</strong>
            </button>
            <button className={`radar-card radar-card--fit ${filter === 'fit' ? 'is-on' : ''}`} onClick={() => setFilter('fit')}>
              <small>Alta aderência</small><strong>{result && !result.run.config.qualification.criteria.length ? '—' : fmtInt(result?.run.high_fit ?? 0)}</strong>
            </button>
            <button className={`radar-card radar-card--noweb ${filter === 'noweb' ? 'is-on' : ''}`} onClick={() => setFilter('noweb')}>
              <small>Sem website</small><strong>{fmtInt(result?.run.no_website ?? 0)}</strong>
            </button>
          </div>
          {result && !result.run.config.qualification.criteria.length && (
            <p className="hint">Ative a <strong>Qualificação</strong> para calcular a alta aderência.</p>
          )}
        </div>

        {result ? (
          <div className="results card">
            <div className="results__bar">
              <div className="seg-tabs">
                {[['all', 'Todas'], ['fit', 'Alta aderência'], ['noweb', 'Sem website'], ['open', 'Não capturadas'], ['captured', 'Capturadas']].map(([k, l]) => (
                  <button key={k} className={filter === k ? 'is-on' : ''} onClick={() => setFilter(k)}>{l}</button>
                ))}
              </div>
              <div className="results__actions">
                <button className="btn-mini" onClick={selectVisible} disabled={!visible.some(r => !r.captured)}>Selecionar visíveis</button>
                <button className="btn btn--primary btn--sm" disabled={!freshSelected.length || capturing} onClick={() => capture(freshSelected)}>
                  {capturing ? 'Capturando…' : `Capturar ${fmtInt(freshSelected.length)} lead(s) · ${fmtInt(freshSelected.length)} crédito(s)`}
                </button>
              </div>
            </div>
            {credits && <p className="hint">Você pode capturar mais <strong>{fmtInt(credits.can_spend)}</strong> lead(s) hoje ({fmtInt(credits.available)} créditos no mês). Lead já capturado não é cobrado.</p>}
            {visible.length === 0 ? (
              <p className="muted empty">Nenhuma empresa neste filtro. Tente aumentar o raio, adicionar áreas ou mudar o segmento.</p>
            ) : (
              <ul className="results__list">
                {visible.slice(0, 500).map(r => (
                  <li key={r.id} id={`r-${r.id}`} className={`res ${focusId === r.id ? 'is-focus' : ''} ${r.captured ? 'is-captured' : ''}`} onClick={() => setFocusId(r.id)}>
                    <input type="checkbox" checked={selected.has(r.id) || r.captured} disabled={r.captured} onChange={() => toggle(r.id)} onClick={e => e.stopPropagation()} aria-label={`Selecionar ${r.name}`} />
                    <div className="res__main">
                      <strong>{r.name}</strong>
                      <small>{catLabel(r.category)}{r.distance_m != null && ` · ${(r.distance_m / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km do centro`}</small>
                      <div className="res__flags">
                        {r.high_fit && <span className="flag flag--fit">Alta aderência</span>}
                        {r.score != null && <span className="flag">{r.score}% aderência</span>}
                        {!r.has_website && <span className="flag flag--noweb">Sem website</span>}
                        {r.has_phone && <span className="flag"><LuPhone /> telefone</span>}
                        {r.has_email && <span className="flag"><LuMail /> e-mail</span>}
                        {r.rating != null && <span className="flag">★ {Number(r.rating).toLocaleString('pt-BR')}{r.user_ratings ? ` (${r.user_ratings})` : ''}</span>}
                      </div>
                      {r.captured && (
                        <div className="res__contact">
                          {r.phone && <a href={`tel:${r.phone}`}><LuPhone /> {r.phone}</a>}
                          {r.website && <a href={r.website.startsWith('http') ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer"><LuGlobe /> site</a>}
                          {r.email && <a href={`mailto:${r.email}`}><LuMail /> {r.email}</a>}
                          {r.address && <span><LuMapPin /> {r.address}</span>}
                        </div>
                      )}
                    </div>
                    {r.captured
                      ? <span className="res__done"><LuCheck /> Capturado</span>
                      : <button className="btn-mini" onClick={e => { e.stopPropagation(); capture([r.id]) }} disabled={capturing}>Capturar</button>}
                  </li>
                ))}
              </ul>
            )}
            {visible.length > 500 && <p className="hint">Mostrando 500 de {fmtInt(visible.length)}. Use os filtros para refinar.</p>}
            <p className="hint">
              Fontes: {results.some(r => r.source === 'google') && 'Google Maps · '}{results.some(r => r.source === 'tomtom') && 'TomTom · '}© colaboradores do OpenStreetMap.
              Contatos aparecem após a captura e em <Link to="/app/leads">Leads</Link>.
            </p>
          </div>
        ) : (
          <div className="results card empty-state">
            <LuLayers />
            <p><strong>Nenhum mapeamento ainda.</strong> Defina o alvo, marque áreas no mapa e clique em <em>Mapear oportunidades</em>.</p>
          </div>
        )}
      </section>
    </div>
  )
}
