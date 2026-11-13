import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cachedGet, errorMessage } from './api';

/** Charge une ressource avec cache hors ligne ; se recharge à chaque retour sur l'écran. */
export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const mounted = useRef(true);

  useEffect(() => () => void (mounted.current = false), []);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      const res = await cachedGet<T>(path);
      if (!mounted.current) return;
      setData(res.data);
      setFromCache(res.fromCache);
      setError(null);
    } catch (e) {
      if (mounted.current) setError(errorMessage(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [path]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { data, setData, loading, error, fromCache, reload };
}
