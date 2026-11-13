import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Burst, Float, PopIn, Pulse, StarField, useWiggle } from '../../components/anim';
import { MOON_MARK, PartnersStrip } from '../../components/Brand';
import { Button, T } from '../../components/ui';
import { colors, space } from '../../lib/theme';

const SLIDES = [
  { emoji: '📅', title: 'Suis ton cycle', text: 'Un grand calendrier pour savoir où tu en es, et quoi faire chaque jour.', bg: '#FDE4EC' },
  { emoji: '🎮', title: 'Apprends en jouant', text: 'Quiz, mythes ou réalités, badges : deviens experte de ton corps !', bg: '#FEF3DF' },
  { emoji: '💜', title: 'Je suis là pour toi', text: 'Pose tes questions sans gêne, trouve un centre près de chez toi.', bg: '#EDE7FA' },
];

/** Page d'accueil animée : logo Moon, présentation en 3 écrans, partenaires, accès à l'inscription. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const slideWidth = width - space.lg * 2;
  const [slide, setSlide] = useState(0);
  const [burst, setBurst] = useState(0);
  const [taps, setTaps] = useState(0);
  const wiggle = useWiggle();
  const scroll = useRef<ScrollViewInstance>(null);
  const progress = useRef(new Animated.Value(0)).current;

  // Défilement automatique des écrans de présentation
  useEffect(() => {
    const id = setInterval(() => {
      setSlide((s) => {
        const next = (s + 1) % SLIDES.length;
        scroll.current?.scrollTo({ x: next * slideWidth, animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(id);
  }, [slideWidth]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    progress.setValue(e.nativeEvent.contentOffset.x / slideWidth);
  };

  const tapMoon = () => {
    wiggle.wiggle();
    setBurst((b) => b + 1);
    setTaps((t) => t + 1);
  };

  return (
    <LinearGradient colors={[colors.night, '#4A2C8F', '#7B4FC4']} style={{ flex: 1 }}>
      <StarField />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xl, paddingHorizontal: space.lg }} showsVerticalScrollIndicator={false}>
        {/* Logo animé : touche-le ! */}
        <View style={{ alignItems: 'center', marginTop: space.md }}>
          <PopIn spring delay={150}>
            <Float distance={10}>
              <Pressable onPress={tapMoon} accessibilityRole="button" accessibilityLabel="Logo Moon : touche-moi">
                <Animated.View style={[s.logoBubble, wiggle.style]}>
                  <Image source={MOON_MARK} style={{ width: 110, height: 110 }} resizeMode="contain" />
                </Animated.View>
              </Pressable>
              <Burst trigger={burst} />
            </Float>
          </PopIn>
          <PopIn delay={450}>
            <T weight="black" size={46} color={colors.white} style={{ marginTop: space.md, letterSpacing: 1 }}>
              Moon
            </T>
          </PopIn>
          <PopIn delay={650}>
            <T weight="bold" size={16} color="#E5DBFF" style={{ textAlign: 'center' }}>
              {taps === 0 ? 'Ton cycle, sans tabou 🌙' : taps < 3 ? 'Coucou toi ! 👋' : taps < 6 ? 'Hihi, ça chatouille ! 😄' : 'Tu es une star ⭐'}
            </T>
          </PopIn>
        </View>

        {/* Présentation en 3 écrans */}
        <PopIn delay={850} style={{ marginTop: space.xl }}>
          <ScrollView
            ref={scroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / slideWidth))}
            style={{ width: slideWidth }}
          >
            {SLIDES.map((sl, i) => (
              <View key={sl.title} style={[s.slide, { width: slideWidth }]}>
                <SlideEmoji emoji={sl.emoji} bg={sl.bg} active={slide === i} />
                <T weight="black" size={22} color={colors.white} style={{ marginTop: space.md }}>
                  {sl.title}
                </T>
                <T size={15} color="#E5DBFF" style={{ textAlign: 'center', marginTop: 4, lineHeight: 21 }}>
                  {sl.text}
                </T>
              </View>
            ))}
          </ScrollView>
          <View style={s.dots}>
            {SLIDES.map((sl, i) => {
              const w = progress.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [8, 26, 8], extrapolate: 'clamp' });
              const o = progress.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
              return (
                <Pressable
                  key={sl.title}
                  onPress={() => {
                    setSlide(i);
                    scroll.current?.scrollTo({ x: i * slideWidth, animated: true });
                  }}
                  hitSlop={8}
                  accessibilityLabel={`Écran ${i + 1}`}
                >
                  <Animated.View style={[s.dot, { width: w, opacity: o }]} />
                </Pressable>
              );
            })}
          </View>
        </PopIn>

        {/* Inscription */}
        <PopIn delay={1050} style={{ marginTop: space.xl, gap: space.md }}>
          <Pulse>
            <Button title="Créer mon compte" icon="sparkles" onPress={() => router.push('/register')} />
          </Pulse>
          <Button title="J'ai déjà un compte" variant="outline" onPress={() => router.push('/login')} />
        </PopIn>

        {/* Partenaires */}
        <PopIn delay={1300} style={{ marginTop: space.xl }}>
          <PartnersStrip />
          <T size={11} color="#CFC2F2" style={{ textAlign: 'center', marginTop: space.md }}>
            Moon informe et ne remplace pas un avis médical. Tes données restent confidentielles.
          </T>
        </PopIn>
      </ScrollView>
    </LinearGradient>
  );
}

/** Illustration d'un écran : grosse bulle qui rebondit quand l'écran devient actif. */
function SlideEmoji({ emoji, bg, active }: { emoji: string; bg: string; active: boolean }) {
  const v = useRef(new Animated.Value(active ? 1 : 0.7)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: active ? 1 : 0.7, friction: 4, tension: 80, useNativeDriver: true }).start();
  }, [active, v]);
  return (
    <Animated.View style={[s.emojiBubble, { backgroundColor: bg, transform: [{ scale: v }, { rotate: v.interpolate({ inputRange: [0.7, 1], outputRange: ['-10deg', '0deg'] }) }] }]}>
      <T size={56}>{emoji}</T>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  logoBubble: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  slide: { alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md },
  emojiBubble: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: space.md },
  dot: { height: 8, borderRadius: 4, backgroundColor: colors.white },
});
