import { ScrollView, View } from 'react-native';
import { colors, space } from '../lib/theme';
import { Card, T } from './ui';

export type Tip = { id: number; topic: string; title: string; body: string; icon?: string | null };

const ICONS: Record<string, string> = {
  apple: '🍎',
  banana: '🍌',
  shoe: '👟',
  water: '💧',
  drop: '🫧',
  pad: '🩹',
  'hot-water-bottle': '♨️',
  pillow: '🛏️',
  moon: '🌙',
  bag: '👜',
  heart: '💜',
  sparkle: '✨',
};

export function tipEmoji(icon?: string | null) {
  return (icon && ICONS[icon]) || '💡';
}

export function TipsRow({ tips }: { tips: Tip[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {tips.map((t) => (
        <Card key={t.id} style={{ flex: 1, alignItems: 'center', padding: space.md }}>
          <T size={34}>{tipEmoji(t.icon)}</T>
          <T weight="extrabold" size={14} style={{ marginTop: 6, textAlign: 'center' }}>
            {t.title}
          </T>
          <T size={12} color={colors.textMuted} style={{ textAlign: 'center', marginTop: 2 }} numberOfLines={4}>
            {t.body}
          </T>
        </Card>
      ))}
    </View>
  );
}

export function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingRight: space.lg }} style={{ marginHorizontal: -space.lg, paddingLeft: space.lg }}>
      {children}
    </ScrollView>
  );
}
