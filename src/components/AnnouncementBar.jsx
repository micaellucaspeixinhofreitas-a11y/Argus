import { useState } from 'react'
import { LuInfo, LuTriangleAlert, LuCircleCheck, LuX } from 'react-icons/lu'
import { useSite } from '../lib/site'

const ICONS = { info: LuInfo, warning: LuTriangleAlert, success: LuCircleCheck }
const keyOf = text => `argus:aviso:${text}`

// Aviso no topo definido pelo administrador (pode ser fechado; volta se o texto mudar)
export default function AnnouncementBar() {
  const { status } = useSite()
  const a = status?.announcement
  const [closed, setClosed] = useState(false)
  if (!a || closed) return null
  try { if (sessionStorage.getItem(keyOf(a.text))) return null } catch { /* sem armazenamento */ }
  const Icon = ICONS[a.tone] || LuInfo
  return (
    <div className={`announce announce--${a.tone}`} role="status">
      <Icon aria-hidden="true" />
      <span>{a.text}</span>
      <button aria-label="Fechar aviso" onClick={() => { try { sessionStorage.setItem(keyOf(a.text), '1') } catch { /* */ } setClosed(true) }}><LuX /></button>
    </div>
  )
}
