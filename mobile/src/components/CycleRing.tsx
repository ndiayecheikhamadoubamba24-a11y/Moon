import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../lib/theme';
import { T } from './ui';

/** Anneau « Jour 7 / 28 ». */
export function CycleRing({ day, length, size = 110, label }: { day: number | null; length: number; size?: number; label?: string }) {
  const stroke = size * 0.085;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = day ? Math.min(day / length, 1) : 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.lavender} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.pink}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - progress)}
          strokeLinecap="round"
        />
      </Svg>
      {label && (
        <T weight="bold" size={size * 0.13}>
          {label}
        </T>
      )}
      <T weight="black" size={size * 0.33} style={{ lineHeight: size * 0.38 }}>
        {day ?? '–'}
      </T>
      {!label && (
        <T weight="bold" size={size * 0.13} color={colors.textMuted}>
          /{length}
        </T>
      )}
    </View>
  );
}
