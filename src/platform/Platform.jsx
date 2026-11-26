import { createContext, useContext, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { LuRadar, LuUsers, LuBookmark, LuCoins, LuCrown, LuShield, LuLogOut, LuHouse, LuLayoutDashboard } from 'react-icons/lu'
import Dock from '../components/Dock'
import { useAuth } from '../lib/auth'
import { useSite } from '../lib/site'
import Maintenance from '../pages/Maintenance'
import AnnouncementBar from '../components/AnnouncementBar'
import AccountMenu from './AccountMenu'
import { api, fmtInt } from '../lib/api'
import Prospect from './Prospect'
import Dashboard from './Dashboard'
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

// Dock de navegação da plataforma (fixa na parte de baixo)
function PlatformDock() {
  const { user, credits, logout } = useAuth()
  const { setConfig, setResult } = useProspect()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const at = path => (path === '/app' ? pathname === '/app' || pathname === '/app/' : pathname.startsWith(path))
  const go = path => () => navigate(path)

  const items = [
    { icon: <LuLayoutDashboard />, label: 'Dashboard', active: at('/app'), onClick: go('/app') },
    {
      icon: <LuRadar />, label: 'Prospectar', active: at('/app/prospectar'), onClick: go('/app/prospectar'),
      menu: [
        { label: 'Nova prospecção', onClick: () => { setConfig(emptyConfig()); setResult(null); navigate('/app/prospectar') } },
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
      badge: credits && credits.can_search === false ? '!' : undefined,
    },
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

const TITLES = [
  ['/app/prospectar', 'Prospectar'],
  ['/app/leads', 'Leads'], ['/app/buscas', 'Buscas salvas'], ['/app/creditos', 'Créditos'],
  ['/app/planos', 'Planos'], ['/app/conta', 'Minha conta'], ['/app/admin', 'Administração'],
]

// Cabeçalho da plataforma: marca, página atual, plano, créditos e conta
function TopBar() {
  const { user, credits, pro } = useAuth()
  const { pathname } = useLocation()
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] || 'Dashboard'
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <NavLink to="/" className="topbar__logo" aria-label="Argus — página inicial">
          <img src="/argus-white.webp" alt="Argus" width="1400" height="423" />
        </NavLink>
        <span className="topbar__sep" aria-hidden="true">/</span>
        <span className="topbar__title">{title}</span>
        <div className="topbar__actions">
          {credits && (
            <NavLink to="/app/creditos" className="topbar__credits" title="Créditos disponíveis no mês · leads capturados hoje">
              <img className="topbar__coin" src="/icons/moeda.webp" alt="" width="20" height="20" />
              <strong>{fmtInt(credits.available)}</strong>
              <span>créditos</span>
              <i aria-hidden="true" />
              <small>{fmtInt(credits.today_used)}/{fmtInt(credits.daily_limit)} buscas hoje</small>
            </NavLink>
          )}
          <NavLink to="/app/planos" className={`topbar__plan ${pro ? '' : 'is-upgrade'}`}>
            <LuCrown aria-hidden="true" /> <span>{pro ? 'Planos' : 'Assinar Pro'}</span>
          </NavLink>
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}

export default function Platform() {
  const { user, loading } = useAuth()
  const { status: site } = useSite()
  const { search, pathname } = useLocation()
  if (loading) return <div className="page-loading"><span className="spinner" /> Carregando…</div>
  if (!user) return <Navigate to="/entrar" replace />
  if (site?.maintenance?.enabled && !user.is_admin) return <Maintenance />

  return (
    <ProspectProvider>
      <div className="pf app">
        {site?.maintenance?.enabled && (
          <div className="announce announce--warning announce--admin" role="status">
            <span>Modo manutenção ligado{site.maintenance.scope === 'all' ? ' (site inteiro)' : ''}: só administradores estão vendo a plataforma.</span>
            <NavLink to="/app/admin">Gerenciar</NavLink>
          </div>
        )}
        <AnnouncementBar />
        <TopBar />
        <main className="pf-main app__content">
          <div key={pathname} className="route-anim">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="prospectar" element={<Prospect />} />
            <Route path="leads" element={<Leads />} />
            <Route path="buscas" element={<Saved />} />
            <Route path="creditos" element={<Credits />} />
            <Route path="planos" element={<Subscription />} />
            <Route path="conta" element={<Account />} />
            <Route path="pagamento" element={<Navigate to={`/app/planos${search}`} replace />} />
            {user.is_admin && <Route path="admin" element={<Admin />} />}
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
          </div>
        </main>
        <PlatformDock />
      </div>
    </ProspectProvider>
  )
}
