import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'

// Status do site definido pelo administrador: manutenção, aviso no topo, cadastros e pagamentos
const SiteContext = createContext({ status: null, refresh: () => {} })
export const useSite = () => useContext(SiteContext)

export function SiteProvider({ children }) {
  const [status, setStatus] = useState(null)
  const refresh = useCallback(() => api('site/status').then(setStatus).catch(() => {}), [])

  useEffect(() => {
    refresh()
    const onMaintenance = () => refresh()
    window.addEventListener('argus:maintenance', onMaintenance)
    return () => window.removeEventListener('argus:maintenance', onMaintenance)
  }, [refresh])

  // durante a manutenção, confere a cada 30 s se já voltou
  useEffect(() => {
    if (!status?.maintenance?.enabled) return
    const t = setInterval(refresh, 30_000)
    return () => clearInterval(t)
  }, [status?.maintenance?.enabled, refresh])

  return <SiteContext.Provider value={{ status, refresh }}>{children}</SiteContext.Provider>
}
