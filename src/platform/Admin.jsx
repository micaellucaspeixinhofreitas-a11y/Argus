import { useEffect, useState } from 'react'
import { api, money, fmtDate, fmtDateTime, fmtInt } from '../lib/api'
import SiteControl from './SiteControl'

const blankPlan = { id: '', name: '', description: '', monthly_credits: 0, daily_limit: 0, price_monthly_cents: 0, price_quarterly_cents: 0, features: [], is_default: false, active: true, sort: 10 }

function PlanForm({ plan, onSave, onDelete }) {
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
        <label className="field"><span>Buscas por dia</span><input type="number" min="0" value={p.daily_limit} onChange={set('daily_limit')} /></label>
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
        {onDelete && (
          <button type="button" className="btn-mini btn-mini--danger admin-plan__delete" onClick={() => {
            if (window.confirm(`Excluir o plano "${plan.name}"? Ele some da página de planos. Assinaturas antigas ficam no histórico.`)) onDelete(plan.id)
          }}>Excluir plano</button>
        )}
      </div>
    </form>
  )
}

const SECURITY_EVENTS = {"password_reset": "Senha redefinida por link", "account_recovery": "Recuperação de emergência usada", "account_password": "Senha trocada na conta", "account_profile": "Dados da conta alterados", "admin_subscription": "Assinatura alterada pelo admin", "admin_coupon": "Cupom criado/alterado", "coupon_free_activation": "Plano liberado com cupom de 100%"}
const LIMIT_KINDS = { register: 'Cadastro', geo_search: 'Pesquisa de endereço', coupon_check: 'Teste de cupom', payment_pix: 'Geração de Pix', password_reset_try: 'Redefinição de senha' }

const blankCoupon = { code: '', description: '', kind: 'percent', percent_off: 20, amount: '', plan_id: '', period: '', max_redemptions: '', max_per_user: 1, expires_at: '' }

