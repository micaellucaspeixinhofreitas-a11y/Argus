import AcidSquares from './AcidSquares'

// Fundo animado das telas de login, cadastro e senha (parâmetros originais do React Bits)
export default function AuthBackground() {
  return (
    <div className="auth__bg" aria-hidden="true" style={{ width: '100%', position: 'absolute' }}>
      <AcidSquares
        color="#120f17"
        accentColor="#5b059d"
        secondaryColor="#5b059d"
        tileSize={1}
        gap={0.12}
        roundness={0.25}
        rotation={35}
        waves={1}
        pulse={1}
        lighting="split"
        tilt={0.7}
        grain={0.12}
        intro
        mouseInteraction={false}
        softness={0.5}
        bulge={0.3}
        gloss={0.6}
        waveScale={1}
        speed={0.6}
        shape="square"
        pulseSpeed={0.45}
        pulseSpacing={1}
        pulseWidth={1}
        pulseOrigin="center"
        brightness={1}
        zoom={1}
        depth={10}
        fade={0}
        opacity={1}
        hoverEffect="press"
        mouseStrength={1}
        mouseRadius={0.35}
        pulseOnClick={false}
        detail="medium"
        lightMode={false}
      />
    </div>
  )
}
