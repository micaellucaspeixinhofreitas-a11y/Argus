import GlassSurface from './GlassSurface'

// Camada de vidro atrás do conteúdo de um elemento com a classe "has-glass".
// Usa o GlassSurface exatamente com os parâmetros do React Bits (sem alterações).
export default function Glass({ radius = 20 }) {
  return (
    <GlassSurface
      className="glass-layer"
      width="100%"
      height="100%"
      borderRadius={radius}
      distortionScale={-180}
      displace={0.5}
      backgroundOpacity={0.1}
    />
  )
}
