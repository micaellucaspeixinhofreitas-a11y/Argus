import { Link } from 'react-router-dom'
import { LuX } from 'react-icons/lu'

// Aviso exibido quando os créditos do plano grátis acabam
export default function ProLock({ daily = false, onClose }) {
  return (
    <div className="pro-lock" role="dialog" aria-labelledby="pro-lock-title">
      <div className="pro-lock__card card">
        {onClose && <button className="pro-lock__close" onClick={onClose} aria-label="Fechar"><LuX /></button>}
        <img className="pro-lock__img" src="/icons/foguete.webp" alt="" width="84" height="84" />
        <h2 id="pro-lock-title">{daily ? 'Limite de buscas de hoje atingido' : 'Seu teste grátis acabou'}</h2>
        <p className="muted">
          {daily
            ? 'O plano grátis permite 1 busca por dia. Assine o Pro para fazer até 10 buscas por dia, com cerca de 50 buscas de 100 empresas por mês.'
            : 'Assine um plano pago para continuar buscando: cerca de 50 buscas de 100 empresas por mês no Pro.'}
        </p>
        <Link to="/app/planos" className="btn btn--primary btn--block">Ver planos e assinar</Link>
        {onClose && <button className="link small" onClick={onClose}>Agora não</button>}
      </div>
    </div>
  )
}
