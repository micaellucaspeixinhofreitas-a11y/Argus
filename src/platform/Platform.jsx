import { createContext, useContext, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { LuRadar, LuUsers, LuBookmark, LuCoins, LuCrown, LuShield, LuLogOut, LuHouse, LuUserCog, LuMenu, LuX, LuPlus, LuChevronRight } from 'react-icons/lu'
import { useAuth } from '../lib/auth'
import { api, fmtInt } from '../lib/api'
import Prospect from './Prospect'
import Leads from './Leads'
import Saved from './Saved'
import Credits from './Credits'
import Subscription from './Subscription'
import Admin from './Admin'
import Account from './Account'
import './platform.css'
import './app.css'

// Estado da prospecção compartilhado entre as telas (não se perde ao trocar de aba)
const ProspectContext = createContext(null)
export const useProspect = () => useContext(ProspectContext)

const DRAFT_KEY = 'argus:draft'
export const emptyConfig = () => ({
  segments: [],
  country: 'BR',
  locality: '',
  radiusKm: 2,
  maxResults: 100,
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

// Navegação lateral da plataforma
const NAV = [
  { group: 'Prospecção', items: [
    { to: '/app', label: 'Prospectar', icon: LuRadar, exact: true },
    { to: '/app/buscas', label: 'Buscas salvas', icon: LuBookmark },
  ] },
  { group: 'Resultados', items: [
    { to: '/app/leads', label: 'Leads', icon: LuUsers },
  ] },
  { group: 'Conta', items: [
    { to: '/app/creditos', label: 'Créditos', icon: LuCoins },
    { to: '/app/planos', label: 'Planos', icon: LuCrown },
    { to: '/app/conta', label: 'Minha conta', icon: LuUserCog },
  ] },
]

const TITLES = [
  ['/app/leads', 'Leads'], ['/app/buscas', 'Buscas salvas'], ['/app/creditos', 'Créditos'],
  ['/app/planos', 'Planos'], ['/app/conta', 'Minha conta'], ['/app/admin', 'Administração'],
]

function Sidebar({ open, onClose }) {
  const { user, credits, pro, logout } = useAuth()
  const navigate = useNavigate()
  const groups = user.is_admin
    ? [...NAV, { group: 'Administração', items: [{ to: '/app/admin', label: 'Admin', icon: LuShield }] }]
    : NAV
  const monthPct = credits?.monthly_credits ? Math.min(100, (credits.available / credits.monthly_credits) * 100) : 0
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase()

  return (
    <>
      <div className={`side-overlay ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`side ${open ? 'is-open' : ''}`} aria-label="Navegação da plataforma">
        <div className="side__top">
          <NavLink to="/" className="side__brand" aria-label="Argus — página inicial">
            <img src="/argus-white.webp" alt="Argus" width="1400" height="423" />
          </NavLink>
          <button className="side__close" onClick={onClose} aria-label="Fechar menu"><LuX /></button>
        </div>

        <nav className="side__nav">
          {groups.map(g => (
            <div className="side__group" key={g.group}>
              <span className="side__label">{g.group}</span>
              {g.items.map(({ to, label, icon: Icon, exact }) => (
                <NavLink key={to} to={to} end={exact} className={({ isActive }) => `side__link ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                  {to === '/app/creditos' && credits?.can_spend === 0 && <em className="side__badge">!</em>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {credits && (
          <div className="side__credits">
            <div className="side__credits-head">
              <span>Plano {credits.plan?.name || ''}</span>
              {pro && <em className="side__pro">PRO</em>}
            </div>
            <strong>{fmtInt(credits.available)}<small> / {fmtInt(credits.monthly_credits)}</small></strong>
            <span className="side__meter"><i style={{ width: `${monthPct}%` }} /></span>
            <small className="side__muted">Hoje: {fmtInt(credits.today_used)} de {fmtInt(credits.daily_limit)} leads</small>
            {!pro && <NavLink to="/app/planos" className="side__upgrade" onClick={onClose}><LuCrown aria-hidden="true" /> Assinar o Pro</NavLink>}
          </div>
        )}

        <div className="side__user">
          <span className="side__avatar" aria-hidden="true">{initial}</span>
          <span className="side__who">
            <strong>{user.name || 'Minha conta'}</strong>
            <small>{user.email}</small>
          </span>
          <button className="side__icon" title="Sair" aria-label="Sair" onClick={async () => { await logout(); navigate('/') }}><LuLogOut /></button>
        </div>
        <NavLink to="/" className="side__home"><LuHouse aria-hidden="true" /> Página inicial</NavLink>
      </aside>
    </>
  )
}

function TopBar({ onMenu }) {
  const { setConfig, setResult } = useProspect()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] || 'Prospectar'
  return (
    <header className="topbar">
      <button className="topbar__menu" onClick={onMenu} aria-label="Abrir menu"><LuMenu /></button>
      <NavLink to="/app" className="topbar__logo" aria-label="Argus"><img src="/argus-white.webp" alt="" width="1400" height="423" /></NavLink>
      <div className="topbar__crumbs">
        <span>Argus</span><LuChevronRight aria-hidden="true" /><strong>{title}</strong>
      </div>
      <div className="topbar__actions">
        <button className="btn btn--primary btn--sm topbar__new" onClick={() => { setConfig(emptyConfig()); setResult(null); navigate('/app') }}>
          <LuPlus aria-hidden="true" /> <span>Nova prospecção</span>
        </button>
      </div>
    </header>
  )
}

export default function Platform() {
  const { user, loading } = useAuth()
  const { search, pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => { setMenuOpen(false) }, [pathname])
  if (loading) return <div className="page-loading"><span className="spinner" /> Carregando…</div>
  if (!user) return <Navigate to="/entrar" replace />

  return (
    <ProspectProvider>
      <div className="pf app">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="app__main">
          <TopBar onMenu={() => setMenuOpen(true)} />
          <main className="pf-main app__content">
            <Routes>
              <Route index element={<Prospect />} />
              <Route path="leads" element={<Leads />} />
              <Route path="buscas" element={<Saved />} />
              <Route path="creditos" element={<Credits />} />
              <Route path="planos" element={<Subscription />} />
              <Route path="conta" element={<Account />} />
              <Route path="pagamento" element={<Navigate to={`/app/planos${search}`} replace />} />
              {user.is_admin && <Route path="admin" element={<Admin />} />}
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </ProspectProvider>
  )
}
