/*
  Página inicial da Argus — direção das referências do cliente:
  arco de luz roxo no topo, título centralizado, painel do produto logo abaixo, cubos 3D,
  grade "bento" de recursos com visuais em brilho roxo, tablet inclinado com a interface,
  números grandes em roxo e fechamento com o arco de novo.
  Conteúdo real da Argus (nada de logos ou depoimentos inventados; empresas da demo são fictícias).
*/
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiOpenstreetmap, SiTomtom, SiWhatsapp, SiGooglesheets } from 'react-icons/si'
import { LuArrowRight, LuPlus, LuMenu, LuX, LuFileSpreadsheet, LuCheck, LuSparkles, LuTarget, LuMap, LuPhone, LuFilter, LuDownload } from 'react-icons/lu'
import { api, money, fmtInt } from '../lib/api'
import { useAuth } from '../lib/auth'
import { faq } from '../data'
import AppFrame from './AppFrame'
import { useTick, useInView } from './useLive'
import './landing.css'

const NAV = [['Recursos', '#recursos'], ['Como funciona', '#como-funciona'], ['Planos', '#planos'], ['Dúvidas', '#duvidas']]

function useCta() {
  const { user } = useAuth()
  return user ? { to: '/app', label: 'Abrir a plataforma' } : { to: '/entrar?modo=cadastro', label: 'Começar grátis' }
}

/* cubo 3D (CSS): faces escuras com borda de luz roxa */
function Cube({ size, style, className = '' }) {
  return (
    <div className={`cube ${className}`} style={{ '--c': `${size}px`, ...style }} aria-hidden="true">
      <div className="cube__in">{['f', 'b', 'l', 'r', 't', 'd'].map(f => <i key={f} className={`cube__${f}`} />)}</div>
    </div>
  )
}

