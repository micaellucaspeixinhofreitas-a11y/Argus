// Configurações do site controladas pelo administrador (manutenção, aviso, cadastros, pagamentos)
import { query } from './db.js'

export const DEFAULTS = {
  maintenance: { enabled: false, scope: 'platform', message: '', eta: null },
  announcement: { enabled: false, text: '', tone: 'info' },
  registrationsOpen: true,
  paymentsEnabled: true,
  mappingEnabled: true,
}

let cache = null
let cachedAt = 0

export async function getSettings(force = false) {
  if (!force && cache && Date.now() - cachedAt < 10_000) return cache
  const { rows } = await query('select key, value from site_settings')
  const out = structuredClone(DEFAULTS)
  for (const { key, value } of rows) {
    if (!(key in out)) continue
    out[key] = typeof out[key] === 'object' && out[key] !== null ? { ...out[key], ...value } : value
  }
  cache = out
  cachedAt = Date.now()
  return out
}

export async function saveSetting(key, value, userId) {
  await query(
    `insert into site_settings (key, value, updated_by, updated_at) values ($1, $2, $3, now())
     on conflict (key) do update set value = $2, updated_by = $3, updated_at = now()`,
    [key, JSON.stringify(value), userId])
  cache = null
}

// o que qualquer visitante pode saber
export function publicStatus(s) {
  return {
    maintenance: s.maintenance.enabled ? { enabled: true, scope: s.maintenance.scope, message: s.maintenance.message, eta: s.maintenance.eta } : { enabled: false },
    announcement: s.announcement.enabled && s.announcement.text ? { text: s.announcement.text, tone: s.announcement.tone } : null,
    registrationsOpen: s.registrationsOpen,
    paymentsEnabled: s.paymentsEnabled,
    mappingEnabled: s.mappingEnabled,
  }
}
