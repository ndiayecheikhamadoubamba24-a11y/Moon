import { Pressable, View } from 'react-native';
import { colors } from '../lib/theme';
import { T } from './ui';

export const MOODS = [
  { value: 'great', emoji: '😄', label: 'Super' },
  { value: 'good', emoji: '🙂', label: 'Bien' },
  { value: 'neutral', emoji: '😐', label: 'Bof' },
  { value: 'sad', emoji: '😟', label: 'Triste' },
  { value: 'crying', emoji: '😢', label: 'En pleurs' },
  { value: 'angry', emoji: '😠', label: 'En colère' },
];

export function MoodPicker({ value, onChange }: { value?: string | null; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {MOODS.map((m) => {
        const active = value === m.value;
        return (
          <Pressable
            key={m.value}
            onPress={() => onChange(m.value)}
            accessibilityLabel={m.label}
            accessibilityState={{ selected: active }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.lilac : 'transparent',
              transform: [{ scale: active ? 1.12 : 1 }],
            }}
          >
            <T size={30}>{m.emoji}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
