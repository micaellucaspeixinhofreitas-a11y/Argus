import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { planIcon } from '../lib/planIcon'

// Menu da conta: abre ao clicar na foto de perfil
export default function AccountMenu() {
  const { user, logout, credits } = useAuth()
  const plan = credits?.plan
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase()

  useEffect(() => {
    if (!open) return
    const close = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const esc = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  const item = (to, icon, label) => (
    <Link to={to} role="menuitem" className="acct__item" onClick={() => setOpen(false)}>
      <img src={`/icons/${icon}.webp`} alt="" width="22" height="22" />{label}
    </Link>
  )

  return (
    <div className="acct" ref={ref}>
      <button className="topbar__avatar" aria-haspopup="menu" aria-expanded={open} aria-label="Abrir menu da conta" onClick={() => setOpen(o => !o)}>
        {initial}
      </button>
      {open && (
        <div className="acct__menu" role="menu">
          <div className="acct__who">
            <span className="acct__big">{initial}</span>
            <span>
              <strong>{user.name || 'Minha conta'}</strong>
              <small>{user.email}</small>
            </span>
            {plan && <em className="acct__pro" title={`Plano ${plan.name}`}><img src={planIcon(plan)} alt="" width="16" height="16" />{plan.name}</em>}
          </div>
          {item('/app/conta', 'usuario', 'Minha conta e senha')}
          {item('/app/planos', 'coroa', 'Plano e assinatura')}
          {item('/app/creditos', 'moeda', 'Créditos')}
          {user.is_admin && item('/app/admin', 'engrenagem', 'Administração')}
          <button role="menuitem" className="acct__item acct__item--out" onClick={async () => { setOpen(false); await logout(); navigate('/') }}>
            <span className="acct__spacer" aria-hidden="true" />Sair da conta
          </button>
        </div>
      )}
    </div>
  )
}
