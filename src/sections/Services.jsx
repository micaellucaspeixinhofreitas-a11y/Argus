import { services } from '../data'
import Icon from '../components/Icons'
import SectionHead from './SectionHead'
import Glass from '../components/Glass'

// borda luminosa que segue o mouse
const spotlight = e => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export default function Services() {
  return (
    <section className="section" id="modulos">
      <div className="container">
        <SectionHead
          eyebrow="// Módulos"
          title={<>Tudo o que você precisa para <span className="grad">prospectar com precisão.</span></>}
          text="Do alvo comercial à captura do lead, cada etapa é um módulo independente e conectado ao mapa."
        />
        <div className="services">
          {services.map((s, i) => (
            <article className="card service has-glass" key={s.title} onPointerMove={spotlight} data-reveal>
              <Glass radius={20} refract />
              <div className="service__top">
                <span className="service__icon"><Icon name={s.icon} /></span>
                <span className="service__num">0{i + 1}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <ul className="tags">
                {s.tags.map(t => <li key={t}>{t}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
