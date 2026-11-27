import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { nav } from '../data'
import Magnetic from '../components/Magnetic'
import Glass from '../components/Glass'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const ctaHref = user ? '/app' : '/entrar?modo=cadastro'
  const ctaLabel = user ? 'Abrir plataforma' : 'Começar grátis'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  return (
    <header className={`header ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="container header__inner header__bar">
        <a href="#top" className="brand" aria-label="Argus — início">
          <img src={`${import.meta.env.BASE_URL}argus-white.webp`} alt="Argus" className="brand__word" width="1400" height="423" />
        </a>

        <nav className="nav" aria-label="Principal">
          {nav.map(item => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              <span className="nav__clip"><span data-text={item.label}>{item.label}</span></span>
            </a>
          ))}
          {!user && <Link className="nav__mobile-link" to="/entrar" onClick={() => setOpen(false)}>Entrar</Link>}
          <Link className="nav__mobile-cta btn btn--primary" to={ctaHref} onClick={() => setOpen(false)}>
            {ctaLabel}
          </Link>
        </nav>

        <div className="header__actions">
          {!user && <Link className="header__login" to="/entrar">Entrar</Link>}
          <Magnetic>
            <Link className="btn btn--ghost btn--sm has-glass" to={ctaHref}><Glass radius={21} />{ctaLabel}</Link>
          </Magnetic>
          <button
            className="burger"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
          >
            <span /><span />
          </button>
        </div>
      </div>
    </header>
  )
}
