import { Link } from 'react-router-dom'
import { LuX } from 'react-icons/lu'

// Aviso exibido quando os créditos do plano grátis acabam
export default function ProLock({ daily = false, onClose }) {
  return (
    <div className="pro-lock" role="dialog" aria-labelledby="pro-lock-title">
      <div className="pro-lock__card card">
        {onClose && <button className="pro-lock__close" onClick={onClose} aria-label="Fechar"><LuX /></button>}
        <img className="pro-lock__img" src="/icons/foguete.webp" alt="" width="84" height="84" />
        <h2 id="pro-lock-title">{daily ? 'Limite diário do plano grátis atingido' : 'Seus créditos grátis acabaram'}</h2>
        <p className="muted">
          {daily
            ? 'Você usou todos os leads de hoje. O limite renova à meia-noite — ou assine o Pro para capturar até 700 leads por dia.'
            : 'Assine o Pro para continuar capturando: 7.000 créditos por mês, até 700 leads por dia e lead repetido sem cobrança.'}
        </p>
        <Link to="/app/planos" className="btn btn--primary btn--block">Ver planos e assinar</Link>
        {onClose && <button className="link small" onClick={onClose}>Agora não</button>}
      </div>
    </div>
  )
}
