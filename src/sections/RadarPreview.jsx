import { HugeiconsIcon } from '@hugeicons/react'
import { Radar01Icon, Target02Icon, GlobeIcon, CallIcon, MapsLocation01Icon, Download04Icon } from '@hugeicons/core-free-icons'
import Icon from '../components/Icons'
import AnimatedList from '../components/AnimatedList'
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

const glyph = icon => <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} />

// O que cada mapeamento entrega
const LIST_ITEMS = [
  { icon: glyph(Radar01Icon), title: 'Mapeadas', description: 'Identificadas no território', meta: 'Radar' },
  { icon: glyph(Target02Icon), title: 'Alta aderência', description: 'Atendem aos seus critérios', meta: 'Radar' },
  { icon: glyph(GlobeIcon), title: 'Sem website', description: 'Sem site localizado', meta: 'Radar' },
  { icon: glyph(CallIcon), title: 'Telefone e endereço', description: 'Contato de cada empresa', meta: 'Lead' },
  { icon: glyph(MapsLocation01Icon), title: 'Várias áreas no mapa', description: 'Cada área com seu raio', meta: 'Mapa' },
  { icon: glyph(Download04Icon), title: 'Exportação em CSV', description: 'Leve seus leads para o CRM', meta: 'Leads' },
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
          <div className="radar-prev__list" data-reveal>
            <AnimatedList
              items={LIST_ITEMS}
              onItemSelect={() => {}}
              animation="pop"
              theme="dark"
              width={420}
              maxHeight={440}
              radius={14}
              gap={8}
              stagger={0.05}
              fadeSize={56}
              frame
              showGradients
              displayScrollbar
              selectOnHover
              enableArrowNavigation
              loop={false}
              animateOnce={false}
              initialSelectedIndex={-1}
            />
          </div>
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
