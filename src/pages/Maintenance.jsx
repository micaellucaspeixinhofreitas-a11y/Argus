import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LuRefreshCw } from 'react-icons/lu'
import { useSite } from '../lib/site'

const remaining = eta => {
  const ms = new Date(eta).getTime() - Date.now()
  if (!(ms > 0)) return null
  const min = Math.ceil(ms / 60000)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return `${h} h ${String(min % 60).padStart(2, '0')} min`
}

// Tela de manutenção com o mascote consertando a plataforma
export default function Maintenance() {
  const { status, refresh } = useSite()
  const m = status?.maintenance || {}
  const [, tick] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const t = setInterval(() => tick(x => x + 1), 30_000)
    return () => clearInterval(t)
  }, [])
  const left = m.eta ? remaining(m.eta) : null
  const when = m.eta ? new Date(m.eta).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) : null

  return (
    <main className="maint">
      <div className="maint__glow" aria-hidden="true" />
      <div className="maint__inner">
        <img className="maint__bot" src="/mascote-manutencao.webp" alt="Mascote da Argus consertando a plataforma" width="640" height="571" />
        <div className="maint__copy">
          <img className="maint__logo" src="/argus-white.webp" alt="Argus" width="1400" height="423" />
          <span className="maint__badge"><i aria-hidden="true" /> Em manutenção</span>
          <h1>Estamos ajustando algumas peças.</h1>
          <p>{m.message || 'A Argus está passando por uma manutenção rápida para ficar ainda melhor. Seus dados, leads e créditos estão seguros.'}</p>
          {when && (
            <p className="maint__eta"><img src="/icons/relogio.webp" alt="" width="22" height="22" /> Previsão de retorno: <strong>{when}</strong>{left ? ` (em ${left})` : ''}</p>
          )}
          <div className="maint__actions">
            <button className="btn btn--primary" disabled={busy} onClick={async () => { setBusy(true); await refresh(); setBusy(false) }}>
              <LuRefreshCw className={busy ? 'spin' : ''} /> Verificar de novo
            </button>
            <Link to="/entrar" className="maint__admin">Sou administrador</Link>
          </div>
          <small className="maint__note">Esta página atualiza sozinha quando a plataforma voltar.</small>
        </div>
      </div>
    </main>
  )
}
