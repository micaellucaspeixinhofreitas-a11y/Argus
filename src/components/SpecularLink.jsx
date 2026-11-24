import { useNavigate } from 'react-router-dom'
import SpecularButton from './SpecularButton'
import './SpecularButton.css'

// Botão de redirecionamento com o SpecularButton (parâmetros originais do React Bits)
// Em telas de toque o brilho (que segue o mouse) não aparece; lá usamos a mesma aparência sem WebGL,
// para não passar do limite de contextos 3D do celular e o fundo animado não ser desligado.
const touchOnly = typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches

export default function SpecularLink({ to, children, block = false, ...rest }) {
  const navigate = useNavigate()
  if (touchOnly) {
    return (
      <button
        type="button"
        className="specular-button specular-button--lg specular-button--static"
        style={{ '--sb-radius': '18px', '--sb-tint': '#ffffff', '--sb-tint-opacity': 0.04, '--sb-text-color': '#f5f5f5', ...(block ? { width: '100%' } : {}) }}
        onClick={() => navigate(to)}
        {...rest}
      >
        <span className="specular-button__label">{children}</span>
      </button>
    )
  }
  return (
    <SpecularButton
      size="lg"
      radius={18}
      tint="#ffffff"
      tintOpacity={0.04}
      textColor="#f5f5f5"
      lineColor="#ffffff"
      baseColor="#525252"
      intensity={1}
      idleIntensity={0.35}
      shineSize={10}
      shineFade={34}
      thickness={1.2}
      glow={1}
      followMouse
      proximity={250}
      onClick={() => navigate(to)}
      style={block ? { width: '100%' } : undefined}
      {...rest}
    >
      {children}
    </SpecularButton>
  )
}
