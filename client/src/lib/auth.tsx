import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError } from './api'
import { getSocket, disconnectSocket } from './socket'
import type { AuthedUser } from '@shared/types'

interface AuthContextValue {
  user: AuthedUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  signup: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  setUser: (u: AuthedUser | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthedUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function refreshUser() {
    try {
      const me = await api.get<AuthedUser>('/auth/me')
      setUser(me)
      getSocket().connect()
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [])

  async function login(username: string, password: string) {
    const me = await api.post<AuthedUser>('/auth/login', { username, password })
    setUser(me)
    getSocket().connect()
  }

  async function signup(username: string, password: string) {
    const me = await api.post<AuthedUser>('/auth/signup', { username, password })
    setUser(me)
    getSocket().connect()
  }

  async function logout() {
    await api.post('/auth/logout')
    setUser(null)
    disconnectSocket()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { ApiError }
