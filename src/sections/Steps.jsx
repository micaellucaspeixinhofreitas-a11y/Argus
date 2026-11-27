import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icons'
import SectionHead from './SectionHead'
import { stats } from '../data'

// Como funciona: 3 passos, cada um com uma mini-demonstração do que acontece na plataforma.
// As mini-demonstrações tocam uma vez quando entram na tela (explicação, não enfeite).
function useOnce(margin = '-80px') {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { rootMargin: `0px 0px ${margin} 0px` })
    io.observe(el)
    return () => io.disconnect()
  }, [seen, margin])
  return [ref, seen]
}

const SEGS = ['Dentistas', 'Academias', 'Pet shops', 'Imobiliárias', 'Restaurantes', 'Salões de beleza']

function Target() {
  return (
    <div className="mini mini--target">
      <div className="mini__chips">
        {SEGS.map((s, i) => <span key={s} className={i === 0 ? 'is-on' : ''} style={{ '--d': `${i * 45}ms` }}>{s}</span>)}
      </div>
      <div className="mini__toggles">
        <span><i className="is-on" /> Tem telefone</span>
        <span><i className="is-on" /> Sem website</span>
        <span><i /> Tem e-mail</span>
      </div>
    </div>
  )
}

function Territory() {
  return (
    <div className="mini mini--map">
      <span className="mini__area" style={{ left: '34%', top: '44%', '--s': 1, '--d': '0ms' }}><b>2 km</b></span>
      <span className="mini__area" style={{ left: '68%', top: '58%', '--s': .7, '--d': '160ms' }}><b>1,5 km</b></span>
      {[[30, 38], [40, 52], [26, 56], [64, 54], [72, 64], [70, 48], [44, 36]].map(([x, y], i) => (
        <span key={i} className="mini__dot" style={{ left: `${x}%`, top: `${y}%`, '--d': `${380 + i * 55}ms` }} />
      ))}
    </div>
  )
}

function Contacts() {
  return (
    <div className="mini mini--contact">
      <div className="mini__card">
        <strong>Clínica Sorriso Pleno</strong>
        <small>Dentista · Rua Fictícia, 120</small>
        <span><Icon name="phone" size={13} /> (11) 9•••• -2190</span>
        <span className="mini__wa"><Icon name="whatsapp" size={13} /> WhatsApp</span>
        <em>Alta aderência</em>
      </div>
      <span className="mini__csv">Exportar CSV ↓</span>
    </div>
  )
}

const STEPS = [
  { n: '01', title: 'Escolha o alvo', text: 'Um ou vários segmentos — são 119 categorias ou qualquer palavra-chave — e, se quiser, os critérios de qualificação.', Demo: Target },
  { n: '02', title: 'Marque o território', text: 'Clique no mapa para criar áreas, cada uma com o próprio raio. Só entra o que está dentro delas, sem empresa repetida.', Demo: Territory },
  { n: '03', title: 'Receba os contatos', text: 'Telefone, WhatsApp, site, e-mail e endereço de cada empresa. Guarde como lead e exporte para a sua planilha ou CRM.', Demo: Contacts },
]

export default function Steps() {
  const [ref, seen] = useOnce()
  return (
    <section className="section steps" id="como-funciona">
      <div className="container">
        <SectionHead
          center
          eyebrow="// Como funciona"
          title={<>Três passos. <span className="grad">Nenhuma planilha manual.</span></>}
          text="Tudo o que a Argus faz cabe numa busca: você diz o que procura e onde, ela entrega quem pode virar seu cliente."
        />
        <ol ref={ref} className={`steps__grid ${seen ? 'is-in' : ''}`}>
          {STEPS.map(({ n, title, text, Demo }, i) => (
            <li key={n} className="step3" style={{ '--i': i }}>
              <Demo />
              <div className="step3__text">
                <span className="step3__n">{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <dl className="facts">
          {stats.map(s => (
            <div key={s.label}>
              <dt>{s.value.toLocaleString('pt-BR')}{s.suffix}</dt>
              <dd>{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
