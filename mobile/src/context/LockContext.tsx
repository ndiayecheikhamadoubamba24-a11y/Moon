import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { secure } from '../lib/storage';

type LockState = {
  enabled: boolean;
  locked: boolean;
  biometricAvailable: boolean;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  setPin: (pin: string | null) => Promise<void>;
};

const LockContext = createContext<LockState | null>(null);
const RELOCK_AFTER_MS = 60_000;

/** Verrouillage par code PIN / biométrie, au lancement et après 1 min en arrière-plan. */
export function LockProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const backgroundAt = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const pin = await secure.get('pin');
      setEnabled(!!pin);
      setLocked(!!pin);
      const hasHardware = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const enrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
      setBiometricAvailable(hasHardware && enrolled);
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundAt.current = Date.now();
      if (state === 'active' && enabled && backgroundAt.current && Date.now() - backgroundAt.current > RELOCK_AFTER_MS) {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, [enabled]);

  const unlockWithPin = useCallback(async (pin: string) => {
    const ok = (await secure.get('pin')) === pin;
    if (ok) setLocked(false);
    return ok;
  }, []);

  const unlockWithBiometrics = useCallback(async () => {
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Déverrouiller Moon', cancelLabel: 'Utiliser mon code' });
    if (res.success) setLocked(false);
    return res.success;
  }, []);

  const setPin = useCallback(async (pin: string | null) => {
    if (pin) await secure.set('pin', pin);
    else await secure.remove('pin');
    setEnabled(!!pin);
  }, []);

  return (
    <LockContext.Provider value={{ enabled, locked, biometricAvailable, unlockWithPin, unlockWithBiometrics, setPin }}>{children}</LockContext.Provider>
  );
}

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock hors LockProvider');
  return ctx;
}
