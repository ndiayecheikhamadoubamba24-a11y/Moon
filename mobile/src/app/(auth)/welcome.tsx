import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoonIcon, SleepyMoon } from '../../components/Moon';
import { Button, T } from '../../components/ui';
import { colors, space } from '../../lib/theme';

export default function Welcome() {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.brand}>
        <MoonIcon size={44} />
        <T weight="black" size={34} color={colors.white}>
          Moon
        </T>
      </View>
      <View style={{ alignItems: 'center', marginTop: space.xxl }}>
        <SleepyMoon size={240} />
        <T weight="black" size={26} color={colors.white} style={s.title}>
          Ton cycle, sans tabou
        </T>
        <T size={16} color="#D9CCF5" style={s.subtitle}>
          Suis tes règles, apprends en jouant et trouve de l'aide quand tu en as besoin. Tout reste confidentiel 💜
        </T>
      </View>
      <View style={{ gap: space.md }}>
        <Button title="Créer mon compte" onPress={() => router.push('/register')} />
        <Button title="J'ai déjà un compte" variant="outline" onPress={() => router.push('/login')} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.night, padding: space.xl, justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: space.lg },
  title: { textAlign: 'center', marginTop: space.xl },
  subtitle: { textAlign: 'center', marginTop: space.sm, lineHeight: 23 },
});
