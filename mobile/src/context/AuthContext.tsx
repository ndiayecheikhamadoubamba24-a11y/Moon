import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, loadToken, setToken, setUnauthorizedHandler } from '../lib/api';
import { store } from '../lib/storage';

export type User = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  age_range: string | null;
  language: 'fr' | 'wo';
  mode: 'suivi' | 'comprendre';
  avatar: string | null;
  role: string;
  points: number;
  streak_days: number;
  cycle_length: number;
  period_length: number;
  leaderboard_opt_in: boolean;
  notification_settings: { discreet?: boolean; enabled?: boolean } | null;
};

type AuthState = {
  ready: boolean;
  user: User | null;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (patch: Partial<User> & Record<string, unknown>) => Promise<User>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const signOut = useCallback(async () => {
    api('/auth/logout', { method: 'POST' }).catch(() => {});
    await setToken(null);
    await store.clearAll(); // efface aussi le cache local des données de santé
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
    (async () => {
      const token = await loadToken();
      if (token) {
        const cached = await store.get<User | null>('user', null);
        setUser(cached);
        api<User>('/me')
          .then((u) => {
            setUser(u);
            store.set('user', u);
          })
          .catch(() => {});
      }
      setReady(true);
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      user,
      signIn: async (token, u) => {
        await setToken(token);
        await store.set('user', u);
        setUser(u);
      },
      signOut,
      refreshUser: async () => {
        const u = await api<User>('/me');
        await store.set('user', u);
        setUser(u);
      },
      updateUser: async (patch) => {
        const u = await api<User>('/me', { method: 'PATCH', body: patch });
        await store.set('user', u);
        setUser(u);
        return u;
      },
    }),
    [ready, user, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth hors AuthProvider');
  return ctx;
}
