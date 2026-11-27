import { useEffect, useState } from 'react'
import { LuDownload, LuSearch, LuPhone, LuMail, LuMapPin } from 'react-icons/lu'
import { api, fmtDateTime, fmtInt } from '../lib/api'
import { catLabel } from '../lib/category'
import { ListSkeleton } from './Skeleton'

// WhatsApp exige o número com código do país (Brasil = 55 quando vier só DDD + número)
const waLink = phone => {
  let digits = String(phone).replace(/\D/g, '').replace(/^0+/, '')
  if (digits.length === 10 || digits.length === 11) digits = '55' + digits
  return digits.length >= 12 ? `https://wa.me/${digits}` : null
}

export default function Leads() {
  const [q, setQ] = useState('')
  const [leads, setLeads] = useState(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      api(`leads?q=${encodeURIComponent(q)}`).then(d => { setLeads(d.leads); setTotal(d.total ?? d.leads.length) }).catch(e => setError(e.message))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <img className="page__icon" src="/icons/chat.webp" alt="" width="56" height="56" /><p className="eyebrow">// Leads</p><h1>Leads <span className="grad">capturados</span></h1>
          <p className="muted">Empresas que você capturou nos mapeamentos, com os contatos encontrados.</p>
        </div>
        <a className="btn btn--ghost btn--sm" href="/api/leads/export" download><LuDownload /> Exportar CSV</a>
      </header>
      <div className="search-box card">
        <LuSearch aria-hidden="true" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrar por nome, categoria ou cidade" aria-label="Filtrar leads" />
      </div>
      {error && <p className="form-error">{error}</p>}
      {leads === null ? <ListSkeleton rows={6} /> : leads.length === 0 ? (
        <div className="card empty-state"><img className="empty-state__icon" src="/icons/robo.webp" alt="" width="88" height="88" /><p><strong>Nenhum lead ainda.</strong> Mapeie uma região e capture as empresas que interessam.</p></div>
      ) : (
        <>
          <p className="hint">{fmtInt(total)} lead(s){q && ' no filtro'}{total > leads.length && ` · mostrando os ${fmtInt(leads.length)} mais recentes (use o filtro ou exporte o CSV para ver todos)`}</p>
          <div className="table-wrap card">
            <table className="table table--cards">
              <thead>
                <tr><th>Empresa</th><th>Contato</th><th>Endereço</th><th>Aderência</th><th>Capturado em</th></tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id}>
                    <td data-label="Empresa">
                      <strong>{l.name}</strong>
                      <small className="muted block">{catLabel(l.category)}</small>
                    </td>
                    <td className="contacts" data-label="Contato">
                      {l.phone && <a href={`tel:${l.phone}`}><LuPhone /> {l.phone}</a>}
                      {l.phone && waLink(l.phone) && <a href={waLink(l.phone)} target="_blank" rel="noreferrer">WhatsApp</a>}
                      {l.email && <a href={`mailto:${l.email}`}><LuMail /> {l.email}</a>}
                      {l.website
                        ? <a href={l.website.startsWith('http') ? l.website : `https://${l.website}`} target="_blank" rel="noreferrer"><img className="ic3d-sm" src="/icons/corrente.webp" alt="" width="16" height="16" /> site</a>
                        : <span className="flag flag--noweb">Sem website</span>}
                      {Object.entries(l.social || {}).map(([k, v]) => <span key={k} className="flag">{k}: {v}</span>)}
                      {!l.phone && !l.email && !l.website && <span className="muted">Sem contatos cadastrados</span>}
                    </td>
                    <td data-label="Endereço">
                      {l.address || <span className="muted">—</span>}
                      <a className="block small" href={`https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=18/${l.lat}/${l.lng}`} target="_blank" rel="noreferrer"><LuMapPin /> ver no mapa</a>
                    </td>
                    <td data-label="Aderência">{l.score != null ? `${l.score}%` : '—'}{l.high_fit && <span className="flag flag--fit block">Alta</span>}</td>
                    <td data-label="Capturado em">{fmtDateTime(l.captured_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
