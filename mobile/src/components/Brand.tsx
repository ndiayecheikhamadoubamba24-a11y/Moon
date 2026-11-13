import { Image, StyleProp, View, ViewStyle } from 'react-native';
import { colors, space } from '../lib/theme';
import { T } from './ui';

export const MOON_LOGO = require('../../assets/brand/moon-logo.png');
export const MOON_MARK = require('../../assets/brand/moon-mark.png');

export const PARTNERS = [
  { key: 'mjs', name: 'Ministère de la Jeunesse et des Sports', logo: require('../../assets/partners/mjs.png'), ratio: 1.84 },
  { key: 'unfpa', name: 'UNFPA', logo: require('../../assets/partners/unfpa.png'), ratio: 2.13 },
  { key: 'dpsj', name: 'Direction de la Protection Sociale des Jeunes', logo: require('../../assets/partners/dpsj.png'), ratio: 1.04 },
];

/** Pictogramme Moon dans une pastille blanche (lisible sur les fonds violets). */
export function BrandBadge({ size = 40, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Image source={MOON_MARK} style={{ width: size * 0.72, height: size * 0.72 }} resizeMode="contain" accessibilityLabel="Moon" />
    </View>
  );
}

/** Bandeau des partenaires institutionnels. */
export function PartnersStrip({ title = 'Une initiative soutenue par', compact }: { title?: string; compact?: boolean }) {
  const h = compact ? 34 : 46;
  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 20, paddingVertical: space.md, paddingHorizontal: space.lg, alignItems: 'center' }}>
      <T weight="bold" size={12} color={colors.textMuted} style={{ marginBottom: space.sm }}>
        {title}
      </T>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.lg, flexWrap: 'wrap' }}>
        {PARTNERS.map((p) => (
          <Image key={p.key} source={p.logo} style={{ height: h, width: h * p.ratio }} resizeMode="contain" accessibilityLabel={p.name} />
        ))}
      </View>
    </View>
  );
}
