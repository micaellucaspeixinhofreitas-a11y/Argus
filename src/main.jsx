import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import App from './App'
import Auth from './pages/Auth'
import './index.css'

// A plataforma (mapa etc.) é carregada sob demanda para a página inicial ficar leve
const Platform = lazy(() => import('./platform/Platform'))

const Loading = () => <div className="page-loading"><span className="spinner" /> Carregando…</div>

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/entrar" element={<Auth />} />
          <Route path="/app/*" element={<Suspense fallback={<Loading />}><Platform /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
)
