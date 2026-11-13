import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLock } from '../context/LockContext';
import { colors } from '../lib/theme';
import { MoonIcon } from './Moon';
import { T } from './ui';

/** Écran de verrouillage par code PIN (4 chiffres) ou biométrie. */
export function LockScreen() {
  const { unlockWithPin, unlockWithBiometrics, biometricAvailable } = useLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (biometricAvailable) unlockWithBiometrics();
  }, [biometricAvailable, unlockWithBiometrics]);

  useEffect(() => {
    if (pin.length === 4) {
      unlockWithPin(pin).then((ok) => {
        if (!ok) {
          setError(true);
          setPin('');
        }
      });
    }
  }, [pin, unlockWithPin]);

  const press = (d: string) => {
    setError(false);
    setPin((p) => (p.length < 4 ? p + d : p));
  };

  return (
    <View style={[StyleSheet.absoluteFill, s.container]}>
      <MoonIcon size={64} />
      <T weight="black" size={24} color={colors.white} style={{ marginTop: 16 }}>
        Moon est verrouillée
      </T>
      <T size={15} color={error ? colors.pink : '#D9CCF5'} style={{ marginTop: 6 }}>
        {error ? 'Code incorrect, réessaie.' : 'Entre ton code secret'}
      </T>
      <View style={s.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[s.dot, i < pin.length && { backgroundColor: colors.gold }]} />
        ))}
      </View>
      <View style={s.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'].map((k) => (
          <Pressable
            key={k}
            style={s.key}
            accessibilityLabel={k === 'del' ? 'Effacer' : k === 'bio' ? 'Biométrie' : k}
            onPress={() => (k === 'del' ? setPin((p) => p.slice(0, -1)) : k === 'bio' ? biometricAvailable && unlockWithBiometrics() : press(k))}
          >
            {k === 'del' ? (
              <Ionicons name="backspace-outline" size={26} color={colors.white} />
            ) : k === 'bio' ? (
              biometricAvailable ? <Ionicons name="finger-print" size={28} color={colors.white} /> : null
            ) : (
              <T weight="extrabold" size={28} color={colors.white}>
                {k}
              </T>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: colors.night, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  dots: { flexDirection: 'row', gap: 16, marginVertical: 32 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.gold },
  pad: { width: 280, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  key: { width: 80, height: 70, alignItems: 'center', justifyContent: 'center' },
});