/* ---------------- menu ---------------- */
function Header() {
  const { user } = useAuth()
  const cta = useCta()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [open])
  return (
    <header className={`lp-nav ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="lp-wrap lp-nav__in">
        <a href="#topo" className="lp-nav__logo" aria-label="Argus, início"><img src="/argus-white.webp" alt="Argus" width="1400" height="423" /></a>
        <nav className="lp-nav__pill" aria-label="Seções">
          {NAV.map(([l, h]) => <a key={h} href={h}>{l}</a>)}
        </nav>
        <div className="lp-nav__actions">
          {!user && <Link to="/entrar" className="lp-nav__login">Entrar</Link>}
          <Link to={cta.to} className="lp-btn lp-btn--sm">{cta.label} <LuArrowRight aria-hidden="true" /></Link>
          <button className="lp-nav__menu" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} onClick={() => setOpen(o => !o)}>
            {open ? <LuX /> : <LuMenu />}
          </button>
        </div>
      </div>
      <div className="lp-nav__sheet" hidden={!open}>
        {NAV.map(([l, h]) => <a key={h} href={h} onClick={() => setOpen(false)}>{l}</a>)}
        {!user && <Link to="/entrar" onClick={() => setOpen(false)}>Entrar</Link>}
        <Link to={cta.to} className="lp-btn" onClick={() => setOpen(false)}>{cta.label}</Link>
      </div>
    </header>
  )
}

/* ---------------- topo: arco de luz + título + painel ---------------- */
function Hero() {
  const cta = useCta()
  return (
    <section className="lp-hero" id="topo" data-enter>
      <div className="lp-hero__sky" aria-hidden="true">
        <span className="lp-hero__grid" />
        <span className="lp-hero__bloom" />
        <span className="lp-hero__arc" />
      </div>
      <Cube size={92} className="cube--a" />
      <Cube size={64} className="cube--b" />
      <Cube size={110} className="cube--c" />
      <Cube size={54} className="cube--d" />
      <div className="lp-wrap lp-hero__copy">
        <p className="lp-badge" style={{ '--e': 0 }}><LuSparkles aria-hidden="true" /> Prospecção B2B por mapa</p>
        <h1 style={{ '--e': 1 }}>Encontre clientes em <span>qualquer território.</span></h1>
        <p className="lp-hero__lead" style={{ '--e': 2 }}>
          Escolha o segmento, marque a região no mapa e receba até 100 empresas por busca com telefone,
          WhatsApp, site e endereço, já separadas por quem tem mais chance de comprar de você.
        </p>
        <div className="lp-hero__actions" style={{ '--e': 3 }}>
          <Link to={cta.to} className="lp-btn">{cta.label} <LuArrowRight aria-hidden="true" /></Link>
          <a href="#como-funciona" className="lp-btn lp-btn--ghost">Ver como funciona <LuArrowRight aria-hidden="true" /></a>
        </div>
      </div>
      <div className="lp-wrap lp-hero__stage" style={{ '--e': 4 }}>
        <span className="lp-hero__beam" aria-hidden="true" />
        <AppFrame wide />
      </div>
    </section>
  )
}

/* ---------------- funciona com (ferramentas reais) ---------------- */
function Works() {
  const items = [
    [SiOpenstreetmap, 'OpenStreetMap', '#7ebc6f'], [SiTomtom, 'TomTom', '#ef4444'], [SiWhatsapp, 'WhatsApp', '#25d366'],
    [SiGooglesheets, 'Google Planilhas', '#34a853'], [LuFileSpreadsheet, 'Excel e CRMs via CSV', '#c4b5fd'],
  ]
  return (
    <section className="lp-works" aria-label="Funciona com">
      <div className="lp-wrap">
        <p>Dados e contatos que funcionam com as ferramentas que você já usa</p>
        <ul>{items.map(([I, l, c]) => <li key={l}><I style={{ color: c }} aria-hidden="true" /> {l}</li>)}</ul>
      </div>
    </section>
  )
}

/* ---------------- recursos (bento) ---------------- */
function VisHub({ live }) {
  return (
    <div className="vis vis--hub" aria-hidden="true">
      <svg viewBox="0 0 400 200">
        <path d="M30 100 H140" /><path d="M260 100 H370" /><path d="M200 20 V60" /><path d="M200 140 V180" />
        <path d="M60 40 H120 Q140 40 150 70" /><path d="M340 160 H280 Q260 160 250 130" />
        {live && ['M30 100 H140', 'M370 100 H260', 'M60 40 H120 Q140 40 150 70', 'M340 160 H280 Q260 160 250 130'].map((d, i) => (
          <circle key={i} r="3.5"><animateMotion dur={`${2.4 + i * 0.3}s`} repeatCount="indefinite" path={d} /></circle>
        ))}
      </svg>
      <span className="vis__core"><img src="/argus-white.webp" alt="" width="1400" height="423" /></span>
      <span className="vis__tag" style={{ left: '7%', top: '62%' }}><SiOpenstreetmap /> OSM</span>
      <span className="vis__tag" style={{ right: '7%', top: '62%' }}><SiTomtom /> TomTom</span>
    </div>
  )
}
function VisOrbit({ tick }) {
  const cats = ['Dentistas', 'Academias', 'Pet shops', 'Oficinas', 'Imobiliárias', 'Salões']
  return (
    <div className="vis vis--orbit" aria-hidden="true">
      <span className="vis__ring" /><span className="vis__ring vis__ring--2" />
      <span className="vis__center"><LuTarget /></span>
      {cats.map((c, i) => (
        <span key={c} className={`vis__sat ${tick % cats.length === i ? 'is-on' : ''}`} style={{ '--a': `${i * 60}deg` }}><em>{c}</em></span>
      ))}
    </div>
  )
}
function VisArea() {
  return (
    <div className="vis vis--area" aria-hidden="true">
      <svg viewBox="0 0 300 140" preserveAspectRatio="none">
        <defs><linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".55" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs>
        <path className="vis__fill" d="M0 120 L20 112 L40 116 L60 96 L80 100 L100 74 L120 82 L140 50 L160 58 L180 30 L200 44 L220 36 L240 60 L260 54 L280 78 L300 70 L300 140 L0 140 Z" fill="url(#ga)" />
        <path className="vis__line" d="M0 120 L20 112 L40 116 L60 96 L80 100 L100 74 L120 82 L140 50 L160 58 L180 30 L200 44 L220 36 L240 60 L260 54 L280 78 L300 70" />
      </svg>
      <span className="vis__peak" style={{ left: '60%', top: '21%' }}><b>58</b> empresas a 1,2 km</span>
    </div>
  )
}
function VisRadar() {
  return (
    <div className="vis vis--radar" aria-hidden="true">
      <span className="vis__scope"><i /><i /><i /><b className="vis__sweep" /></span>
      {[[38, 34, 'fit'], [62, 58, 'noweb'], [44, 66, ''], [70, 36, 'fit'], [30, 56, '']].map(([x, y, k], i) => (
        <span key={i} className={`vis__blip ${k}`} style={{ left: `${x}%`, top: `${y}%`, '--d': `${i * 0.45}s` }} />
      ))}
    </div>
  )
}
function VisBars({ tick }) {
  const days = [['Seg', 38], ['Ter', 52], ['Qua', 44], ['Qui', 70], ['Sex', 96], ['Sáb', 48], ['Dom', 30]]
  const on = 4
  return (
    <div className="vis vis--bars" aria-hidden="true">
      {days.map(([d, h], i) => (
        <span key={d} className={`vis__bar ${i === on ? 'is-on' : ''}`}>
          {i === on && <em key={tick}>+47 leads</em>}
          <i style={{ height: `${h}%` }} />
          <small>{d}</small>
        </span>
      ))}
    </div>
  )
}
function Features() {
  const [ref, tick] = useTick(2800)
  const [vref, live] = useInView()
  return (
    <section className="lp-sec" id="recursos" ref={ref}>
      <div className="lp-wrap">
        <div className="lp-head lp-head--center">
          <p className="lp-eyebrow"><i /> Recursos <i /></p>
          <h2>Tudo para sair do mapa com uma lista de clientes pronta.</h2>
          <p>Fontes unificadas, qualificação automática e contatos prontos para ligar, chamar no WhatsApp ou exportar.</p>
        </div>
        <div className="bento" ref={vref}>
          <article className="bento__card bento--a"><VisHub live={live} /><div><h3>Fontes unificadas</h3><p>OpenStreetMap e TomTom numa lista só, sem a mesma empresa duas vezes.</p></div></article>
          <article className="bento__card bento--b"><VisOrbit tick={tick} /><div><h3>119 categorias</h3><p>De dentistas a oficinas, ou qualquer palavra-chave que você digitar.</p></div></article>
          <article className="bento__card bento--c"><VisArea /><div><h3>Densidade por região</h3><p>Veja onde há mais empresas do seu alvo antes de decidir para onde ir.</p></div></article>
          <article className="bento__card bento--d"><VisRadar /><div><h3>Radar de oportunidades</h3><p>Alta aderência e sem website em destaque: quem mais precisa do que você vende.</p></div></article>
          <article className="bento__card bento--e"><VisBars tick={tick} /><div><h3>Seus resultados no painel</h3><p>Leads, buscas e qualidade dos contatos acompanhados dia a dia.</p></div></article>
        </div>
        <div className="lp-center"><a href="#planos" className="lp-btn">Ver os planos <LuArrowRight aria-hidden="true" /></a></div>
      </div>
    </section>
  )
}

/* ---------------- como funciona: caixas + tablet 3D ---------------- */
const STEPS = [
  { I: LuTarget, t: 'Escolha o alvo', p: 'Um ou vários segmentos, país e cidade. Ou qualquer palavra-chave.' },
  { I: LuFilter, t: 'Qualifique', p: 'Tem telefone, sem website, tem e-mail: a Argus dá nota para cada empresa.' },
  { I: LuMap, t: 'Marque o território', p: 'Até 10 áreas no mapa, cada uma com o próprio raio.' },
  { I: LuPhone, t: 'Receba os contatos', p: 'Telefone, WhatsApp, site e endereço. Capture e exporte em CSV.', hot: true },
]
function How() {
  return (
    <section className="lp-sec lp-how" id="como-funciona">
      <div className="lp-wrap lp-how__grid">
        <div>
          <div className="lp-head">
            <p className="lp-eyebrow"><i /> Como funciona</p>
            <h2>Do mapa à primeira ligação em quatro passos.</h2>
          </div>
          <ol className="lp-how__steps">
            {STEPS.map(({ I, t, p, hot }, i) => (
              <li key={t} className={hot ? 'is-hot' : ''}>
                <div><span>0{i + 1}</span><h3>{t}</h3><p>{p}</p></div>
                <I aria-hidden="true" />
              </li>
            ))}
          </ol>
        </div>
        <div className="lp-how__device" aria-hidden="true">
          <span className="lp-how__glow" />
          <Cube size={46} className="cube--e" />
          <Cube size={30} className="cube--f" />
          <div className="tablet"><AppFrame /></div>
        </div>
      </div>
      <dl className="lp-wrap lp-stats">
        <div><dt>100</dt><dd>empresas<br />por busca</dd></div>
        <div><dt>119</dt><dd>categorias<br />de negócio</dd></div>
        <div><dt>10</dt><dd>áreas no mapa<br />por busca</dd></div>
        <div><dt>0</dt><dd>créditos por empresa<br />já recebida</dd></div>
      </dl>
    </section>
  )
}

/* ---------------- planos ---------------- */
function Pricing() {
  const { user } = useAuth()
  const [plans, setPlans] = useState(null)
  const [period, setPeriod] = useState('monthly')
  useEffect(() => { api('plans').then(d => setPlans(d.plans)).catch(() => setPlans([])) }, [])
  return (
    <section className="lp-sec lp-pricing" id="planos">
      <span className="lp-pricing__glow" aria-hidden="true" />
      <div className="lp-wrap">
        <div className="lp-head lp-head--center">
          <p className="lp-eyebrow"><i /> Planos <i /></p>
          <h2>Pague pelas empresas que chegam.</h2>
          <p>20 empresas = 150 créditos, 50 = 300, 100 = 450. Empresa que você já recebeu não é cobrada de novo, e capturar ou exportar é grátis.</p>
        </div>
        <div className="lp-period" role="group" aria-label="Período de cobrança">
          <button className={period === 'monthly' ? 'is-on' : ''} aria-pressed={period === 'monthly'} onClick={() => setPeriod('monthly')}>Mensal</button>
          <button className={period === 'quarterly' ? 'is-on' : ''} aria-pressed={period === 'quarterly'} onClick={() => setPeriod('quarterly')}>Trimestral</button>
        </div>
        <div className="lp-plans">
          {plans === null && [0, 1].map(i => <div key={i} className="lp-plan is-loading" />)}
          {plans?.map(p => {
            const free = !p.price_monthly_cents && !p.price_quarterly_cents
            const cents = period === 'quarterly' ? p.price_quarterly_cents : p.price_monthly_cents
            const to = !user ? `/entrar?modo=cadastro&plano=${p.id}` : free ? '/app' : `/app/planos?plano=${p.id}&periodo=${period === 'quarterly' ? 'trimestral' : 'mensal'}`
            return (
              <article key={p.id} className={`lp-plan ${free ? '' : 'is-pro'}`}>
                {!free && <span className="lp-plan__badge">Mais escolhido</span>}
                <h3>{p.name}</h3>
                <p className="lp-plan__desc">{p.description}</p>
                <p className="lp-plan__price"><strong>{free ? 'Grátis' : money(cents)}</strong> <span>{free ? 'para testar' : period === 'quarterly' ? '/trimestre' : '/mês'}</span></p>
                <Link to={to} className={`lp-btn ${free ? 'lp-btn--ghost' : ''}`}>{free ? 'Começar o teste' : `Assinar o ${p.name}`} <LuArrowRight aria-hidden="true" /></Link>
                <ul>
                  <li><LuCheck aria-hidden="true" /> {fmtInt(p.monthly_credits)} créditos por mês</li>
                  <li><LuCheck aria-hidden="true" /> Até {fmtInt(p.daily_limit)} {p.daily_limit === 1 ? 'busca' : 'buscas'} por dia</li>
                  {(p.features || []).filter(f => !/créditos por mês|buscas por dia|leads por dia/i.test(f)).map(f => <li key={f}><LuCheck aria-hidden="true" /> {f}</li>)}
                </ul>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------------- dúvidas ---------------- */
function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="lp-sec" id="duvidas">
      <div className="lp-wrap lp-faq">
        <div className="lp-head">
          <p className="lp-eyebrow"><i /> Dúvidas</p>
          <h2>O que perguntam antes de assinar.</h2>
        </div>
        <div className="lp-faq__list">
          {faq.map((f, i) => (
            <div key={f.q} className={`lp-faq__item ${open === i ? 'is-open' : ''}`}>
              <h3><button aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{f.q} <LuPlus aria-hidden="true" /></button></h3>
              <div className="lp-faq__a"><div><p>{f.a}</p></div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- fechamento: o arco de novo ---------------- */
function Close() {
  const cta = useCta()
  return (
    <section className="lp-close" id="comecar">
      <div className="lp-close__sky" aria-hidden="true"><span className="lp-hero__bloom" /><span className="lp-hero__arc lp-close__arc" /></div>
      <Cube size={70} className="cube--g" />
      <Cube size={44} className="cube--h" />
      <div className="lp-wrap lp-close__in">
        <p className="lp-badge"><LuDownload aria-hidden="true" /> Teste grátis com 2 buscas de 20 empresas</p>
        <h2>Seu próximo cliente já está <span>no mapa.</span></h2>
        <p>Argus, o gigante de cem olhos da mitologia grega: nada no seu território passa despercebido.</p>
        <Link to={cta.to} className="lp-btn">{cta.label} <LuArrowRight aria-hidden="true" /></Link>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="lp-foot">
      <div className="lp-wrap lp-foot__grid">
        <div>
          <img src="/argus-white.webp" alt="Argus" width="1400" height="423" className="lp-foot__logo" />
          <p>Prospecção B2B por mapa: empresas locais com contato, qualificadas pelo que você vende.</p>
        </div>
        <nav aria-label="Rodapé">{NAV.map(([l, h]) => <a key={h} href={h}>{l}</a>)}<Link to="/entrar">Entrar</Link></nav>
        <nav aria-label="Documentos"><Link to="/termos">Termos de Uso</Link><Link to="/privacidade">Política de Privacidade</Link></nav>
      </div>
      <div className="lp-wrap lp-foot__base">
        <span>© {new Date().getFullYear()} Argus</span>
        <span>Dados de mapa © colaboradores do OpenStreetMap · TomTom</span>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="lp">
      <a href="#conteudo" className="lp-skip">Pular para o conteúdo</a>
      <Header />
      <main id="conteudo">
        <Hero />
        <Works />
        <Features />
        <How />
        <Pricing />
        <Faq />
        <Close />
      </main>
      <Footer />
    </div>
  )
}
