import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../lib/theme';
import { Float, PopIn, StarField } from './anim';
import { MOON_MARK, PartnersStrip } from './Brand';
import { T } from './ui';

const DURATION = 3200;
const native = Platform.OS !== 'web';

/**
 * Page de garde affichée à chaque entrée dans l'app : logo Moon + logos des partenaires.
 * Se ferme seule après ~3 s, ou en touchant « Entrer ».
 */
export function CoverScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const closing = useRef(false);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(fade, { toValue: 0, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: native }).start(() => onDone());
  };

  useEffect(() => {
    const anim = Animated.timing(progress, { toValue: 1, duration: DURATION, easing: Easing.linear, useNativeDriver: false });
    anim.start(({ finished }) => finished && close());
    return () => anim.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 200, opacity: fade }]} accessibilityViewIsModal>
      <LinearGradient colors={[colors.night, '#4A2C8F', '#7B4FC4']} style={{ flex: 1 }}>
        <StarField count={26} />
        <Pressable onPress={close} style={[s.container, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl }]} accessibilityLabel="Entrer dans Moon">
          <View style={{ alignItems: 'center' }}>
            <PopIn spring delay={100}>
              <Float distance={10}>
                <View style={s.logoBubble}>
                  <Image source={MOON_MARK} style={{ width: 120, height: 120 }} resizeMode="contain" accessibilityLabel="Moon" />
                </View>
              </Float>
            </PopIn>
            <PopIn delay={400}>
              <T weight="black" size={48} color={colors.white} style={{ marginTop: space.lg, letterSpacing: 1 }}>
                Moon
              </T>
            </PopIn>
            <PopIn delay={600}>
              <T weight="bold" size={16} color="#E5DBFF" style={{ textAlign: 'center' }}>
                Sensibilisation et accompagnement des jeunes{'\n'}sur l'hygiène menstruelle
              </T>
            </PopIn>
          </View>

          <PopIn delay={900} style={{ alignSelf: 'stretch' }}>
            <PartnersStrip title="Une initiative soutenue par" />
          </PopIn>

          <PopIn delay={1200} style={{ alignSelf: 'stretch', alignItems: 'center', gap: space.md }}>
            <View style={s.track}>
              <Animated.View style={[s.bar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
            </View>
            <Pressable onPress={close} style={s.enter} accessibilityRole="button" accessibilityLabel="Entrer">
              <T weight="extrabold" size={16} color={colors.night}>
                Entrer
              </T>
            </Pressable>
          </PopIn>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'space-between' },
  logoBubble: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  track: { width: 140, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  bar: { height: 5, borderRadius: 3, backgroundColor: colors.gold },
  enter: { backgroundColor: colors.white, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 999 },
});
