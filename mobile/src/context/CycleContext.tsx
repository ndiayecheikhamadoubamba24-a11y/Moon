import NetInfo from '@react-native-community/netinfo';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Cycle, CycleModel } from '../lib/cycle';
import { addDays, ISODate, today } from '../lib/dates';
import { store } from '../lib/storage';
import { useAuth } from './AuthContext';

export type DailyLog = {
  date: ISODate;
  mood?: string | null;
  flow?: string | null;
  pain_level?: number | null;
  symptoms?: string[] | null;
  notes?: string | null;
};

export type PendingGame = { game_id: number; client_uuid: string; played_at: string; answers: { question_id: number; answer: unknown }[] };

type Pending = {
  logs: Record<ISODate, DailyLog & { deleted?: boolean }>;
  periods: Record<ISODate, { start_date: ISODate; end_date: ISODate | null }>;
  games: PendingGame[];
};

const EMPTY: Pending = { logs: {}, periods: {}, games: [] };

type CycleState = {
  model: CycleModel;
  logs: Record<ISODate, DailyLog>;
  online: boolean;
  pendingCount: number;
  syncing: boolean;
  startPeriod: (date?: ISODate) => Promise<void>;
  endPeriod: (date?: ISODate) => Promise<void>;
  addPeriod: (start: ISODate, end: ISODate | null) => Promise<void>;
  saveLog: (log: DailyLog) => Promise<void>;
  queueGame: (game: PendingGame) => Promise<void>;
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
};

const CycleContext = createContext<CycleState | null>(null);

/**
 * Données du cycle sur le téléphone : tout est enregistré localement d'abord,
 * puis envoyé au serveur (POST /sync) dès que la connexion est disponible.
 */
