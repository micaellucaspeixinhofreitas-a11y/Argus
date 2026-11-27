import Icon from '../components/Icons'
import SpecularLink from '../components/SpecularLink'
import Radar from '../components/Radar'
import SectionHead from './SectionHead'
import { useAuth } from '../lib/auth'

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

        <div className="radar-prev__radar" aria-hidden="true" style={{ width: '100%', position: 'relative' }}>
          <Radar
            color="#5b059d"
            mode="sweep"
            speed={1}
            trail={0.35}
            scale={0.9}
            ringCount={6}
            spokeCount={12}
            targets={6}
            clutter={0.35}
            mouseInteraction
            ticks
            glow={1}
            tilt={0}
            centerX={0.5}
            centerY={0.5}
            brightness={1}
            gridOpacity={1}
            lineWidth={1}
            grain={0.03}
            fade={0}
            opacity={1}
            intro
            lightMode={false}
          />
        </div>
      </div>
    </section>
  )
}
