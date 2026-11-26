import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { useSite } from '../lib/site'
import AuthBackground from '../components/AuthBackground'
import GoogleButton from '../components/GoogleButton'

const GOOGLE_ERRORS = {
  google_cancelado: 'O login com Google foi cancelado.',
  google_falhou: 'Não foi possível entrar com o Google. Tente novamente.',
  google_email: 'Sua conta Google não tem um e-mail confirmado.',
  google_indisponivel: 'O login com Google ainda não está disponível.',
  cadastro_fechado: 'Novos cadastros estão temporariamente fechados.',
}

export default function Auth() {
  const [params, setParams] = useSearchParams()
  const modo = params.get('modo')
  const mode = modo === 'cadastro' ? 'register' : modo === 'recuperar' ? 'forgot' : 'login'
  const { user, loading, login, register } = useAuth()
  const { status: site } = useSite()
  const closed = mode === 'register' && site && site.registrationsOpen === false
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', accept: false })
  const [error, setError] = useState(() => GOOGLE_ERRORS[params.get('erro')] || '')
  const [google, setGoogle] = useState(false)
  const [mail, setMail] = useState(true)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const next = params.get('plano') && params.get('plano') !== 'gratuito' ? '/app/planos' : '/app'
  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true })
  }, [loading, user, navigate, next])

  useEffect(() => { api('meta').then(m => { setGoogle(Boolean(m.googleAuth)); setMail(m.mail !== false) }).catch(() => {}) }, [])

  const set = k => e => {
    if (k === 'accept' && e.target.checked) setError('')
    setForm(f => ({ ...f, [k]: k === 'accept' ? e.target.checked : e.target.value }))
  }
  const go = m => { setError(''); setNotice(''); setParams(m ? { modo: m } : {}) }

  const submit = async e => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (mode === 'register' && !form.accept) return setError('Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.')
    setBusy(true)
    try {
      if (mode === 'register') await register(form.name, form.email, form.password, true)
      else if (mode === 'forgot') setNotice((await api('auth/forgot', { method: 'POST', body: { email: form.email } })).message)
      else await login(form.email, form.password)
    } catch (err) {
      setError(err.code === 'DB_NOT_CONFIGURED' ? 'A plataforma ainda está sendo configurada. Tente novamente em instantes.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  const title = { register: 'Crie sua conta', forgot: 'Esqueceu a senha?', login: 'Entre na sua conta' }[mode]
  const lead = {
    register: 'Comece grátis e mapeie sua primeira região em minutos.',
    forgot: 'Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.',
    login: 'Continue de onde parou na sua prospecção.',
  }[mode]

  return (
    <main className="auth">
      <AuthBackground />
      <Link to="/" className="auth__brand" aria-label="Argus — início">
        <img src="/argus-chrome.webp" alt="Argus" width="1400" height="454" />
      </Link>
      <form className="auth__card card" onSubmit={submit}>
        {mode === 'forgot' && <img className="auth__icon" src="/icons/envelope.webp" alt="" width="64" height="64" />}
        <h1>{title}</h1>
        <p className="muted">{lead}</p>
        {google && mode !== 'forgot' && (
          <>
            <GoogleButton next={next} />
            {mode === 'register' && (
              <p className="auth__fine">Ao continuar com Google, você aceita os <Link to="/termos" target="_blank">Termos de Uso</Link> e a <Link to="/privacidade" target="_blank">Política de Privacidade</Link>.</p>
            )}
            <div className="auth__or"><span>ou com e-mail</span></div>
          </>
        )}
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
        {mode !== 'forgot' && (
          <label className="field">
            <span>Senha</span>
            <input type="password" required minLength={8} value={form.password} onChange={set('password')}
              placeholder={mode === 'register' ? 'Mínimo de 8 caracteres' : 'Sua senha'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
          </label>
        )}
        {mode === 'login' && (
          <button type="button" className="link auth__forgot" onClick={() => go('recuperar')}>Esqueci minha senha</button>
        )}
        {mode === 'register' && (
          <label className="auth__terms">
            <input type="checkbox" checked={form.accept} onChange={set('accept')} />
            <span>
              Li e aceito os <Link to="/termos" target="_blank">Termos de Uso</Link> e a{' '}
              <Link to="/privacidade" target="_blank">Política de Privacidade</Link>.
            </span>
          </label>
        )}
        {closed && <p className="form-notice">Novos cadastros estão temporariamente fechados. Se você já tem conta, é só entrar.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-notice" role="status">{notice}</p>}
        {mode === 'forgot' && !mail && <p className="form-notice">A recuperação de senha por e-mail está indisponível no momento. Tente novamente mais tarde.</p>}
        <button className="btn btn--primary btn--block" disabled={busy || closed || (mode === 'forgot' && !mail)}>
          {busy ? 'Aguarde…' : mode === 'register' ? 'Criar conta grátis' : mode === 'forgot' ? 'Enviar link' : 'Entrar'}
        </button>
        <p className="auth__switch">
          {mode === 'forgot' ? (
            <button type="button" className="link" onClick={() => go(null)}>Voltar para o login</button>
          ) : (
            <>
              {mode === 'register' ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
              <button type="button" className="link" onClick={() => go(mode === 'register' ? null : 'cadastro')}>
                {mode === 'register' ? 'Entrar' : 'Criar conta grátis'}
              </button>
            </>
          )}
        </p>
      </form>
    </main>
  )
}
