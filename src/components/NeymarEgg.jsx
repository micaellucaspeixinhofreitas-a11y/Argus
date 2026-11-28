import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import './NeymarEgg.css'

// Easter egg do Neymar na página inicial.
// Como achar: digitar "neymar" em qualquer lugar da página, ou tocar 7 vezes seguidas no logo.
// O bônus de 1000 créditos é dado pelo servidor, uma única vez por conta.
export const NEYMAR_PENDING = 'argus:neymar'
const WORD = 'neymar'
const TAPS = 7

export async function claimNeymar() {
  return api('easter/neymar', { method: 'POST', body: {} })
}

export default function NeymarEgg() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState({ busy: false, msg: '' })
  const { user, setCredits } = useAuth()
  const navigate = useNavigate()
  const typed = useRef('')
  const taps = useRef({ n: 0, t: 0 })

  useEffect(() => {
    const onKey = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return
      if (/^(input|textarea|select)$/i.test(e.target?.tagName || '') || e.target?.isContentEditable) return
      typed.current = (typed.current + e.key.toLowerCase()).slice(-WORD.length)
      if (typed.current === WORD) { typed.current = ''; setOpen(true) }
    }
    // toques seguidos no logo (celular)
    const onClick = e => {
      if (!e.target.closest?.('.brand')) return
      const now = Date.now()
      taps.current = now - taps.current.t < 600 ? { n: taps.current.n + 1, t: now } : { n: 1, t: now }
      if (taps.current.n >= TAPS) { taps.current = { n: 0, t: 0 }; setOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick) }
  }, [])

  useEffect(() => {
    if (!open) return
    const onEsc = e => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [open])

  const close = () => { setOpen(false); setState({ busy: false, msg: '' }) }

  const claim = async () => {
    // sem conta: guarda o resgate e manda criar conta; a plataforma resgata ao entrar
    if (!user) {
      try { localStorage.setItem(NEYMAR_PENDING, '1') } catch { /* armazenamento indisponível */ }
      navigate('/entrar?modo=cadastro')
      return
    }
    setState({ busy: true, msg: '' })
    try {
      const r = await claimNeymar()
      if (r.credits) setCredits(r.credits)
      setState({ busy: false, done: true, msg: r.granted ? 'Golaço! +1000 créditos na sua conta. ⚽' : 'Você já resgatou esse bônus. 😉' })
    } catch (e) {
      setState({ busy: false, msg: e.message || 'Não deu para resgatar agora.' })
    }
  }

  if (!open) return null
  return (
    <div className="neymar" role="dialog" aria-modal="true" aria-label="Easter egg do Neymar" onClick={close}>
      <div className="neymar__card" onClick={e => e.stopPropagation()}>
        <button className="neymar__x" aria-label="Fechar" onClick={close}>×</button>
        <img src={`${import.meta.env.BASE_URL}neymar.webp`} alt="Neymar com a camisa do Santos" className="neymar__img" width="640" height="674" />
        <h2 className="neymar__title">Você achou o Neymar!</h2>
        <p className="neymar__text">Ganhe <strong>1000 créditos</strong> de presente.</p>
        {state.msg && <p className="neymar__msg">{state.msg}</p>}
        {state.done
          ? <button className="btn btn--primary" onClick={() => navigate('/app')}>Ir para a plataforma</button>
          : <button className="btn btn--primary" onClick={claim} disabled={state.busy}>
              {state.busy ? 'Resgatando…' : user ? 'Resgatar 1000 créditos' : 'Criar conta e resgatar'}
            </button>}
      </div>
    </div>
  )
}
