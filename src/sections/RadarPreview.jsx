import Icon from '../components/Icons'
import SpecularLink from '../components/SpecularLink'
import SectionHead from './SectionHead'
import { useAuth } from '../lib/auth'

// Pré-visualização ilustrativa do radar (não representa empresas reais)
const DOTS = Array.from({ length: 46 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180
  const r = 8 + ((i * 53) % 34)
  const ring = i % 3
  return { x: 50 + Math.cos(a) * r * (ring === 0 ? 1 : 0.8), y: 50 + Math.sin(a) * r * 0.9, kind: i % 5 === 0 ? 'fit' : i % 3 === 0 ? 'noweb' : 'base' }
})

const INDICATORS = [
  { key: 'mapped', label: 'Mapeadas', hint: 'empresas identificadas no território' },
  { key: 'fit', label: 'Alta aderência', hint: 'atendem aos seus critérios' },
  { key: 'noweb', label: 'Sem website', hint: 'sem site institucional localizado' },
]

export default function RadarPreview() {
  const { user } = useAuth()
  return (
    <section className="section" id="radar">
      <div className="container radar-prev">
        <div>
          <SectionHead
            eyebrow="// Radar de oportunidades"
            title={<>Veja onde estão as <span className="grad">melhores oportunidades.</span></>}
            text="Cada mapeamento alimenta o radar com três indicadores calculados a partir dos dados realmente encontrados. A lista já vem priorizada por aderência e presença digital."
          />
          <ul className="radar-prev__list" data-reveal>
            {INDICATORS.map(i => (
              <li key={i.key}><span className={`dot dot--${i.key}`} /> <strong>{i.label}</strong> — {i.hint}</li>
            ))}
          </ul>
          <div data-reveal>
            <SpecularLink to={user ? '/app' : '/entrar?modo=cadastro'}>
              Mapear minha região <Icon name="arrow" size={18} />
            </SpecularLink>
          </div>
        </div>

        <figure className="radar-prev__screen" data-reveal aria-label="Ilustração da interface do radar">
          <div className="radar-prev__map">
            <div className="radar-prev__sweep" />
            <span className="radar-prev__area" style={{ left: '50%', top: '50%', width: '62%' }} />
            <span className="radar-prev__area" style={{ left: '78%', top: '28%', width: '30%' }} />
            {DOTS.map((d, i) => (
              <i key={i} className={`radar-prev__dot radar-prev__dot--${d.kind}`} style={{ left: `${d.x}%`, top: `${d.y}%`, animationDelay: `${(i % 12) * 0.25}s` }} />
            ))}
          </div>
          <div className="radar-prev__cards">
            {INDICATORS.map(i => (
              <div key={i.key} className="radar-prev__card">
                <span className={`dot dot--${i.key}`} />
                <small>{i.label}</small>
                <span className="radar-prev__bar"><i className={`radar-prev__fill radar-prev__fill--${i.key}`} /></span>
              </div>
            ))}
          </div>
          <figcaption>Ilustração da interface</figcaption>
        </figure>
      </div>
    </section>
  )
}
