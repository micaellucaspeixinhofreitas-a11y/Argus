import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LuTrash2 } from 'react-icons/lu'
import { api, fmtDate } from '../lib/api'
import { useAuth } from '../lib/auth'

// Minha conta: dados pessoais, senha e exclusão da conta (LGPD)
export default function Account() {
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [account, setAccount] = useState(null)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState({ name: '', email: '', currentPassword: '' })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [del, setDel] = useState({ confirm: '', currentPassword: '' })
  const [msg, setMsg] = useState({})
  const [busy, setBusy] = useState('')

  const load = d => {
    setAccount(d.user)
    setProfile({ name: d.user.name || '', email: d.user.email, currentPassword: '' })
  }
  useEffect(() => { api('account').then(load).catch(e => setError(e.message)) }, [])

  const run = async (key, fn) => {
    setBusy(key)
    setMsg(m => ({ ...m, [key]: null }))
    try {
      const text = await fn()
      setMsg(m => ({ ...m, [key]: { ok: true, text } }))
    } catch (e) {
      setMsg(m => ({ ...m, [key]: { ok: false, text: e.message } }))
    } finally {
      setBusy('')
    }
  }

  const saveProfile = e => {
    e.preventDefault()
    run('profile', async () => {
      load(await api('account/profile', { method: 'POST', body: profile }))
      await refresh()
      return 'Dados atualizados.'
    })
  }
  const savePassword = e => {
    e.preventDefault()
    run('password', async () => {
      if (pw.newPassword !== pw.confirm) throw new Error('As senhas não conferem.')
      load(await api('account/password', { method: 'POST', body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } }))
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
      return 'Senha salva. As sessões abertas em outros aparelhos foram encerradas.'
    })
  }
  const deleteAccount = e => {
    e.preventDefault()
    run('delete', async () => {
      await api('account/delete', { method: 'POST', body: del })
      await refresh()
      navigate('/', { replace: true })
      return ''
    })
  }

  if (error) return <div className="page"><p className="form-error">{error}</p></div>
  if (!account) return <div className="page"><p className="muted">Carregando…</p></div>
  const emailChanged = profile.email.trim().toLowerCase() !== account.email
  const Note = ({ k }) => msg[k] ? <p className={msg[k].ok ? 'form-notice' : 'form-error'} role="status">{msg[k].text}</p> : null

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <img className="page__icon" src="/icons/usuario.webp" alt="" width="56" height="56" /><p className="eyebrow">// Conta</p><h1>Minha <span className="grad">conta</span></h1>
          <p className="muted">Conta criada em {fmtDate(account.created_at)}{account.google ? ' · vinculada ao Google' : ''}.</p>
        </div>
      </header>

      <div className="account-grid">
        <form className="card account-card" onSubmit={saveProfile}>
          <h2 className="h2-icon"><img src="/icons/usuario.webp" alt="" width="28" height="28" /> Dados pessoais</h2>
          <label className="field"><span>Nome</span>
            <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} autoComplete="name" />
          </label>
          <label className="field"><span>E-mail</span>
            <input type="email" required value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} autoComplete="email" />
          </label>
          {emailChanged && account.has_password && (
            <label className="field"><span>Senha atual (para trocar o e-mail)</span>
              <input type="password" required value={profile.currentPassword} onChange={e => setProfile(p => ({ ...p, currentPassword: e.target.value }))} autoComplete="current-password" />
            </label>
          )}
          <Note k="profile" />
          <button className="btn btn--primary btn--sm" disabled={busy === 'profile'}>{busy === 'profile' ? 'Salvando…' : 'Salvar dados'}</button>
        </form>

        <form className="card account-card" onSubmit={savePassword}>
          <h2 className="h2-icon"><img src="/icons/cadeado.webp" alt="" width="28" height="28" /> {account.has_password ? 'Trocar senha' : 'Criar senha'}</h2>
          {!account.has_password && <p className="muted small">Sua conta entra pelo Google. Crie uma senha se quiser entrar também com e-mail e senha.</p>}
          {account.has_password && (
            <label className="field"><span>Senha atual</span>
              <input type="password" required value={pw.currentPassword} onChange={e => setPw(p => ({ ...p, currentPassword: e.target.value }))} autoComplete="current-password" />
            </label>
          )}
          <label className="field"><span>Nova senha</span>
            <input type="password" required minLength={8} value={pw.newPassword} onChange={e => setPw(p => ({ ...p, newPassword: e.target.value }))} autoComplete="new-password" placeholder="Mínimo de 8 caracteres" />
          </label>
          <label className="field"><span>Confirme a nova senha</span>
            <input type="password" required minLength={8} value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" />
          </label>
          <Note k="password" />
          <button className="btn btn--primary btn--sm" disabled={busy === 'password'}>{busy === 'password' ? 'Salvando…' : 'Salvar senha'}</button>
        </form>

        <form className="card account-card account-card--danger" onSubmit={deleteAccount}>
          <h2><LuTrash2 /> Excluir conta</h2>
          <p className="muted small">
            Apaga definitivamente sua conta, mapeamentos, leads, buscas salvas, créditos e assinaturas. Esta ação não pode ser desfeita.
          </p>
          {account.has_password && (
            <label className="field"><span>Senha atual</span>
              <input type="password" required value={del.currentPassword} onChange={e => setDel(d => ({ ...d, currentPassword: e.target.value }))} autoComplete="current-password" />
            </label>
          )}
          <label className="field"><span>Digite EXCLUIR para confirmar</span>
            <input value={del.confirm} onChange={e => setDel(d => ({ ...d, confirm: e.target.value }))} autoComplete="off" />
          </label>
          <Note k="delete" />
          <button className="btn btn--danger btn--sm" disabled={busy === 'delete' || del.confirm.trim().toUpperCase() !== 'EXCLUIR'}>
            {busy === 'delete' ? 'Excluindo…' : 'Excluir minha conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
