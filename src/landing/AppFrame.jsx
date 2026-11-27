import { SiWhatsapp } from 'react-icons/si'
import { LuPhone, LuGlobe, LuMapPin, LuDownload } from 'react-icons/lu'
import { useTick } from './useLive'

// A interface da plataforma, em HTML (não é imagem): uma busca de dentistas em Pinheiros.
// Empresas, endereços e telefones são fictícios.
const ROWS = [
  { name: 'Clínica Sorriso Pleno', street: 'Rua dos Pinheiros', cat: 'Dentista', km: '0,4', phone: '(11) 9•••• •190', fit: true, noweb: true, x: 54, y: 40 },
  { name: 'Odonto Vila Madalena', street: 'Rua Harmonia', cat: 'Dentista', km: '0,7', phone: '(11) 3•••• •471', fit: true, noweb: false, x: 38, y: 58 },
  { name: 'Studio Dental Prime', street: 'Rua Teodoro Sampaio', cat: 'Clínica odontológica', km: '1,1', phone: '(11) 9•••• •034', fit: false, noweb: true, x: 64, y: 64 },
  { name: 'Instituto Oral Center', street: 'Rua Cardeal Arcoverde', cat: 'Dentista', km: '1,4', phone: '(11) 2•••• •158', fit: false, noweb: false, x: 30, y: 34 },
]
const EXTRA = [[49, 33], [70, 46], [42, 70], [24, 50], [60, 26], [76, 60], [34, 76], [52, 54], [66, 34], [28, 64]]

export default function AppFrame() {
  const [ref, tick] = useTick(3000)
  const on = tick % ROWS.length
  return (
    <div ref={ref} className="af" aria-label="Exemplo da tela de prospecção da Argus" role="img">
      <div className="af__bar">
        <span className="af__dots"><i /><i /><i /></span>
        <span className="af__crumb">Prospectar <b>/</b> Dentistas · Pinheiros, São Paulo</span>
        <span className="af__credits">450 créditos</span>
      </div>
      <div className="af__body">
        <div className="af__map">
          <svg className="af__streets" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M-5 22 L105 30" /><path d="M-5 47 L105 52" /><path d="M-5 78 L105 70" />
            <path d="M18 -5 L26 105" /><path d="M46 -5 L44 105" /><path d="M74 -5 L80 105" />
            <path className="af__avenue" d="M-5 92 L60 40 L105 8" />
          </svg>
          <span className="af__park" />
          <span className="af__area"><b>2 km</b></span>
          {EXTRA.map(([x, y], i) => <span key={i} className="af__pin is-dim" style={{ left: `${x}%`, top: `${y}%` }} />)}
          {ROWS.map((r, i) => (
            <span key={r.name} className={`af__pin ${r.fit ? 'is-fit' : r.noweb ? 'is-noweb' : ''} ${i === on ? 'is-on' : ''}`} style={{ left: `${r.x}%`, top: `${r.y}%` }} />
          ))}
          <span className="af__count"><b>47</b> empresas · <b>12</b> com alta aderência</span>
        </div>
        <ul className="af__list">
          {ROWS.map((r, i) => (
            <li key={r.name} className={i === on ? 'is-on' : ''}>
              <div className="af__row-head">
                <strong>{r.name}</strong>
                <span className="af__km">{r.km} km</span>
              </div>
              <small>{r.cat} · <LuMapPin aria-hidden="true" /> {r.street}</small>
              <div className="af__contacts">
                <span><LuPhone aria-hidden="true" /> {r.phone}</span>
                <span className="af__wa"><SiWhatsapp aria-hidden="true" /> WhatsApp</span>
                {!r.noweb && <span><LuGlobe aria-hidden="true" /> site</span>}
              </div>
              <div className="af__tags">
                {r.fit && <em className="is-fit">Alta aderência</em>}
                {r.noweb && <em className="is-noweb">Sem website</em>}
              </div>
            </li>
          ))}
          <li className="af__foot"><span>Capturar 4 leads</span><span><LuDownload aria-hidden="true" /> CSV</span></li>
        </ul>
      </div>
    </div>
  )
}
