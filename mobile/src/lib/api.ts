import Constants from 'expo-constants';
import { secure, store } from './storage';

/**
 * URL de l'API : variable EXPO_PUBLIC_API_URL, sinon `extra.apiUrl` de app.json
 * (10.0.2.2 = machine hôte depuis l'émulateur Android).
 */
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ?? 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }

  /** Premier message d'erreur lisible. */
  get first(): string {
    const first = Object.values(this.errors)[0];
    return first?.[0] ?? this.message;
  }
}

export class OfflineError extends Error {
  constructor() {
    super('Pas de connexion Internet.');
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export async function loadToken() {
  token = await secure.get('token');
  return token;
}

export async function setToken(value: string | null) {
  token = value;
  if (value) await secure.set('token', value);
  else await secure.remove('token');
}

export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function api<T = any>(path: string, options: { method?: Method; body?: unknown; timeout?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout ?? 15000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new OfflineError();
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);
  if (res.status === 401) onUnauthorized?.();
  if (!res.ok) {
    throw new ApiError(data?.message ?? 'Une erreur est survenue.', res.status, data?.errors ?? {});
  }
  return data as T;
}

/** GET avec cache local : renvoie la dernière réponse connue si le réseau est absent. */
export async function cachedGet<T = any>(path: string): Promise<{ data: T; fromCache: boolean }> {
  const key = `cache:${path}`;
  try {
    const data = await api<T>(path);
    store.set(key, data);
    return { data, fromCache: false };
  } catch (e) {
    if (e instanceof OfflineError) {
      const cached = await store.get<T | null>(key, null);
      if (cached !== null) return { data: cached, fromCache: true };
    }
    throw e;
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.first;
  if (e instanceof Error) return e.message;
  return 'Une erreur est survenue.';
}
