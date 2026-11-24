import { useNavigate } from 'react-router-dom'
import SpecularButton from './SpecularButton'

// Botão de redirecionamento com o SpecularButton (parâmetros originais do React Bits)
export default function SpecularLink({ to, children, block = false, ...rest }) {
  const navigate = useNavigate()
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
