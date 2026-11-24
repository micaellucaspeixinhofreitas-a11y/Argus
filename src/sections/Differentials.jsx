import { differentials } from '../data'
import Icon from '../components/Icons'
import SectionHead from './SectionHead'

export default function Differentials() {
  return (
    <section className="section diff">
      <div className="container">
        <SectionHead
          center
          eyebrow="// Por que a Argus"
          title={<>Cem olhos no seu <span className="grad">território.</span></>}
        />
        <div className="diff__grid">
          {differentials.map((d, i) => (
            <div className="diff__item" key={d.title} data-reveal>
              <span className="diff__icon"><Icon name={i === 0 ? 'eye' : 'check'} size={22} /></span>
              <h3>{d.title}</h3>
              <p>{d.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
