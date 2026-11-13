import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow, space } from '../lib/theme';

type Weight = 'regular' | 'semibold' | 'bold' | 'extrabold' | 'black';

export function T({ weight = 'regular', size = 15, color = colors.text, style, ...props }: TextProps & { weight?: Weight; size?: number; color?: string }) {
  return <Text {...props} style={[{ fontFamily: fonts[weight], fontSize: size, color }, style]} />;
}

export function Screen({
  children,
  scroll = true,
  style,
  padded = true,
  edges = ['top'],
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  edges?: ('top' | 'bottom')[];
}) {
  const content = padded ? { padding: space.lg, paddingBottom: space.xxl } : undefined;
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      {scroll ? (
        <ScrollView contentContainerStyle={content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, content]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress, tint }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tint?: string }) {
  const body = [styles.card, tint ? { backgroundColor: tint, shadowOpacity: 0, elevation: 0 } : null, style];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [body, pressed && { opacity: 0.85 }]} accessibilityRole="button">
        {children}
      </Pressable>
    );
  }
  return <View style={body}>{children}</View>;
}

type ButtonVariant = 'pink' | 'purple' | 'outline' | 'ghost' | 'light';

export function Button({
  title,
  onPress,
  variant = 'pink',
  icon,
  loading,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        small && { paddingVertical: 9, paddingHorizontal: 16 },
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 20} color={v.fg} style={{ marginRight: 8 }} />}
          <T weight="extrabold" size={small ? 14 : 16} color={v.fg}>
            {title}
          </T>
        </>
      )}
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  pink: { bg: colors.pink, fg: colors.white, border: colors.pink },
  purple: { bg: colors.night, fg: colors.white, border: colors.night },
  outline: { bg: colors.white, fg: colors.night, border: colors.night },
  ghost: { bg: 'transparent', fg: colors.purple, border: 'transparent' },
  light: { bg: colors.lavender, fg: colors.night, border: colors.lavender },
};

export function SectionTitle({ icon, title, action, onAction }: { icon?: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <T weight="extrabold" size={18} style={{ flex: 1 }}>
        {icon ? `${icon}  ` : ''}
        {title}
      </T>
      {action && (
        <Pressable onPress={onAction} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T weight="bold" size={14} color={colors.purple}>
            {action}
          </T>
          <Ionicons name="chevron-forward" size={16} color={colors.purple} />
        </Pressable>
      )}
    </View>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.night, borderColor: colors.night }]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {icon && <Ionicons name={icon} size={14} color={active ? colors.white : colors.night} style={{ marginRight: 4 }} />}
      <T weight="bold" size={13} color={active ? colors.white : colors.night}>
        {label}
      </T>
    </Pressable>
  );
}

export function Segmented({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, value === o.value && styles.segmentActive]}>
          <T weight="extrabold" size={14} color={value === o.value ? colors.white : colors.night}>
            {o.label}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

export function Field({ label, error, style, ...props }: TextInputProps & { label: string; error?: string; style?: StyleProp<TextStyle> }) {
  return (
    <View style={{ marginBottom: space.md }}>
      <T weight="bold" size={14} style={{ marginBottom: 6 }}>
        {label}
      </T>
      <TextInput placeholderTextColor={colors.textMuted} {...props} style={[styles.input, error ? { borderColor: colors.red } : null, style]} />
      {error ? (
        <T size={13} color={colors.red} style={{ marginTop: 4 }}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ padding: space.xxl, alignItems: 'center' }}>
      <ActivityIndicator color={colors.purple} size="large" />
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card tint={colors.redSoft} style={{ alignItems: 'center', gap: space.sm }}>
      <T weight="bold" color={colors.red} style={{ textAlign: 'center' }}>
        {message}
      </T>
      {onRetry && <Button title="Réessayer" variant="outline" small onPress={onRetry} />}
    </Card>
  );
}

export function Disclaimer() {
  return (
    <View style={styles.disclaimer}>
      <Ionicons name="information-circle" size={16} color={colors.purple} />
      <T size={12} color={colors.textMuted} style={{ flex: 1 }}>
        Moon informe et ne remplace pas un avis médical. En cas d'urgence, appelle immédiatement les secours.
      </T>
    </View>
  );
}


export function Check({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', gap: 10 }} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={colors.purple} />
      <T size={14} style={{ flex: 1, lineHeight: 20 }}>
        {label}
      </T>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, ...shadow },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginBottom: space.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  segmented: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.pill, padding: 4, borderWidth: 1, borderColor: colors.border },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.night },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  disclaimer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    padding: space.md,
    borderRadius: radius.md,
    marginTop: space.xl,
  },
});
