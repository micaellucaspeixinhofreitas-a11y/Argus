import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Magnetic from '../components/Magnetic'
import Icon from '../components/Icons'

const line1 = ['Encontre', 'clientes', 'em']
const line2 = ['qualquer', 'território.']

export default function Hero({ ready }) {
  const { user } = useAuth()
  const root = useRef(null)
  const logo = useRef(null)

  // animação de entrada (dispara quando o preloader termina)
  useEffect(() => {
    if (!ready) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.from('.hero__word > span', { yPercent: 115, rotate: 6, duration: 1.3, stagger: 0.07 })
        .from('.hero__eyebrow', { opacity: 0, y: 20, duration: 1 }, 0.2)
        .from('.hero__lead, .hero__ctas', { opacity: 0, y: 30, duration: 1.1, stagger: 0.12 }, 0.5)
        .from('.hero__logo', { opacity: 0, scale: 0.85, x: 120, rotate: -8, duration: 2 }, 0.1)
        .from('.hero__hud > *', { opacity: 0, y: 10, duration: 0.8, stagger: 0.08 }, 0.9)
    }, root)
    return () => ctx.revert()
  }, [ready])

  // parallax do logo cromado com o mouse e com o scroll
  useEffect(() => {
    const el = logo.current
    const ctx = gsap.context(() => {
      gsap.to(el, {
        yPercent: 40, rotate: 6, ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      })
    }, root)
    if (!window.matchMedia('(pointer: fine)').matches) return () => ctx.revert()
    const rx = gsap.quickTo(el, 'rotateY', { duration: 1.2, ease: 'power3' })
    const ry = gsap.quickTo(el, 'rotateX', { duration: 1.2, ease: 'power3' })
    const move = e => {
      rx((e.clientX / window.innerWidth - 0.5) * 18)
      ry((e.clientY / window.innerHeight - 0.5) * -14)
    }
    window.addEventListener('pointermove', move)
    return () => { window.removeEventListener('pointermove', move); ctx.revert() }
  }, [])

  return (
    <section className="hero" id="top" ref={root}>
      <div className="hero__grid" aria-hidden="true" />
      <div className="hero__glow" aria-hidden="true" />

      <div className="container hero__inner">
        <div className="hero__content">
          <p className="hero__eyebrow eyebrow">
            <span className="pulse" /> Prospecção comercial geolocalizada
          </p>
          <h1 className="hero__title">
            <span className="hero__line">
              {line1.map(w => <span className="hero__word" key={w}><span>{w}</span></span>)}
            </span>
            <span className="hero__line">
              {line2.map(w => (
                <span className={`hero__word ${w === 'território.' ? 'grad' : ''}`} key={w}><span>{w}</span></span>
              ))}
            </span>
          </h1>
          <p className="hero__lead">
            A <strong>Argus</strong> transforma uma região do mapa em uma área de prospecção: defina o segmento,
            marque o território e descubra empresas reais, qualificadas pelo que você procura — prontas para
            virar seus leads.
          </p>
          <div className="hero__ctas">
            <Magnetic>
              <Link to={user ? '/app' : '/entrar?modo=cadastro'} className="btn btn--primary">
                {user ? 'Abrir plataforma' : 'Começar grátis'} <Icon name="arrow" size={18} />
              </Link>
            </Magnetic>
            <Magnetic>
              <a href="#como-funciona" className="btn btn--ghost">Como funciona</a>
            </Magnetic>
          </div>
        </div>

        <div className="hero__visual" aria-hidden="true">
          <div className="hero__orbit"><span /><span /><span /></div>
          <img ref={logo} src={`${import.meta.env.BASE_URL}argus-chrome.webp`} alt="" className="hero__logo" />
        </div>
      </div>

      <div className="container hero__hud" aria-hidden="true">
        <span>[ 01 — ALVO ]</span>
        <span>[ 02 — TERRITÓRIO ]</span>
        <span>[ 03 — LEADS ]</span>
        <a href="#como-funciona" className="scroll-cue">Role <i /></a>
      </div>
    </section>
  )
}
