/** Client de l'API Laravel (jeton Sanctum gardé pour la session du navigateur). */
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>
  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }
  get first(): string {
    return Object.values(this.errors)[0]?.[0] ?? this.message
  }
}

const TOKEN_KEY = 'moon_admin_token'
export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (t: string | null) => (t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY)),
}

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn)

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export async function api<T = any>(path: string, opts: { method?: Method; body?: unknown } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(tokenStore.get() ? { Authorization: `Bearer ${tokenStore.get()}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError('Impossible de joindre le serveur.', 0)
  }
  const data = await res.json().catch(() => null)
  if (res.status === 401) onUnauthorized?.()
  if (!res.ok) throw new ApiError(data?.message ?? 'Une erreur est survenue.', res.status, data?.errors ?? {})
  return data as T
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.first
  if (e instanceof Error) return e.message
  return 'Une erreur est survenue.'
}

/** Construit une chaîne de requête en ignorant les valeurs vides ; les tableaux deviennent key[]=… */
export function qs(params: Record<string, unknown>): string {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return
    if (Array.isArray(v)) v.forEach((x) => p.append(`${k}[]`, String(x)))
    else p.set(k, String(v))
  })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export type Paginated<T> = { data: T[]; current_page: number; last_page: number; total: number; per_page: number; from: number | null; to: number | null }
