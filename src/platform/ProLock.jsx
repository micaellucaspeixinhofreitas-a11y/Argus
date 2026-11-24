import { Link } from 'react-router-dom'
import { LuLock, LuQrCode } from 'react-icons/lu'

// Bloqueio exibido para quem não tem o plano Pro
export default function ProLock() {
  return (
    <div className="pro-lock" role="dialog" aria-labelledby="pro-lock-title">
      <div className="pro-lock__card card">
        <span className="pro-lock__icon"><LuLock /></span>
        <h2 id="pro-lock-title">Recurso exclusivo do plano Pro</h2>
        <p className="muted">
          Mapear oportunidades e capturar leads está disponível para assinantes Pro: 7.000 créditos por mês,
          até 700 leads por dia e lead repetido sem cobrança.
        </p>
        <Link to="/app/pagamento" className="btn btn--primary btn--block"><LuQrCode /> Assinar o Pro com Pix</Link>
        <Link to="/app/planos" className="link small">Comparar planos</Link>
      </div>
    </div>
  )
}
