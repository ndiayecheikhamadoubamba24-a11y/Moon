import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../lib/theme';
import { MoonIcon } from './Moon';
import { T } from './ui';

/** En-tête violet nuit avec lune, titre et actions. */
export function NightHeader({ title, subtitle, right, back, children }: { title: string; subtitle?: string; right?: ReactNode; back?: boolean; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: insets.top + space.sm }]}>
      <View style={s.row}>
        {back ? (
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Retour">
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </Pressable>
        ) : (
          <MoonIcon size={34} />
        )}
        <View style={{ flex: 1, marginLeft: space.md }}>
          <T weight="black" size={21} color={colors.white}>
            {title}
          </T>
          {subtitle ? (
            <T weight="semibold" size={14} color="#D9CCF5">
              {subtitle}
            </T>
          ) : null}
        </View>
        {right}
        <T size={14} color={colors.gold} style={s.stars}>
          ✦ ✧
        </T>
      </View>
      {children}
    </View>
  );
}

export function HeaderIcon({ name, onPress, badge, label }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void; badge?: boolean; label: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={{ marginLeft: space.md }} accessibilityLabel={label}>
      <Ionicons name={name} size={26} color={colors.white} />
      {badge && <View style={s.badge} />}
    </Pressable>
  );
}

export function OfflineBanner({ pending }: { pending?: number }) {
  return (
    <View style={s.offline}>
      <Ionicons name="cloud-offline" size={18} color={colors.night} />
      <T weight="bold" size={13} style={{ flex: 1 }}>
        Mode hors ligne : tes données seront synchronisées plus tard{pending ? ` (${pending} en attente)` : ''}.
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: colors.night, paddingHorizontal: space.lg, paddingBottom: space.xl, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  row: { flexDirection: 'row', alignItems: 'center' },
  stars: { position: 'absolute', right: 70, top: 0, opacity: 0.8 },
  badge: { position: 'absolute', right: -1, top: 0, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.pink },
  offline: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.goldSoft, padding: space.md },
});
