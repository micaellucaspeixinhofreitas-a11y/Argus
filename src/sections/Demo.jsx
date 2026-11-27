import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icons'
import SpecularLink from '../components/SpecularLink'
import Radar from '../components/Radar'
import SectionHead from './SectionHead'
import { useAuth } from '../lib/auth'

// Empresas fictícias só para a demonstração (nomes e telefones inventados)
const DEMO = [
  { name: 'Clínica Sorriso Pleno', cat: 'Dentista · 0,4 km', phone: '(11) 9•••• -2190', tags: ['fit', 'noweb'], x: 58, y: 38 },
  { name: 'Odonto Vila Nova', cat: 'Dentista · 0,7 km', phone: '(11) 3•••• -4471', tags: ['fit'], x: 36, y: 56 },
  { name: 'Studio Dental Prime', cat: 'Clínica odontológica · 1,1 km', phone: '(11) 9•••• -8034', tags: ['noweb'], x: 66, y: 66 },
  { name: 'Instituto Oral Center', cat: 'Dentista · 1,4 km', phone: '(11) 2•••• -1158', tags: [], x: 28, y: 32 },
  { name: 'Dra. Helena Rocha', cat: 'Consultório · 1,8 km', phone: '(11) 9•••• -6620', tags: ['fit', 'noweb'], x: 74, y: 30 },
]
const TAG = { fit: ['Alta aderência', 'is-fit'], noweb: ['Sem website', 'is-noweb'] }

export default function Demo() {
  const { user } = useAuth()
  const ref = useRef(null)
  const [live, setLive] = useState(false)

  // a demonstração só roda (e o radar só existe) enquanto está na tela
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { rootMargin: '120px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className="section demo" id="demo">
      <div className="container demo__grid">
        <div className="demo__copy">
          <SectionHead
            eyebrow="// Veja em ação"
            title={<>Do mapa ao <span className="grad">contato</span> em segundos.</>}
            text="Escolha o segmento, marque a região e a Argus varre o território: cada empresa aparece no mapa com telefone, site, e-mail e endereço — já classificada pelo que você procura."
          />
          <ul className="demo__points">
            <li><span className="dot dot--fit" /> <strong>Alta aderência</strong> — atendem aos seus critérios</li>
            <li><span className="dot dot--noweb" /> <strong>Sem website</strong> — oportunidade de presença digital</li>
            <li><span className="dot dot--mapped" /> <strong>Contato direto</strong> — telefone e WhatsApp na hora</li>
          </ul>
          <SpecularLink to={user ? '/app/prospectar' : '/entrar?modo=cadastro'}>
            Mapear minha região <Icon name="arrow" size={18} />
          </SpecularLink>
        </div>

        <div ref={ref} className={`demo__window ${live ? 'is-live' : ''}`} aria-hidden="true">
          <div className="demo__bar">
            <i /><i /><i />
            <span className="demo__query">Dentistas · Pinheiros, São Paulo · raio de 2 km</span>
          </div>
          <div className="demo__body">
            <div className="demo__map">
              {live && (
                <Radar color="#5b059d" mode="sweep" speed={1} trail={0.35} scale={0.95} ringCount={5} spokeCount={12}
                  targets={0} clutter={0.2} ticks glow={1} tilt={0} centerX={0.5} centerY={0.5} brightness={1}
                  gridOpacity={0.8} lineWidth={1} grain={0.02} fade={0} opacity={1} intro={false} lightMode={false} />
              )}
              {DEMO.map((d, i) => (
                <span key={d.name} className={`demo__pin ${d.tags.includes('fit') ? 'is-fit' : d.tags.includes('noweb') ? 'is-noweb' : ''}`}
                  style={{ left: `${d.x}%`, top: `${d.y}%`, '--d': `${[0.5, 0.9, 1.25, 1.55, 1.8][i]}s` }} />
              ))}
              <span className="demo__count">5 empresas encontradas</span>
            </div>
            <ul className="demo__list">
              {DEMO.map((d, i) => (
                <li key={d.name} style={{ '--d': `${[1.0, 1.35, 1.65, 1.9, 2.1][i]}s` }}>
                  <strong>{d.name}</strong>
                  <small>{d.cat}</small>
                  <span className="demo__phone"><Icon name="phone" size={13} /> {d.phone}</span>
                  <span className="demo__tags">{d.tags.map(t => <em key={t} className={TAG[t][1]}>{TAG[t][0]}</em>)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
