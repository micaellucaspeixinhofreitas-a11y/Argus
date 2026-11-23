import { useEffect, useState } from 'react'
import { api, fmtDate, fmtInt } from '../lib/api'

const blankPlan = { id: '', name: '', description: '', monthly_credits: 0, daily_limit: 0, price_monthly_cents: 0, price_quarterly_cents: 0, features: [], is_default: false, active: true, sort: 10 }

function PlanForm({ plan, onSave }) {
  const [p, setP] = useState({ ...plan, features: (plan.features || []).join('\n') })
  const set = k => e => setP(x => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const save = e => {
    e.preventDefault()
    onSave({
      ...p,
      monthly_credits: Number(p.monthly_credits), daily_limit: Number(p.daily_limit),
      price_monthly_cents: Math.round(Number(String(p.price_monthly_cents).replace(',', '.')) || 0),
      price_quarterly_cents: Math.round(Number(String(p.price_quarterly_cents).replace(',', '.')) || 0),
      sort: Number(p.sort), features: p.features.split('\n').map(s => s.trim()).filter(Boolean),
    })
  }
  return (
    <form className="card admin-plan" onSubmit={save}>
      <div className="admin-plan__grid">
        <label className="field"><span>ID</span><input value={p.id} onChange={set('id')} disabled={Boolean(plan.id)} required /></label>
        <label className="field"><span>Nome</span><input value={p.name} onChange={set('name')} required /></label>
        <label className="field"><span>Créditos/mês</span><input type="number" min="0" value={p.monthly_credits} onChange={set('monthly_credits')} /></label>
        <label className="field"><span>Limite diário</span><input type="number" min="0" value={p.daily_limit} onChange={set('daily_limit')} /></label>
        <label className="field"><span>Mensal (centavos)</span><input type="number" min="0" value={p.price_monthly_cents} onChange={set('price_monthly_cents')} /></label>
        <label className="field"><span>Trimestral (centavos)</span><input type="number" min="0" value={p.price_quarterly_cents} onChange={set('price_quarterly_cents')} /></label>
        <label className="field"><span>Ordem</span><input type="number" value={p.sort} onChange={set('sort')} /></label>
        <label className="field"><span>Descrição</span><input value={p.description} onChange={set('description')} /></label>
      </div>
      <label className="field"><span>Benefícios (um por linha)</span><textarea rows="3" value={p.features} onChange={set('features')} /></label>
      <div className="btn-row">
        <label className="check"><input type="checkbox" checked={p.active} onChange={set('active')} /> Ativo</label>
        <label className="check"><input type="checkbox" checked={p.is_default} onChange={set('is_default')} /> Plano padrão (sem assinatura)</label>
        <button className="btn btn--primary btn--sm">Salvar plano</button>
      </div>
    </form>
  )
}

export default function Admin() {
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [choice, setChoice] = useState({})

  const load = () => api('admin/overview').then(setData).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const act = async (fn, okMsg) => {
    setError(''); setMsg('')
    try { await fn(); setMsg(okMsg); load() } catch (e) { setError(e.message) }
  }

  if (!data) return <div className="page">{error ? <p className="form-error">{error}</p> : <p className="muted">Carregando…</p>}</div>

  return (
    <div className="page">
      <header className="page__head"><div><h1>Administração</h1><p className="muted">Planos, limites, usuários e assinaturas.</p></div></header>
      {msg && <p className="form-notice">{msg}</p>}
      {error && <p className="form-error">{error}</p>}
      <div className="stat-grid">
        <div className="card stat-card"><small>Usuários</small><strong>{fmtInt(data.totals.users)}</strong></div>
        <div className="card stat-card"><small>Empresas na base</small><strong>{fmtInt(data.totals.companies)}</strong></div>
        <div className="card stat-card"><small>Leads capturados</small><strong>{fmtInt(data.totals.leads)}</strong></div>
        <div className="card stat-card"><small>Mapeamentos</small><strong>{fmtInt(data.totals.runs)}</strong></div>
      </div>

      <h2>Planos</h2>
      {data.plans.map(p => <PlanForm key={p.id + p.updated_at} plan={p} onSave={body => act(() => api('admin/plans', { method: 'POST', body }), 'Plano salvo.')} />)}
      <details className="card"><summary>Novo plano</summary><PlanForm plan={blankPlan} onSave={body => act(() => api('admin/plans', { method: 'POST', body }), 'Plano criado.')} /></details>

      <h2>Usuários</h2>
      <div className="table-wrap card">
        <table className="table">
          <thead><tr><th>Usuário</th><th>Assinatura</th><th>Uso</th><th>Ações</th></tr></thead>
          <tbody>
            {data.users.map(u => {
              const c = choice[u.id] || { planId: data.plans.find(p => !p.is_default)?.id || data.plans[0]?.id, period: 'monthly', credits: '' }
              const setC = patch => setChoice(x => ({ ...x, [u.id]: { ...c, ...patch } }))
              return (
                <tr key={u.id}>
                  <td><strong>{u.name || '—'}</strong>{u.is_admin && <span className="flag flag--fit">admin</span>}<small className="muted block">{u.email} · desde {fmtDate(u.created_at)}</small></td>
                  <td>{u.subscription ? <>{u.subscription.plan_id} · {u.subscription.status}<small className="muted block">{u.subscription.current_period_end ? `até ${fmtDate(u.subscription.current_period_end)}` : ''}</small></> : <span className="muted">Plano padrão</span>}</td>
                  <td>{fmtInt(u.leads)} leads<small className="muted block">{fmtInt(u.runs)} mapeamentos</small></td>
                  <td className="admin-actions">
                    <select value={c.planId} onChange={e => setC({ planId: e.target.value })}>{data.plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                    <select value={c.period} onChange={e => setC({ period: e.target.value })}><option value="monthly">Mensal</option><option value="quarterly">Trimestral</option></select>
                    <button className="btn-mini" onClick={() => act(() => api('admin/subscription', { method: 'POST', body: { userId: u.id, action: 'activate', planId: c.planId, period: c.period } }), 'Assinatura ativada.')}>Ativar</button>
                    <button className="btn-mini btn-mini--danger" onClick={() => act(() => api('admin/subscription', { method: 'POST', body: { userId: u.id, action: 'cancel' } }), 'Assinatura cancelada.')}>Cancelar</button>
                    <input type="number" placeholder="± créditos" value={c.credits} onChange={e => setC({ credits: e.target.value })} />
                    <button className="btn-mini" onClick={() => act(() => api('admin/credits', { method: 'POST', body: { userId: u.id, amount: Number(c.credits) } }), 'Créditos ajustados.')}>Aplicar</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
