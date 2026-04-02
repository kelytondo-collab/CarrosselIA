import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { getToken, clearToken, apiGetMe, apiLogin, apiRegister, type AuthUser } from '../services/apiService'

interface AuthCtx {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; name: string; password: string; birth_date?: string; niche?: string; referral_code?: string }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  isTrialExpired: boolean
  isPaid: boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const { user: userData } = await apiGetMe()
      setUser(userData)
    } catch {
      setUser(null)
      clearToken()
    }
  }, [])

  useEffect(() => {
    const token = getToken()
    if (token) {
      refreshUser().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }

    // Listen for forced logout (401)
    const handleLogout = () => { setUser(null) }
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [refreshUser])

  const login = async (email: string, password: string) => {
    const { user: userData } = await apiLogin(email, password)
    setUser(userData)
  }

  const register = async (data: { email: string; name: string; password: string; birth_date?: string; niche?: string; referral_code?: string }) => {
    const { user: userData } = await apiRegister(data)
    setUser(userData)
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  const isTrialExpired = !!(
    user &&
    user.plan === 'trial' &&
    user.trial_ends_at &&
    new Date(user.trial_ends_at) < new Date()
  )

  const isPaid = !!(user && ['essencial', 'profissional', 'agencia', 'admin'].includes(user.plan))

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, isTrialExpired, isPaid }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
