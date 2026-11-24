import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const KEY = 'argus:privacy-notice'

// Aviso de privacidade/cookies (o site só usa o cookie essencial de sessão)
export default function CookieNotice() {
  const { pathname } = useLocation()
  const [seen, setSeen] = useState(() => {
    try { return localStorage.getItem(KEY) === '1' } catch { return false }
  })
  if (seen || pathname.startsWith('/app')) return null
  const ok = () => {
    try { localStorage.setItem(KEY, '1') } catch { /* armazenamento indisponível */ }
    setSeen(true)
  }
  return (
    <div className="cookie-notice" role="region" aria-label="Aviso de privacidade">
      <p>
        Usamos apenas o cookie essencial para manter você conectado — nada de rastreamento ou publicidade.
        Saiba mais na <Link to="/privacidade">Política de Privacidade</Link>.
      </p>
      <button className="btn btn--primary btn--sm" onClick={ok}>Entendi</button>
    </div>
  )
}