function CouponForm({ plans, onSave }) {
  const [c, setC] = useState(blankCoupon)
  const set = k => e => setC(x => ({ ...x, [k]: e.target.value }))
  const submit = e => {
    e.preventDefault()
    onSave({
      ...c,
      percent_off: Number(c.percent_off),
      amount_off_cents: Math.round(Number(String(c.amount).replace(',', '.')) * 100),
      max_redemptions: Number(c.max_redemptions) || null,
      max_per_user: Number(c.max_per_user) || 0,
      expires_at: c.expires_at ? `${c.expires_at}T23:59:59-03:00` : null,
    }).then(ok => ok && setC(blankCoupon))
  }
  return (
    <form className="card coupon-form" onSubmit={submit}>
      <label className="field"><span>Código</span><input required value={c.code} onChange={e => setC(x => ({ ...x, code: e.target.value.toUpperCase() }))} placeholder="LANCAMENTO20" /></label>
      <label className="field"><span>Tipo</span>
        <select value={c.kind} onChange={set('kind')}><option value="percent">Porcentagem</option><option value="amount">Valor fixo (R$)</option></select>
      </label>
      {c.kind === 'percent'
        ? <label className="field"><span>Desconto (%)</span><input type="number" min="1" max="100" required value={c.percent_off} onChange={set('percent_off')} /></label>
        : <label className="field"><span>Desconto (R$)</span><input inputMode="decimal" required value={c.amount} onChange={set('amount')} placeholder="20,00" /></label>}
      <label className="field"><span>Plano</span>
        <select value={c.plan_id} onChange={set('plan_id')}><option value="">Todos os pagos</option>{plans.filter(p => p.price_monthly_cents || p.price_quarterly_cents).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </label>
      <label className="field"><span>Período</span>
        <select value={c.period} onChange={set('period')}><option value="">Mensal e trimestral</option><option value="monthly">Só mensal</option><option value="quarterly">Só trimestral</option></select>
      </label>
      <label className="field"><span>Limite de usos</span><input type="number" min="1" value={c.max_redemptions} onChange={set('max_redemptions')} placeholder="Sem limite" /></label>
      <label className="field"><span>Usos por pessoa</span><input type="number" min="1" value={c.max_per_user} onChange={set('max_per_user')} /></label>
      <label className="field"><span>Válido até</span><input type="date" value={c.expires_at} onChange={set('expires_at')} /></label>
      <label className="field"><span>Descrição (interna)</span><input value={c.description} onChange={set('description')} placeholder="Campanha de lançamento" /></label>
      <button className="btn btn--primary btn--sm">Criar cupom</button>
    </form>
  )
}

export default function Admin() {
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [choice, setChoice] = useState({})

  const [runs, setRuns] = useState([])
  const [coupons, setCoupons] = useState([])
  const [security, setSecurity] = useState(null)
  const load = () => {
    api('admin/security').then(setSecurity).catch(() => {})
    api('admin/overview').then(setData).catch(e => setError(e.message))
    api('admin/coupons').then(d => setCoupons(d.coupons)).catch(() => {})
    api('admin/runs').then(d => setRuns(d.runs)).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const act = async (fn, okMsg) => {
    setError(''); setMsg('')
    try { await fn(); setMsg(okMsg); load() } catch (e) { setError(e.message) }
  }

  if (!data) return <div className="page">{error ? <p className="form-error">{error}</p> : <p className="muted">Carregando…</p>}</div>

  return (
    <div className="page">
      <header className="page__head"><div><img className="page__icon" src="/icons/engrenagem.webp" alt="" width="56" height="56" /><p className="eyebrow">// Admin</p><h1><span className="grad">Administração</span></h1><p className="muted">Planos, limites, usuários e assinaturas.</p></div></header>
      {msg && <p className="form-notice">{msg}</p>}
      {error && <p className="form-error">{error}</p>}
      <div className="stat-grid">
        <div className="card stat-card"><small>Usuários</small><strong>{fmtInt(data.totals.users)}</strong></div>
        <div className="card stat-card"><small>Empresas na base</small><strong>{fmtInt(data.totals.companies)}</strong></div>
        <div className="card stat-card"><small>Leads capturados</small><strong>{fmtInt(data.totals.leads)}</strong></div>
        <div className="card stat-card"><small>Mapeamentos</small><strong>{fmtInt(data.totals.runs)}</strong></div>
      </div>

      <SiteControl />

      <h2 className="h2-icon"><img src="/icons/escudo.webp" alt="" width="26" height="26" /> Atividade suspeita · 24 h</h2>
      {security && (
        <div className="sec-grid">
          <div className="card">
            <h3 className="h3-icon"><img src="/icons/olho.webp" alt="" width="20" height="20" /> Falhas de login</h3>
            {security.bursts.length > 0 && (
              <p className="form-error">Possível ataque: {security.bursts.map(b => `${b.n} falhas em 1 min para ${b.email}`).join(' · ')}</p>
            )}
            {security.failedLogins.length === 0 ? <p className="muted small">Nenhuma falha de login nas últimas 24 horas.</p> : (
              <ul className="activity">
                {security.failedLogins.map(f => (
                  <li key={f.email}><span className={`activity__dot ${f.n >= 5 ? 'is-alert' : ''}`} /><div><strong>{f.email}</strong><small>última em {fmtDateTime(f.last)}</small></div><span className="activity__num">{fmtInt(f.n)} falha(s)</span></li>
                ))}
              </ul>
            )}
          </div>
          <div className="card">
            <h3 className="h3-icon"><img src="/icons/martelo.webp" alt="" width="20" height="20" /> Bloqueios por excesso de requisições</h3>
            {security.rateLimited.length === 0 ? <p className="muted small">Nenhum bloqueio nas últimas 24 horas.</p> : (
              <ul className="activity">
                {security.rateLimited.map(r => (
                  <li key={r.kind}><span className="activity__dot is-alert" /><div><strong>{LIMIT_KINDS[r.kind] || r.kind}</strong><small>último em {fmtDateTime(r.last)}</small></div><span className="activity__num">{fmtInt(r.n)} bloqueio(s)</span></li>
                ))}
              </ul>
            )}
          </div>
          <div className="card sec-grid__wide">
            <h3>Ações sensíveis recentes</h3>
            {security.events.length === 0 ? <p className="muted small">Nenhuma ação sensível registrada.</p> : (
              <ul className="activity">
                {security.events.map((e, i) => (
                  <li key={i}><span className="activity__dot" /><div><strong>{SECURITY_EVENTS[e.type] || e.type}</strong><small>{e.email || '—'} · {fmtDateTime(e.created_at)}</small></div></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <h2 className="h2-icon"><img src="/icons/coroa.webp" alt="" width="26" height="26" /> Planos</h2>
      {data.plans.map(p => (
        <PlanForm key={p.id + p.updated_at} plan={p}
          onSave={body => act(() => api('admin/plans', { method: 'POST', body }), 'Plano salvo.')}
          onDelete={p.is_default ? null : async id => {
            setError(''); setMsg('')
            try {
              const r = await api('admin/plans/delete', { method: 'POST', body: { id } })
              setMsg(r.result === 'arquivado' ? `Plano "${p.name}" excluído. O histórico de assinaturas dele foi mantido.` : `Plano "${p.name}" excluído.`)
              load()
            } catch (e) { setError(e.message) }
          }} />
      ))}
      <details className="card"><summary>Novo plano</summary><PlanForm plan={blankPlan} onSave={body => act(() => api('admin/plans', { method: 'POST', body }), 'Plano criado.')} /></details>

      <h2 className="h2-icon"><img src="/icons/cupom.webp" alt="" width="26" height="26" /> Cupons de desconto</h2>
      <details className="card"><summary>Novo cupom</summary>
        <CouponForm plans={data.plans} onSave={async body => {
          setError(''); setMsg('')
          try { setCoupons((await api('admin/coupons', { method: 'POST', body })).coupons); setMsg(`Cupom ${body.code} salvo.`); return true }
          catch (e) { setError(e.message); return false }
        }} />
      </details>
      <div className="table-wrap card">
        <table className="table table--cards">
          <thead><tr><th>Cupom</th><th>Desconto</th><th>Regras</th><th>Usos</th><th></th></tr></thead>
          <tbody>
            {coupons.length === 0 && <tr><td colSpan="5" className="muted">Nenhum cupom criado.</td></tr>}
            {coupons.map(c => {
              const expired = c.expires_at && new Date(c.expires_at) < new Date()
              return (
                <tr key={c.id}>
                  <td data-label="Cupom"><strong className="mono">{c.code}</strong>
                    {!c.active ? <span className="flag">desativado</span> : expired ? <span className="flag flag--noweb">expirado</span> : <span className="flag flag--fit">ativo</span>}
                    {c.description && <small className="muted block">{c.description}</small>}</td>
                  <td data-label="Desconto">{c.percent_off ? `${c.percent_off}%` : money(c.amount_off_cents)}</td>
                  <td data-label="Regras"><small className="muted">
                    {c.plan_id ? `Plano ${c.plan_id}` : 'Todos os planos'} · {c.period === 'monthly' ? 'mensal' : c.period === 'quarterly' ? 'trimestral' : 'qualquer período'}
                    <span className="block">{c.max_per_user ? `${c.max_per_user} uso(s) por pessoa` : 'usos ilimitados por pessoa'}{c.expires_at ? ` · até ${fmtDate(c.expires_at)}` : ''}</span></small></td>
                  <td data-label="Usos">{fmtInt(c.paid)} pago(s){c.max_redemptions ? ` de ${fmtInt(c.max_redemptions)}` : ''}<small className="muted block">{fmtInt(c.pending)} aguardando pagamento</small></td>
                  <td data-label="Ações"><button className="btn-mini" onClick={() => act(async () => setCoupons((await api('admin/coupons/toggle', { method: 'POST', body: { code: c.code } })).coupons), c.active ? 'Cupom desativado.' : 'Cupom ativado.')}>{c.active ? 'Desativar' : 'Ativar'}</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h2 className="h2-icon"><img src="/icons/codigo.webp" alt="" width="26" height="26" /> Últimos mapeamentos</h2>
      <div className="table-wrap card">
        <table className="table table--cards">
          <thead><tr><th>Quando</th><th>Usuário</th><th>Busca</th><th>Resultado</th></tr></thead>
          <tbody>
            {runs.length === 0 && <tr><td colSpan="4" className="muted">Nenhum mapeamento ainda.</td></tr>}
            {runs.map(r => (
              <tr key={r.id}>
                <td data-label="Quando">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                <td data-label="Usuário">{r.email}</td>
                <td data-label="Busca">{(r.config.segments || []).join(', ') || 'Todos'} · {r.config.areas?.length || 0} área(s) · {r.provider}</td>
                <td data-label="Resultado">{r.status === 'done' ? `${r.total} empresas` : <span className="flag flag--noweb">{r.status}{r.error ? `: ${r.error}` : ''}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="h2-icon"><img src="/icons/usuario.webp" alt="" width="26" height="26" /> Usuários</h2>
      <div className="table-wrap card">
        <table className="table table--cards">
          <thead><tr><th>Usuário</th><th>Assinatura</th><th>Uso</th><th>Ações</th></tr></thead>
          <tbody>
            {data.users.map(u => {
              const c = choice[u.id] || { planId: data.plans.find(p => !p.is_default)?.id || data.plans[0]?.id, period: 'monthly', credits: '' }
              const setC = patch => setChoice(x => ({ ...x, [u.id]: { ...c, ...patch } }))
              return (
                <tr key={u.id}>
                  <td data-label="Usuário"><strong>{u.name || '—'}</strong>{u.is_admin && <span className="flag flag--fit">admin</span>}<small className="muted block">{u.email} · desde {fmtDate(u.created_at)}</small></td>
                  <td data-label="Assinatura">{u.subscription ? <>{u.subscription.plan_id} · {u.subscription.status}
                    {u.subscription.payment_reported_at && u.subscription.status === 'pending_payment' && <span className="flag flag--noweb block">Pix informado · {u.subscription.payment_reference}</span>}<small className="muted block">{u.subscription.current_period_end ? `até ${fmtDate(u.subscription.current_period_end)}` : ''}</small></> : <span className="muted">Plano padrão</span>}</td>
                  <td data-label="Uso">{fmtInt(u.leads)} leads<small className="muted block">{fmtInt(u.runs)} mapeamentos</small></td>
                  <td className="admin-actions" data-label="Ações">
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
