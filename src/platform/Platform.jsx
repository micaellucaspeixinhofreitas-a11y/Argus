import { createContext, useContext, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { LuRadar, LuUsers, LuBookmark, LuCoins, LuCreditCard, LuShield, LuLogOut } from 'react-icons/lu'
import { useAuth } from '../lib/auth'
import { api, fmtInt } from '../lib/api'
import Prospect from './Prospect'
import Leads from './Leads'
import Saved from './Saved'
import Credits from './Credits'
import Subscription from './Subscription'
import Admin from './Admin'
import './platform.css'

// Estado da prospecção compartilhado entre as telas (não se perde ao trocar de aba)
const ProspectContext = createContext(null)
export const useProspect = () => useContext(ProspectContext)

const DRAFT_KEY = 'argus:draft'
export const emptyConfig = () => ({
  segments: [],
  country: 'BR',
  locality: '',
  radiusKm: 2,
  areas: [],
  qualification: { enabled: false, criteria: ['has_phone', 'no_website'], minScore: 100 },
})

function loadDraft() {
  try {
    return { ...emptyConfig(), ...JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') }
  } catch {
    return emptyConfig()
  }
}

function ProspectProvider({ children }) {
  const [config, setConfig] = useState(loadDraft)
  const [result, setResult] = useState(null)
  const [meta, setMeta] = useState({ segments: [], criteria: [], limits: { maxAreas: 10, minRadiusKm: 0.2, maxRadiusKm: 15 } })
  const [pendingRun, setPendingRun] = useState(null)

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(config)) } catch { /* armazenamento indisponível */ }
  }, [config])
  useEffect(() => {
    api('meta').then(setMeta).catch(() => {})
  }, [])

  return (
    <ProspectContext.Provider value={{ config, setConfig, result, setResult, meta, pendingRun, setPendingRun }}>
      {children}
    </ProspectContext.Provider>
  )
}

const TABS = [
  { to: '/app', label: 'Prospectar', icon: LuRadar, end: true },
  { to: '/app/leads', label: 'Leads', icon: LuUsers },
  { to: '/app/buscas', label: 'Buscas salvas', icon: LuBookmark },
  { to: '/app/creditos', label: 'Créditos', icon: LuCoins },
  { to: '/app/planos', label: 'Plano', icon: LuCreditCard },
]

export default function Platform() {
  const { user, loading, credits, logout } = useAuth()
  const navigate = useNavigate()
  if (loading) return <div className="page-loading"><span className="spinner" /> Carregando…</div>
  if (!user) return <Navigate to="/entrar" replace />

  return (
    <ProspectProvider>
      <div className="pf">
        <header className="pf-top">
          <NavLink to="/" className="pf-brand" aria-label="Argus — início">
            <img src="/argus-white.webp" alt="Argus" width="1400" height="423" />
          </NavLink>
          <nav className="pf-tabs" aria-label="Plataforma">
            {TABS.map(t => (
              <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `pf-tab ${isActive ? 'is-active' : ''}`}>
                <t.icon aria-hidden="true" /> <span>{t.label}</span>
              </NavLink>
            ))}
            {user.is_admin && (
              <NavLink to="/app/admin" className={({ isActive }) => `pf-tab ${isActive ? 'is-active' : ''}`}>
                <LuShield aria-hidden="true" /> <span>Admin</span>
              </NavLink>
            )}
          </nav>
          <div className="pf-user">
            {credits && (
              <NavLink to="/app/creditos" className="pf-credits" title="Créditos disponíveis · usados hoje / limite diário">
                <LuCoins aria-hidden="true" />
                <strong>{fmtInt(credits.available)}</strong>
                <small>{fmtInt(credits.today_used)}/{fmtInt(credits.daily_limit)} hoje</small>
              </NavLink>
            )}
            <button className="pf-icon-btn" onClick={async () => { await logout(); navigate('/') }} title="Sair" aria-label="Sair">
              <LuLogOut />
            </button>
          </div>
        </header>
        <main className="pf-main">
          <Routes>
            <Route index element={<Prospect />} />
            <Route path="leads" element={<Leads />} />
            <Route path="buscas" element={<Saved />} />
            <Route path="creditos" element={<Credits />} />
            <Route path="planos" element={<Subscription />} />
            {user.is_admin && <Route path="admin" element={<Admin />} />}
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </main>
      </div>
    </ProspectProvider>
  )
}
