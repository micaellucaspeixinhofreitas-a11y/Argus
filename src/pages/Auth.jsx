import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Glass from '../components/Glass'

export default function Auth() {
  const [params, setParams] = useSearchParams()
  const mode = params.get('modo') === 'cadastro' ? 'register' : 'login'
  const { user, loading, login, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const next = params.get('plano') && params.get('plano') !== 'gratuito' ? '/app/planos' : '/app'
  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true })
  }, [loading, user, navigate, next])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const submit = async e => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'register') await register(form.name, form.email, form.password)
      else await login(form.email, form.password)
    } catch (err) {
      setError(err.code === 'DB_NOT_CONFIGURED' ? 'A plataforma ainda está sendo configurada. Tente novamente em instantes.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth">
      <div className="auth__glow" aria-hidden="true" />
      <Link to="/" className="auth__brand" aria-label="Argus — início">
        <img src="/argus-wordmark.webp" alt="Argus" width="1410" height="622" />
      </Link>
      <form className="auth__card card has-glass" onSubmit={submit}>
        <Glass radius={20} refract />
        <h1>{mode === 'register' ? 'Crie sua conta' : 'Entre na sua conta'}</h1>
        <p className="muted">
          {mode === 'register' ? 'Comece grátis e mapeie sua primeira região em minutos.' : 'Continue de onde parou na sua prospecção.'}
        </p>
        {mode === 'register' && (
          <label className="field">
            <span>Nome</span>
            <input value={form.name} onChange={set('name')} placeholder="Como devemos te chamar?" autoComplete="name" />
          </label>
        )}
        <label className="field">
          <span>E-mail</span>
          <input type="email" required value={form.email} onChange={set('email')} placeholder="voce@empresa.com" autoComplete="email" />
        </label>
        <label className="field">
          <span>Senha</span>
          <input type="password" required minLength={8} value={form.password} onChange={set('password')}
            placeholder={mode === 'register' ? 'Mínimo de 8 caracteres' : 'Sua senha'}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'register' ? 'Criar conta grátis' : 'Entrar'}
        </button>
        <p className="auth__switch">
          {mode === 'register' ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
          <button type="button" className="link" onClick={() => { setError(''); setParams(mode === 'register' ? {} : { modo: 'cadastro' }) }}>
            {mode === 'register' ? 'Entrar' : 'Criar conta grátis'}
          </button>
        </p>
      </form>
    </main>
  )
}
