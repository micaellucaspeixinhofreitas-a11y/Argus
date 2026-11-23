import {
  LuStethoscope, LuUtensils, LuDumbbell, LuHouse, LuWrench, LuScissors, LuBriefcase, LuSmile,
  LuPawPrint, LuHotel, LuPill, LuCalculator, LuScale, LuGraduationCap, LuStore,
} from 'react-icons/lu'
import LogoLoop from '../components/LogoLoop'
import { segmentsLoop } from '../data'

// Segmentos que a Argus encontra no mapa
const ICONS = [LuStethoscope, LuUtensils, LuDumbbell, LuHouse, LuWrench, LuScissors, LuBriefcase, LuSmile, LuPawPrint, LuHotel, LuPill, LuCalculator, LuScale, LuGraduationCap, LuStore]
const logos = segmentsLoop.map((title, i) => {
  const Icon = ICONS[i % ICONS.length]
  return { node: <Icon />, title, hoverColor: '#a78bfa' }
})

export default function Marquee() {
  return (
    <div className="marquee">
      <LogoLoop
        logos={logos}
        speed={60}
        direction="left"
        logoHeight={28}
        gap={56}
        hoverSpeed={0}
        scaleOnHover
        labels="inline"
        muted={0.35}
        fadeOut
        fadeOutWidth={0.12}
        draggable
        intro
        ariaLabel="Segmentos que você pode prospectar"
      />
    </div>
  )
}
