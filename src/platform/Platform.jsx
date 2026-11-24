import { createContext, useContext, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { LuRadar, LuUsers, LuBookmark, LuCoins, LuCrown, LuShield, LuLogOut, LuHouse, LuUserCog } from 'react-icons/lu'
import Dock from '../components/Dock'
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
import './theme.css'

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

// Dock de navegação da plataforma (fixa na parte de baixo)
function PlatformDock() {
  const { user, credits, logout } = useAuth()
  const { setConfig, setResult } = useProspect()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const at = path => (path === '/app' ? pathname === '/app' || pathname === '/app/' : pathname.startsWith(path))
  const go = path => () => navigate(path)

  const items = [
    {
      icon: <LuRadar />, label: 'Prospectar', active: at('/app'), onClick: go('/app'),
      menu: [
        { label: 'Nova prospecção', onClick: () => { setConfig(emptyConfig()); setResult(null); navigate('/app') } },
        { label: 'Abrir buscas salvas', onClick: go('/app/buscas') },
      ],
    },
    {
      icon: <LuUsers />, label: 'Leads', active: at('/app/leads'), onClick: go('/app/leads'),
      menu: [
        { label: 'Ver leads capturados', onClick: go('/app/leads') },
        { separator: true },
        { label: 'Exportar CSV', onClick: () => { window.location.href = '/api/leads/export' } },
      ],
    },
    { icon: <LuBookmark />, label: 'Buscas salvas', active: at('/app/buscas'), onClick: go('/app/buscas') },
    {
      icon: <LuCoins />, label: credits ? `Créditos · ${fmtInt(credits.available)} disponíveis` : 'Créditos',
      active: at('/app/creditos'), onClick: go('/app/creditos'),
      badge: credits && credits.can_spend === 0 ? '!' : undefined,
    },
    { icon: <LuUserCog />, label: 'Minha conta', active: at('/app/conta'), onClick: go('/app/conta') },
    ...(user.is_admin ? [{ icon: <LuShield />, label: 'Admin', active: at('/app/admin'), onClick: go('/app/admin') }] : []),
    { separator: true },
    { icon: <LuHouse />, label: 'Página inicial', onClick: go('/') },
    { icon: <LuLogOut />, label: 'Sair', onClick: async () => { await logout(); navigate('/') } },
  ]

  return (
    <div className="pf-dock">
      <Dock
        items={items}
        baseItemSize={50}
        magnification={70}
        panelHeight={68}
        accentColor="#8b5cf6"
        badgeColor="#f472b6"
        position="bottom"
        distance={200}
        gap={10}
        roundness={0.5}
        bounce
        autoHide={false}
        tiles
        showLabels
        showIndicators
        showBadges
        spring={{ mass: 0.1, stiffness: 220, damping: 4 }}
      />
    </div>
  )
}

const SECTIONS = [
  ['/app/leads', 'Leads'], ['/app/buscas', 'Buscas salvas'], ['/app/creditos', 'Créditos'],
  ['/app/planos', 'Planos'], ['/app/conta', 'Minha conta'], ['/app/admin', 'Administração'],
]

export default function Platform() {
  const { user, loading, credits, pro } = useAuth()
  const { search, pathname } = useLocation()
  const section = SECTIONS.find(([p]) => pathname.startsWith(p))?.[1] || 'Prospecção'
  if (loading) return <div className="page-loading"><span className="spinner" /> Carregando…</div>
  if (!user) return <Navigate to="/entrar" replace />

  return (
    <ProspectProvider>
      <div className="pf">
        <div className="pf-bg" aria-hidden="true">
          <div className="pf-bg__grid" />
          <div className="pf-bg__glow pf-bg__glow--a" />
          <div className="pf-bg__glow pf-bg__glow--b" />
        </div>
        <div className="noise" aria-hidden="true" />
        <header className="pf-top">
          <div className="pf-top__bar">
            <NavLink to="/" className="pf-brand" aria-label="Argus — início">
              <img src="/argus-white.webp" alt="Argus" width="1400" height="423" />
            </NavLink>
            <span className="pf-section"><i aria-hidden="true" />{section}</span>
            <div className="pf-user">
              <NavLink to="/app/planos" className={`pf-plans ${pro ? '' : 'is-upgrade'}`} title="Planos e pagamento">
                <LuCrown aria-hidden="true" />
                <span>{pro ? 'Planos' : 'Assinar Pro'}</span>
              </NavLink>
              {credits && (
                <NavLink to="/app/creditos" className="pf-credits" title="Créditos disponíveis · usados hoje / limite diário">
                  <LuCoins aria-hidden="true" />
                  <strong>{fmtInt(credits.available)}</strong>
                  <small>{fmtInt(credits.today_used)}/{fmtInt(credits.daily_limit)} hoje</small>
                </NavLink>
              )}
            </div>
          </div>
        </header>
        <main className="pf-main">
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
        <PlatformDock />
      </div>
    </ProspectProvider>
  )
}
