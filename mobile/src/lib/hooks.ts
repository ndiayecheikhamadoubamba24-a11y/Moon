import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { cachedGet, errorMessage, hasToken } from './api';

/**
 * Charge une ressource avec cache hors ligne ; se recharge à chaque retour sur l'écran
 * et dès que la session est prête (l'écran peut s'afficher avant la fin du chargement de la session).
 */
export function useApi<T = any>(path: string | null) {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const mounted = useRef(true);

  useEffect(() => () => void (mounted.current = false), []);

  const userId = user?.id;
  const reload = useCallback(async () => {
    if (!path) return;
    if (!hasToken()) return; // session pas encore prête ou déconnectée : on réessaiera quand l'utilisatrice sera connue
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
    // userId : relance l'appel quand la session devient prête
  }, [path, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { data, setData, loading, error, fromCache, reload };
}
