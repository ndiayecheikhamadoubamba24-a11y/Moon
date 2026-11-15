import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts } from '@expo-google-fonts/nunito';
import { router, SplashScreen, useSegments } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CoverScreen } from '../components/CoverScreen';
import { FatouChatbot } from '../components/FatouChatbot';
import { LockScreen } from '../components/LockScreen';
import { Loading } from '../components/ui';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CycleProvider } from '../context/CycleContext';
import { LockProvider, useLock } from '../context/LockContext';
import { store } from '../lib/storage';
import { colors } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const { ready, user } = useAuth();
  const { locked } = useLock();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === '(auth)';
    const timer = setTimeout(() => {
      try {
        if (!user && !inAuth) {
          router.replace('/welcome');
        } else if (user && inAuth) {
          store.get('onboarded', false).then((done) => {
            try {
              router.replace(done ? '/' : '/onboarding');
            } catch {}
          });
        }
      } catch {}
    }, 50);
    return () => clearTimeout(timer);
  }, [ready, user, segments]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="day/[date]" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
      </Stack>
      {!ready && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', backgroundColor: colors.night, zIndex: 100 }]}>
          <Loading />
        </View>
      )}
      {user && !locked && segments[0] !== '(auth)' && <FatouChatbot />}
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
  const [fontsLoaded, fontError] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  const cover = useCover();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.night, justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: colors.white, fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
        Oups, une erreur est survenue au démarrage
      </Text>
      <ScrollView style={{ maxHeight: 260, backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12 }}>
        <Text style={{ color: colors.pinkSoft, fontSize: 13, fontFamily: 'monospace' }}>
          {error?.message ? `${error.message}\n\n${error.stack || ''}` : String(error)}
        </Text>
      </ScrollView>
      <Pressable
        onPress={retry}
        style={{ marginTop: 24, backgroundColor: colors.pink, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
      >
        <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 16 }}>Réessayer</Text>
      </Pressable>
    </View>
  );
}
