import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { colors } from '../lib/theme';

const native = Platform.OS !== 'web';

/** Étoiles qui scintillent en arrière-plan. */
export function StarField({ count = 22, color = colors.gold }: { count?: number; color?: string }) {
  const { width, height } = useWindowDimensions();
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        x: Math.random() * width,
        y: Math.random() * height * 0.75,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 2000,
        duration: 1200 + Math.random() * 1800,
        sparkle: i % 5 === 0,
      })),
    [count, width, height],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map(({ key, ...s }) => (
        <Twinkle key={key} {...s} color={color} />
      ))}
    </View>
  );
}

function Twinkle({ x, y, size, delay, duration, sparkle, color }: { x: number; y: number; size: number; delay: number; duration: number; sparkle: boolean; color: string }) {
  const v = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        Animated.timing(v, { toValue: 0.2, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay, duration]);
  const scale = v.interpolate({ inputRange: [0.2, 1], outputRange: [0.6, 1.2] });
  if (sparkle) {
    return (
      <Animated.Text style={{ position: 'absolute', left: x, top: y, fontSize: size * 3, color, opacity: v, transform: [{ scale }] }}>✦</Animated.Text>
    );
  }
  return <Animated.View style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size, backgroundColor: color, opacity: v, transform: [{ scale }] }} />;
}

/** Flottement doux de haut en bas, en boucle. */
export function Float({ children, distance = 8, duration = 2200, style }: { children: ReactNode; distance?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] });
  return <Animated.View style={[style, { transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** Pulsation légère (pour attirer l'œil sur un bouton). */
export function Pulse({ children, style, scale = 1.04 }: { children: ReactNode; style?: StyleProp<ViewStyle>; scale?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        Animated.delay(800),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[style, { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, scale] }) }] }]}>{children}</Animated.View>;
}

/** Apparition : glisse vers le haut et devient visible, après un délai. */
export function PopIn({ children, delay = 0, from = 24, style, spring }: { children: ReactNode; delay?: number; from?: number; style?: StyleProp<ViewStyle>; spring?: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = spring
      ? Animated.spring(v, { toValue: 1, delay, friction: 5, tension: 60, useNativeDriver: native })
      : Animated.timing(v, { toValue: 1, delay, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: native });
    anim.start();
  }, [v, delay, spring]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }, ...(spring ? [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] : [])],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const BURST = ['💜', '⭐', '✨', '🌸', '💗', '🌙', '🎉', '💧'];

/** Explosion de petits symboles (cœurs, étoiles…) à partir du centre. Change `trigger` pour relancer. */
export function Burst({ trigger, items = BURST, count = 12, radius = 120 }: { trigger: number; items?: string[]; count?: number; radius?: number }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: `${trigger}-${i}`,
        emoji: items[(i + trigger) % items.length],
        angle: (i / count) * Math.PI * 2 + Math.random() * 0.4,
        dist: radius * (0.6 + Math.random() * 0.5),
        v: new Animated.Value(0),
      })),
    [trigger, count, items, radius],
  );
  useEffect(() => {
    if (!trigger) return;
    Animated.stagger(
      15,
      parts.map((p) => Animated.timing(p.v, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: native })),
    ).start();
  }, [parts, trigger]);
  if (!trigger) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      {parts.map((p) => (
        <Animated.Text
          key={p.key}
          style={{
            position: 'absolute',
            fontSize: 22,
            opacity: p.v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.dist] }) },
              { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * p.dist] }) },
              { scale: p.v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.2, 0.8] }) },
            ],
          }}
        >
          {p.emoji}
        </Animated.Text>
      ))}
    </View>
  );
}

/** Pluie de confettis (écran de bienvenue après l'inscription). */
export function Confetti({ count = 40 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        x: Math.random() * width,
        color: [colors.pink, colors.gold, colors.lilac, colors.purple, colors.green][i % 5],
        size: 6 + Math.random() * 8,
        delay: Math.random() * 600,
        drift: (Math.random() - 0.5) * 120,
        spin: Math.random() > 0.5 ? 1 : -1,
        v: new Animated.Value(0),
      })),
    [count, width],
  );
  useEffect(() => {
    Animated.parallel(
      pieces.map((p) => Animated.timing(p.v, { toValue: 1, delay: p.delay, duration: 2600, easing: Easing.in(Easing.quad), useNativeDriver: native })),
    ).start();
  }, [pieces]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <Animated.View
          key={p.key}
          style={{
            position: 'absolute',
            left: p.x,
            top: -20,
            width: p.size,
            height: p.size * 0.5,
            borderRadius: 2,
            backgroundColor: p.color,
            transform: [
              { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
              { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin * 720}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/** Petit rebond (à déclencher au toucher). */
export function useBounce() {
  const v = useRef(new Animated.Value(1)).current;
  const bounce = () => {
    v.setValue(0.85);
    Animated.spring(v, { toValue: 1, friction: 3, tension: 160, useNativeDriver: native }).start();
  };
  return { style: { transform: [{ scale: v }] }, bounce };
}

/** Petite secousse gauche-droite (le logo « fait coucou »). */
export function useWiggle() {
  const v = useRef(new Animated.Value(0)).current;
  const wiggle = () => {
    v.setValue(0);
    Animated.sequence(
      [1, -1, 0.6, -0.6, 0].map((to) => Animated.timing(v, { toValue: to, duration: 90, useNativeDriver: native })),
    ).start();
  };
  const rotate = v.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] });
  return { style: { transform: [{ rotate }] }, wiggle };
}
