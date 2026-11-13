import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts } from '@expo-google-fonts/nunito';
import { router, useSegments } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.night }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <LockProvider>
          <CycleProvider>
            <Gate />
          </CycleProvider>
        </LockProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
