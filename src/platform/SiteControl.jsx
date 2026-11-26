import { useEffect, useState } from 'react'
import { LuWrench, LuSave } from 'react-icons/lu'
import { api, fmtDateTime } from '../lib/api'
import { useSite } from '../lib/site'

// datetime-local usa o horário local sem fuso
const toLocalInput = iso => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const LABELS = { maintenance: 'Manutenção', announcement: 'Aviso no topo', registrationsOpen: 'Cadastros', paymentsEnabled: 'Pagamentos', mappingEnabled: 'Mapeamentos', creditsPerLead: 'Custo por lead' }

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="ctl-toggle">
      <span className="switch"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><span aria-hidden="true" /></span>
      <span><strong>{label}</strong>{hint && <small>{hint}</small>}</span>
    </label>
  )
}

// Painel do administrador para controlar o site: manutenção, aviso, cadastros, pagamentos e mapeamentos
export default function SiteControl() {
  const { refresh } = useSite()
  const [form, setForm] = useState(null)
  const [history, setHistory] = useState([])
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => api('admin/settings').then(d => {
    const s = d.settings
    setForm({ ...s, maintenance: { ...s.maintenance, eta: toLocalInput(s.maintenance.eta) } })
    setHistory(d.history)
  }).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  if (!form) return error ? <p className="form-error">{error}</p> : null
  const setM = patch => setForm(f => ({ ...f, maintenance: { ...f.maintenance, ...patch } }))
  const setA = patch => setForm(f => ({ ...f, announcement: { ...f.announcement, ...patch } }))

  const save = async e => {
    e.preventDefault()
    if (form.maintenance.enabled && !window.confirm(form.maintenance.scope === 'all'
      ? 'Ligar a manutenção no SITE INTEIRO? Visitantes e clientes verão a tela de manutenção.'
      : 'Ligar a manutenção da PLATAFORMA? Os clientes não conseguirão usar a plataforma até você desligar.')) return
    setBusy(true); setMsg(''); setError('')
    try {
      await api('admin/settings', {
        method: 'POST',
        body: { ...form, maintenance: { ...form.maintenance, eta: form.maintenance.eta ? new Date(form.maintenance.eta).toISOString() : null } },
      })
      setMsg('Configurações salvas. Os visitantes veem a mudança em até 10 segundos.')
      await Promise.all([load(), refresh()])
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const lastChange = history.slice().sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]

  return (
    <form className="card ctl" onSubmit={save}>
      <div className="ctl__head">
        <img src={form.maintenance.enabled ? '/mascote-manutencao.webp' : '/mascote.webp'} alt="" width="120" height="120" />
        <div>
          <h2>Controle do site</h2>
          <p className="muted small">
            {form.maintenance.enabled ? 'A manutenção está LIGADA.' : 'Tudo funcionando normalmente.'}
            {lastChange && ` Última alteração: ${LABELS[lastChange.key] || lastChange.key} por ${lastChange.updated_by || '—'} em ${fmtDateTime(lastChange.updated_at)}.`}
          </p>
        </div>
        <span className={`ctl__status ${form.maintenance.enabled ? 'is-maint' : ''}`}><i aria-hidden="true" />{form.maintenance.enabled ? 'Em manutenção' : 'No ar'}</span>
      </div>

      <div className="ctl__grid">
        <fieldset className={`ctl__box ${form.maintenance.enabled ? 'is-on' : ''}`}>
          <legend><LuWrench aria-hidden="true" /> Modo manutenção</legend>
          <Toggle checked={form.maintenance.enabled} onChange={v => setM({ enabled: v })} label="Ligar manutenção" hint="Mostra a tela com o mascote consertando. Administradores continuam usando tudo." />
          <div className="ctl__radios" role="radiogroup" aria-label="Onde aplicar">
            <label><input type="radio" checked={form.maintenance.scope === 'platform'} onChange={() => setM({ scope: 'platform' })} /> Só a plataforma</label>
            <label><input type="radio" checked={form.maintenance.scope === 'all'} onChange={() => setM({ scope: 'all' })} /> Site inteiro (inclui a página inicial)</label>
          </div>
          <label className="field"><span>Mensagem para os clientes</span>
            <textarea rows="2" maxLength={400} value={form.maintenance.message} onChange={e => setM({ message: e.target.value })} placeholder="Ex.: Estamos atualizando o mapa. Voltamos às 18h." />
          </label>
          <label className="field"><span>Previsão de retorno (opcional)</span>
            <input type="datetime-local" value={form.maintenance.eta || ''} onChange={e => setM({ eta: e.target.value })} />
          </label>
        </fieldset>

        <fieldset className="ctl__box">
          <legend><img className="ctl__ic" src="/icons/megafone.webp" alt="" width="22" height="22" /> Aviso no topo da plataforma</legend>
          <Toggle checked={form.announcement.enabled} onChange={v => setA({ enabled: v })} label="Mostrar aviso" hint="Faixa no topo para todos os clientes (pode ser fechada)." />
          <label className="field"><span>Texto do aviso</span>
            <input maxLength={240} value={form.announcement.text} onChange={e => setA({ text: e.target.value })} placeholder="Ex.: Novidade: agora dá para exportar leads em CSV!" />
          </label>
          <div className="ctl__radios" role="radiogroup" aria-label="Tipo do aviso">
            {[['info', 'Informação'], ['success', 'Novidade'], ['warning', 'Atenção']].map(([v, l]) => (
              <label key={v}><input type="radio" checked={form.announcement.tone === v} onChange={() => setA({ tone: v })} /> {l}</label>
            ))}
          </div>

          <div className="ctl__sub"><img className="ctl__ic" src="/icons/controle.webp" alt="" width="22" height="22" /> Funções do site</div>
          <Toggle checked={form.registrationsOpen} onChange={v => setForm(f => ({ ...f, registrationsOpen: v }))} label="Cadastros abertos" hint="Desligado: ninguém cria conta nova (e-mail ou Google)." />
          <Toggle checked={form.paymentsEnabled} onChange={v => setForm(f => ({ ...f, paymentsEnabled: v }))} label="Pagamentos ativos" hint="Desligado: não gera novos Pix de assinatura." />
          <Toggle checked={form.mappingEnabled} onChange={v => setForm(f => ({ ...f, mappingEnabled: v }))} label="Mapeamentos ativos" hint="Desligado: clientes não rodam novos mapeamentos (útil se a fonte de dados cair)." />
          <div className="ctl__sub"><img className="ctl__ic" src="/icons/moeda.webp" alt="" width="22" height="22" /> Créditos</div>
          <label className="field"><span>Créditos gastos por lead capturado</span>
            <input type="number" min="1" step="1" value={form.creditsPerLead ?? 150} onChange={e => setForm(f => ({ ...f, creditsPerLead: e.target.value === '' ? '' : Number(e.target.value) }))} />
            <small className="muted">Vale para as próximas capturas. Lead que o cliente já tem nunca é cobrado de novo.</small>
          </label>
        </fieldset>
      </div>

      {msg && <p className="form-notice">{msg}</p>}
      {error && <p className="form-error">{error}</p>}
      <div className="ctl__foot">
        <a href="/" target="_blank" rel="noreferrer" className="btn-mini">Ver o site</a>
        <button className="btn btn--primary btn--sm" disabled={busy}><LuSave aria-hidden="true" /> {busy ? 'Salvando…' : 'Salvar configurações'}</button>
      </div>
    </form>
  )
}
