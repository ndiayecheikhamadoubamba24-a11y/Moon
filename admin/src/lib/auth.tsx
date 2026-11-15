import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler, tokenStore } from './api'

export type Staff = { id: number; name: string; email: string; role: 'super_admin' | 'educator' | 'moderator' | 'support'; must_change_password?: boolean }

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super administrateur',
  educator: 'Éducatrice',
  moderator: 'Modération',
  support: 'Accompagnement',
}

type AuthState = {
  staff: Staff | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  can: (...roles: string[]) => boolean
  /** Mot de passe saisi à la connexion (en mémoire seulement) : évite de le redemander au premier accès. */
  loginPassword: () => string | null
  changePassword: (current: string, password: string, confirmation: string) => Promise<void>
}
const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null)
  const [ready, setReady] = useState(false)
  const lastPassword = useRef<string | null>(null)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.set(null)
      setStaff(null)
    })
    if (!tokenStore.get()) return setReady(true)
    api<Staff>('/admin/me')
      .then(setStaff)
      .catch(() => tokenStore.set(null))
      .finally(() => setReady(true))
  }, [])

  const value: AuthState = {
    staff,
    ready,
    login: async (email, password) => {
      const res = await api<{ token: string }>('/auth/login', { method: 'POST', body: { email, password, device_name: 'back-office' } })
      tokenStore.set(res.token)
      lastPassword.current = password
      try {
        setStaff(await api<Staff>('/admin/me'))
      } catch (e) {
        tokenStore.set(null)
        throw new Error("Ce compte n'a pas accès au back-office.", { cause: e })
      }
    },
    logout: () => {
      api('/auth/logout', { method: 'POST' }).catch(() => {})
      tokenStore.set(null)
      lastPassword.current = null
      setStaff(null)
    },
    loginPassword: () => lastPassword.current,
    changePassword: async (current, password, confirmation) => {
      const me = await api<Staff>('/admin/password', { method: 'POST', body: { current_password: current, password, password_confirmation: confirmation } })
      lastPassword.current = null
      setStaff(me)
    },
    can: (...roles) => !!staff && (staff.role === 'super_admin' || roles.includes(staff.role)),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth hors AuthProvider')
  return c
}
