import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../lib/theme';

/** Croissant de lune du logo. */
export function MoonIcon({ size = 32, color = colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M40 6a26 26 0 1 0 18 44A22 22 0 0 1 40 6z" fill={color} />
    </Svg>
  );
}

/** Mascotte : lune endormie sur un nuage. */
export function SleepyMoon({ size = 180 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 200 160">
      <Circle cx="160" cy="30" r="4" fill={colors.gold} />
      <Circle cx="30" cy="40" r="3" fill={colors.gold} />
      <Circle cx="175" cy="80" r="2.5" fill={colors.gold} />
      <Path d="M112 18a52 52 0 1 0 42 84A44 44 0 0 1 112 18z" fill={colors.gold} />
      <Path d="M78 70q6 6 12 0M100 76q6 6 12 0" stroke={colors.night} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M90 90q7 5 14 0" stroke={colors.night} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M20 140c0-14 12-24 26-22 4-14 22-20 34-10 10-8 28-4 32 10 14-2 26 8 24 22z" fill={colors.lilac} />
      <Path d="M110 146c0-10 8-17 18-16 3-10 16-14 24-7 8-5 20-2 22 7 10-1 18 6 17 16z" fill={colors.lavender} />
    </Svg>
  );
}
