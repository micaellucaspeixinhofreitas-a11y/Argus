import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

// Página aberta pelo link do e-mail de redefinição de senha
export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError('')
    if (password !== confirm) return setError('As senhas não conferem.')
    setBusy(true)
    try {
      await api('auth/reset', { method: 'POST', body: { token, password } })
      await refresh()
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth">
      <div className="auth__glow" aria-hidden="true" />
      <Link to="/" className="auth__brand" aria-label="Argus — início">
        <img src="/argus-chrome.webp" alt="Argus" width="1400" height="454" />
      </Link>
      <form className="auth__card card" onSubmit={submit}>
        <h1>Crie uma nova senha</h1>
        {!token ? (
          <>
            <p className="form-error">Link incompleto. Abra o link exatamente como chegou no seu e-mail.</p>
            <Link to="/entrar?modo=recuperar" className="btn btn--primary btn--block">Pedir novo link</Link>
          </>
        ) : (
          <>
            <p className="muted">Escolha uma senha com pelo menos 8 caracteres. Ao salvar, as sessões abertas em outros aparelhos são encerradas.</p>
            <label className="field">
              <span>Nova senha</span>
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            </label>
            <label className="field">
              <span>Confirme a nova senha</span>
              <input type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error} {/expirado|inválido/i.test(error) && <Link to="/entrar?modo=recuperar">Pedir novo link</Link>}
              </p>
            )}
            <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
          </>
        )}
      </form>
    </main>
  )
}