export function CycleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [logs, setLogs] = useState<Record<ISODate, DailyLog>>({});
  const [pending, setPending] = useState<Pending>(EMPTY);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const persist = useCallback((c: Cycle[], l: Record<ISODate, DailyLog>, p: Pending) => {
    store.set('cycle:data', { cycles: c, logs: l });
    store.set('cycle:pending', p);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [serverCycles, serverLogs] = await Promise.all([
        api<Cycle[]>('/cycles'),
        api<DailyLog[]>(`/logs?from=${addDays(today(), -400)}&to=${today()}`),
      ]);
      const p = pendingRef.current;
      // Les modifications locales non synchronisées restent prioritaires.
      const byStart = new Map(serverCycles.map((c) => [c.start_date, c]));
      Object.values(p.periods).forEach((per) => byStart.set(per.start_date, { ...byStart.get(per.start_date), ...per }));
      const mergedLogs: Record<ISODate, DailyLog> = {};
      serverLogs.forEach((l) => (mergedLogs[l.date.slice(0, 10)] = { ...l, date: l.date.slice(0, 10) }));
      Object.values(p.logs).forEach((l) => {
        if (l.deleted) delete mergedLogs[l.date];
        else mergedLogs[l.date] = l;
      });
      const merged = [...byStart.values()];
      setCycles(merged);
      setLogs(mergedLogs);
      persist(merged, mergedLogs, p);
    } catch {
      // hors ligne : on garde les données locales
    }
  }, [persist]);

  const sync = useCallback(async () => {
    const p = pendingRef.current;
    const count = Object.keys(p.logs).length + Object.keys(p.periods).length + p.games.length;
    if (!count || syncing) return;
    setSyncing(true);
    try {
      await api('/sync', {
        method: 'POST',
        body: {
          logs: Object.values(p.logs),
          period_starts: Object.values(p.periods),
          game_scores: p.games,
        },
      });
      setPending(EMPTY);
      store.set('cycle:pending', EMPTY);
      pendingRef.current = EMPTY;
      await refresh();
    } catch {
      // nouvelle tentative au prochain retour du réseau
    } finally {
      setSyncing(false);
    }
  }, [refresh, syncing]);

  // Chargement initial depuis le téléphone, puis le serveur.
  useEffect(() => {
    if (!user) {
      setCycles([]);
      setLogs({});
      setPending(EMPTY);
      return;
    }
    (async () => {
      const local = await store.get<{ cycles: Cycle[]; logs: Record<ISODate, DailyLog> }>('cycle:data', { cycles: [], logs: {} });
      const p = await store.get<Pending>('cycle:pending', EMPTY);
      setCycles(local.cycles);
      setLogs(local.logs);
      setPending(p);
      pendingRef.current = p;
      await refresh();
    })();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronise automatiquement au retour du réseau.
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const isOnline = !!state.isConnected && state.isInternetReachable !== false;
      setOnline(isOnline);
      if (isOnline && user) sync();
    });
  }, [user, sync]);

  const mutate = useCallback(
    async (nextCycles: Cycle[], nextLogs: Record<ISODate, DailyLog>, nextPending: Pending) => {
      setCycles(nextCycles);
      setLogs(nextLogs);
      setPending(nextPending);
      pendingRef.current = nextPending;
      persist(nextCycles, nextLogs, nextPending);
      await sync();
    },
    [persist, sync],
  );

  const model = useMemo(
    () => new CycleModel(cycles, { cycle_length: user?.cycle_length ?? 28, period_length: user?.period_length ?? 5 }),
    [cycles, user?.cycle_length, user?.period_length],
  );

  const value: CycleState = {
    model,
    logs,
    online,
    syncing,
    pendingCount: Object.keys(pending.logs).length + Object.keys(pending.periods).length + pending.games.length,
    refresh,
    sync,
    startPeriod: async (date = today()) => {
      const periods = { ...pending.periods };
      let next = cycles.filter((c) => c.start_date !== date);
      // Clôture des règles restées ouvertes
      next = next.map((c) => {
        if (!c.end_date && c.start_date < date) {
          const end = [addDays(c.start_date, model.avgPeriod - 1), addDays(date, -1)].sort()[0];
          periods[c.start_date] = { start_date: c.start_date, end_date: end };
          return { ...c, end_date: end };
        }
        return c;
      });
      next.push({ start_date: date, end_date: null });
      periods[date] = { start_date: date, end_date: null };
      await mutate(next, logs, { ...pending, periods });
    },
    endPeriod: async (date = today()) => {
      const current = [...cycles].sort((a, b) => a.start_date.localeCompare(b.start_date)).filter((c) => c.start_date <= date).pop();
      if (!current) return;
      const next = cycles.map((c) => (c.start_date === current.start_date ? { ...c, end_date: date } : c));
      await mutate(next, logs, { ...pending, periods: { ...pending.periods, [current.start_date]: { start_date: current.start_date, end_date: date } } });
    },
    addPeriod: async (start, end) => {
      const next = [...cycles.filter((c) => c.start_date !== start), { start_date: start, end_date: end }];
      await mutate(next, logs, { ...pending, periods: { ...pending.periods, [start]: { start_date: start, end_date: end } } });
    },
    saveLog: async (log) => {
      const empty = !log.mood && !log.flow && log.pain_level == null && !log.symptoms?.length && !log.notes;
      const nextLogs = { ...logs };
      if (empty) delete nextLogs[log.date];
      else nextLogs[log.date] = log;
      await mutate(cycles, nextLogs, { ...pending, logs: { ...pending.logs, [log.date]: empty ? { date: log.date, deleted: true } : log } });
    },
    queueGame: async (game) => {
      const next = { ...pending, games: [...pending.games, game] };
      setPending(next);
      pendingRef.current = next;
      store.set('cycle:pending', next);
    },
  };

  return <CycleContext.Provider value={value}>{children}</CycleContext.Provider>;
}

export function useCycle() {
  const ctx = useContext(CycleContext);
  if (!ctx) throw new Error('useCycle hors CycleProvider');
  return ctx;
}
