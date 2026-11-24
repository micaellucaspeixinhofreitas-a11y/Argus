import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, credits: null, pro: false })

  const refresh = useCallback(async () => {
    try {
      const data = await api('auth/me')
      setState({ loading: false, user: data.user, credits: data.credits || null, pro: Boolean(data.pro) })
      return data
    } catch {
      setState({ loading: false, user: null, credits: null, pro: false })
      return null
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = async (email, password) => {
    await api('auth/login', { method: 'POST', body: { email, password } })
    return refresh()
  }
  const register = async (name, email, password, acceptTerms) => {
    await api('auth/register', { method: 'POST', body: { name, email, password, acceptTerms } })
    return refresh()
  }
  const logout = async () => {
    await api('auth/logout', { method: 'POST', body: {} })
    setState({ loading: false, user: null, credits: null })
  }
  const setCredits = credits => setState(s => ({ ...s, credits }))

  return (
    <AuthContext.Provider value={{ ...state, refresh, login, register, logout, setCredits }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
