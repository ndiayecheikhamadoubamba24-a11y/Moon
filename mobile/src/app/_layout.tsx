import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts } from '@expo-google-fonts/nunito';
import { router, useSegments } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CoverScreen } from '../components/CoverScreen';
import { LockScreen } from '../components/LockScreen';
import { Loading } from '../components/ui';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CycleProvider } from '../context/CycleContext';
import { LockProvider, useLock } from '../context/LockContext';
import { store } from '../lib/storage';
import { colors } from '../lib/theme';

function Gate() {
  const { ready, user } = useAuth();
  const { locked } = useLock();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/welcome');
    } else if (user && inAuth) {
      store.get('onboarded', false).then((done) => router.replace(done ? '/' : '/onboarding'));
    }
  }, [ready, user, segments]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.night }}>
        <Loading />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="day/[date]" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
      </Stack>
      {user && locked && <LockScreen />}
    </>
  );
}

/** Après combien de temps en arrière-plan le retour dans l'app compte comme une nouvelle entrée. */
const COVER_AFTER_BACKGROUND_MS = 5 * 60 * 1000;

/** Page de garde (logos) à chaque entrée dans l'app : au lancement et au retour après une longue absence. */
function useCover() {
  const [visible, setVisible] = useState(true);
  const backgroundAt = useRef<number | null>(null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundAt.current = Date.now();
      if (state === 'active' && backgroundAt.current && Date.now() - backgroundAt.current > COVER_AFTER_BACKGROUND_MS) setVisible(true);
      if (state === 'active') backgroundAt.current = null;
    });
    return () => sub.remove();
  }, []);
  return { visible, hide: () => setVisible(false) };
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  const cover = useCover();
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.night }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <LockProvider>
          <CycleProvider>
            <Gate />
            {cover.visible && <CoverScreen onDone={cover.hide} />}
          </CycleProvider>
        </LockProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
