/*
  Página inicial da Argus — refeita do zero.
  Tipo: software (SaaS B2B de prospecção por mapa). Ação principal: Criar conta grátis.
  Paleta: fundo quase preto neutro, texto branco; o roxo da marca só em ações e destaques;
  cores de sinal da plataforma (verde = contato, rosa = sem website, lilás = alta aderência).
  Tipos: Geist + Geist Mono. Movimento: entrada única no topo; ciclos de 3 s só com a seção na tela;
  um momento (frase final acende com a rolagem, dentro da própria seção); hover só com mouse.
*/
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiOpenstreetmap, SiTomtom, SiWhatsapp, SiGooglesheets } from 'react-icons/si'
import { LuArrowRight, LuPlus, LuMenu, LuX, LuFileSpreadsheet, LuCheck } from 'react-icons/lu'
import { api, money, fmtInt } from '../lib/api'
import { useAuth } from '../lib/auth'
import { faq } from '../data'
import AppFrame from './AppFrame'
import { useTick, useInView } from './useLive'
import './landing.css'

const NAV = [['Como funciona', '#como-funciona'], ['Dados', '#dados'], ['Planos', '#planos'], ['Dúvidas', '#duvidas']]

function useCta() {
  const { user } = useAuth()
  return user ? { to: '/app', label: 'Abrir a plataforma' } : { to: '/entrar?modo=cadastro', label: 'Criar conta grátis' }
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
        <nav className="lp-nav__links" aria-label="Seções">
          {NAV.map(([l, h]) => <a key={h} href={h} onClick={() => setOpen(false)}>{l}</a>)}
        </nav>
        <div className="lp-nav__actions">
          {!user && <Link to="/entrar" className="lp-link">Entrar</Link>}
          <Link to={cta.to} className="lp-btn lp-btn--sm">{cta.label}</Link>
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

/* ---------------- topo ---------------- */
function Hero() {
  const cta = useCta()
  return (
    <section className="lp-hero" id="topo" data-enter>
      <div className="lp-wrap lp-hero__grid">
        <div className="lp-hero__copy">
          <p className="lp-kicker" style={{ '--e': 0 }}>Prospecção B2B por mapa</p>
          <h1 style={{ '--e': 1 }}>Leads de empresas locais, direto do mapa.</h1>
          <p className="lp-hero__lead" style={{ '--e': 2 }}>
            Escolha o segmento, marque a região e receba até 100 empresas por busca com telefone, WhatsApp, site e endereço,
            já separadas por quem tem mais chance de comprar de você.
          </p>
          <div className="lp-hero__actions" style={{ '--e': 3 }}>
            <Link to={cta.to} className="lp-btn">{cta.label} <LuArrowRight aria-hidden="true" /></Link>
            <a href="#planos" className="lp-btn lp-btn--ghost">Ver os planos</a>
          </div>
          <p className="lp-hero__note" style={{ '--e': 4 }}><LuCheck aria-hidden="true" /> Teste grátis com 2 buscas de 20 empresas, sem cartão.</p>
        </div>
        <div className="lp-hero__frame" style={{ '--e': 3 }}>
          <AppFrame />
        </div>
      </div>
    </section>
  )
}

/* ---------------- como funciona ---------------- */
const SEGS = ['Dentistas', 'Academias', 'Pet shops', 'Imobiliárias', 'Oficinas', 'Salões de beleza', 'Restaurantes', 'Contabilidade']

function StepTarget({ tick }) {
  const on = tick % 4
  return (
    <div className="lp-mini lp-mini--target" aria-hidden="true">
      <div className="lp-mini__chips">{SEGS.map((s, i) => <span key={s} className={i === on ? 'is-on' : ''}>{s}</span>)}</div>
      <div className="lp-mini__rules">
        <span><i className="is-on" /> Tem telefone</span>
        <span><i className={on % 2 ? 'is-on' : ''} /> Sem website</span>
        <span><i /> Tem e-mail</span>
      </div>
    </div>
  )
}
function StepMap({ tick }) {
  const on = tick % 2
  return (
    <div className="lp-mini lp-mini--map" aria-hidden="true">
      <span className={`lp-mini__area ${on === 0 ? 'is-on' : ''}`} style={{ left: '36%', top: '50%', '--s': 1 }}><b>2 km</b></span>
      <span className={`lp-mini__area ${on === 1 ? 'is-on' : ''}`} style={{ left: '70%', top: '56%', '--s': .72 }}><b>1,5 km</b></span>
      {[[30, 40], [41, 56], [27, 60], [44, 42], [66, 52], [74, 62], [71, 46]].map(([x, y], i) => <span key={i} className="lp-mini__dot" style={{ left: `${x}%`, top: `${y}%` }} />)}
    </div>
  )
}
function StepContact({ tick }) {
  const on = tick % 3
  return (
    <div className="lp-mini lp-mini--contact" aria-hidden="true">
      <div className="lp-mini__card">
        <strong>Clínica Sorriso Pleno</strong>
        <small>Dentista · Rua dos Pinheiros</small>
        <div className="lp-mini__acts">
          <span className={on === 0 ? 'is-on' : ''}><SiWhatsapp /> Conversar</span>
          <span className={on === 1 ? 'is-on' : ''}>Ligar</span>
          <span className={on === 2 ? 'is-on' : ''}><LuFileSpreadsheet /> CSV</span>
        </div>
      </div>
    </div>
  )
}
const STEPS = [
  { n: '01', t: 'Escolha quem você procura', p: '119 categorias, de dentistas a oficinas, ou qualquer palavra-chave. Filtre por quem tem telefone ou ainda não tem site.', C: StepTarget },
  { n: '02', t: 'Marque onde procurar', p: 'Desenhe até 10 áreas no mapa, cada uma com o próprio raio. Só entra o que está dentro, sem empresa repetida.', C: StepMap },
  { n: '03', t: 'Ligue, chame ou exporte', p: 'Contatos na tela, conversa direta no WhatsApp e exportação em CSV para a sua planilha ou CRM.', C: StepContact },
]
function Steps() {
  const [ref, tick] = useTick(3000)
  return (
    <section className="lp-sec" id="como-funciona" ref={ref}>
      <div className="lp-wrap">
        <div className="lp-head">
          <p className="lp-kicker">Como funciona</p>
          <h2>Três passos entre o mapa e a primeira ligação.</h2>
        </div>
        <ol className="lp-steps">
          {STEPS.map(({ n, t, p, C }) => (
            <li key={n} className="lp-card">
              <C tick={tick} />
              <div className="lp-card__text">
                <span className="lp-num">{n}</span>
                <h3>{t}</h3>
                <p>{p}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ---------------- de onde vêm os dados (diagrama) ---------------- */
// caminhos no mesmo sistema de coordenadas do SVG (1000 x 420)
const P_IN = ['M150 120 C 300 120, 330 210, 470 210', 'M150 300 C 300 300, 330 210, 470 210']
const P_OUT = ['M530 210 C 640 210, 640 100, 760 100', 'M530 210 L 760 210', 'M530 210 C 640 210, 640 320, 760 320']
function Pipeline() {
  const [ref, live] = useInView()
  return (
    <section className="lp-sec" id="dados">
      <div className="lp-wrap lp-data">
        <div className="lp-head lp-head--side">
          <p className="lp-kicker">De onde vêm os dados</p>
          <h2>Duas fontes, uma lista limpa.</h2>
          <p>A Argus consulta o OpenStreetMap e a TomTom, junta a mesma empresa vinda das duas e marca quem combina com o que você vende. Empresa que você já recebeu não é cobrada de novo.</p>
        </div>
        <div ref={ref} className="lp-card lp-flow" role="img" aria-label="Diagrama: OpenStreetMap e TomTom alimentam a Argus, que separa as empresas em alta aderência, sem website e contato direto, prontas para WhatsApp, Google Planilhas e CSV.">
          <svg viewBox="0 0 1000 420" aria-hidden="true">
            {[...P_IN, ...P_OUT].map((d, i) => <path key={i} d={d} className="lp-flow__line" />)}
            {live && [...P_IN, ...P_OUT].map((d, i) => (
              <circle key={`p${i}`} r="4" className={`lp-flow__pulse ${i >= 2 ? 'is-out' : ''}`}>
                <animateMotion dur={`${2.6 + (i % 3) * 0.35}s`} begin={`${i * 0.4}s`} repeatCount="indefinite" path={d} />
              </circle>
            ))}
          </svg>
          <span className="lp-flow__node" style={{ left: '15%', top: '23.1%' }}><SiOpenstreetmap style={{ color: '#7ebc6f' }} /> OpenStreetMap</span>
          <span className="lp-flow__node" style={{ left: '15%', top: '57.7%' }}><SiTomtom style={{ color: '#df1b12' }} /> TomTom</span>
          <span className="lp-flow__hub" style={{ left: '50%', top: '40.4%' }}><img src="/argus-white.webp" alt="" width="1400" height="423" /><small>sem duplicadas · qualificadas</small></span>
          <span className="lp-flow__lane is-fit" style={{ left: '76%', top: '19.2%' }}>Alta aderência</span>
          <span className="lp-flow__lane is-noweb" style={{ left: '76%', top: '40.4%' }}>Sem website</span>
          <span className="lp-flow__lane is-contact" style={{ left: '76%', top: '61.5%' }}>Contato direto</span>
          <div className="lp-flow__out">
            <span><SiWhatsapp style={{ color: '#25d366' }} /> WhatsApp</span>
            <span><SiGooglesheets style={{ color: '#34a853' }} /> Google Planilhas</span>
            <span><LuFileSpreadsheet /> CSV</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- planos ---------------- */
const TIERS = [[20, 150], [50, 300], [100, 450]]
function Pricing() {
  const { user } = useAuth()
  const [plans, setPlans] = useState(null)
  const [period, setPeriod] = useState('monthly')
  useEffect(() => { api('plans').then(d => setPlans(d.plans)).catch(() => setPlans([])) }, [])
  return (
    <section className="lp-sec" id="planos">
      <div className="lp-wrap">
        <div className="lp-head lp-head--center">
          <p className="lp-kicker">Planos</p>
          <h2>Pague pelas empresas que chegam, não por usuário.</h2>
          <p>Cada busca custa conforme as empresas novas que vierem. Capturar e exportar os leads não consome créditos.</p>
        </div>
        <div className="lp-period" role="group" aria-label="Período de cobrança">
          <button className={period === 'monthly' ? 'is-on' : ''} aria-pressed={period === 'monthly'} onClick={() => setPeriod('monthly')}>Mensal</button>
          <button className={period === 'quarterly' ? 'is-on' : ''} aria-pressed={period === 'quarterly'} onClick={() => setPeriod('quarterly')}>Trimestral</button>
        </div>
        <div className="lp-plans">
          {plans === null && [0, 1].map(i => <div key={i} className="lp-card lp-plan is-loading" />)}
          {plans?.map(p => {
            const free = !p.price_monthly_cents && !p.price_quarterly_cents
            const cents = period === 'quarterly' ? p.price_quarterly_cents : p.price_monthly_cents
            const to = !user ? `/entrar?modo=cadastro&plano=${p.id}` : free ? '/app' : `/app/planos?plano=${p.id}&periodo=${period === 'quarterly' ? 'trimestral' : 'mensal'}`
            return (
              <article key={p.id} className={`lp-card lp-plan ${free ? '' : 'is-pro'}`}>
                <h3>{p.name}</h3>
                <p className="lp-plan__desc">{p.description}</p>
                <p className="lp-plan__price"><strong>{free ? 'Grátis' : money(cents)}</strong> <span>{free ? 'para testar' : period === 'quarterly' ? 'por trimestre' : 'por mês'}</span></p>
                <ul>
                  <li><LuCheck aria-hidden="true" /> {fmtInt(p.monthly_credits)} créditos por mês</li>
                  <li><LuCheck aria-hidden="true" /> Até {fmtInt(p.daily_limit)} {p.daily_limit === 1 ? 'busca' : 'buscas'} por dia</li>
                  {(p.features || []).filter(f => !/créditos por mês|buscas por dia|leads por dia/i.test(f)).map(f => <li key={f}><LuCheck aria-hidden="true" /> {f}</li>)}
                </ul>
                <Link to={to} className={`lp-btn ${free ? 'lp-btn--ghost' : ''}`}>{free ? 'Começar o teste' : `Assinar o ${p.name}`}</Link>
              </article>
            )
          })}
        </div>
        <dl className="lp-tiers">
          {TIERS.map(([n, c]) => <div key={n}><dt>{n} empresas</dt><dd>{c} créditos</dd></div>)}
          <div><dt>Já recebida antes</dt><dd>0 créditos</dd></div>
        </dl>
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
        <div className="lp-head lp-head--side">
          <p className="lp-kicker">Dúvidas</p>
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

/* ---------------- fechamento: a frase acende com a rolagem (momento da página) ---------------- */
const CLOSE = 'Seu próximo cliente já está no mapa. Falta só você encontrar.'
function Close() {
  const cta = useCta()
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const words = [...el.querySelectorAll('.lp-close__w')]
    let frame = 0
    const paint = () => {
      frame = 0
      const r = el.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.85 - r.top) / (r.height * 0.9)))
      const lit = p * words.length
      words.forEach((w, i) => { w.style.opacity = String(0.18 + 0.82 * Math.min(1, Math.max(0, lit - i))) })
    }
    const on = () => { if (!frame) frame = requestAnimationFrame(paint) }
    paint()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(frame) }
  }, [])
  return (
    <section className="lp-sec lp-close" id="comecar">
      <div className="lp-wrap">
        <h2 ref={ref} className="lp-close__text">{CLOSE.split(' ').map((w, i) => <span key={i} className="lp-close__w">{w} </span>)}</h2>
        <div className="lp-close__actions">
          <Link to={cta.to} className="lp-btn">{cta.label} <LuArrowRight aria-hidden="true" /></Link>
          <span>Argus, o gigante de cem olhos da mitologia grega: nada no território passa despercebido.</span>
        </div>
      </div>
    </section>
  )
}

/* ---------------- rodapé ---------------- */
function Footer() {
  return (
    <footer className="lp-foot">
      <div className="lp-wrap lp-foot__grid">
        <div>
          <img src="/argus-white.webp" alt="Argus" width="1400" height="423" className="lp-foot__logo" />
          <p>Prospecção B2B por mapa: empresas locais com contato, qualificadas pelo que você vende.</p>
        </div>
        <nav aria-label="Rodapé">
          {NAV.map(([l, h]) => <a key={h} href={h}>{l}</a>)}
          <Link to="/entrar">Entrar</Link>
        </nav>
        <nav aria-label="Documentos">
          <Link to="/termos">Termos de Uso</Link>
          <Link to="/privacidade">Política de Privacidade</Link>
        </nav>
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
        <Steps />
        <Pipeline />
        <Pricing />
        <Faq />
        <Close />
      </main>
      <Footer />
    </div>
  )
}
