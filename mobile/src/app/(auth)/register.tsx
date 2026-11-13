import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Burst, Confetti, Float, PopIn, useBounce } from '../../components/anim';
import { MOON_MARK } from '../../components/Brand';
import { Button, Card, Check, Field, Segmented, T } from '../../components/ui';
import { User, useAuth } from '../../context/AuthContext';
import { api, ApiError, errorMessage } from '../../lib/api';
import { AVATARS } from '../../lib/constants';
import { colors, radius, space } from '../../lib/theme';

const AGES = [
  { value: '12-14', label: '12 - 14 ans', emoji: '🌱' },
  { value: '15-17', label: '15 - 17 ans', emoji: '🌷' },
  { value: '18-21', label: '18 - 21 ans', emoji: '🌻' },
  { value: '22-25', label: '22 - 25 ans', emoji: '🌳' },
  { value: '25+', label: 'Plus de 25 ans', emoji: '✨' },
];
const STEPS = ['Toi', 'Âge', 'Usage', 'Compte', 'Vie privée'];
const BUBBLES = [
  "Salut ! Moi c'est Moon 🌙 Comment veux-tu qu'on t'appelle ?",
  "Super ! Quel âge as-tu ? Ça m'aide à te donner les bons conseils.",
  'Tu veux suivre ton cycle, ou juste comprendre ?',
  'Pour retrouver ton compte : un numéro ou un e-mail, et un mot de passe secret.',
  'Dernière étape : ta vie privée, c\'est sacré 🔒',
];

type Result = { token: string; user: User };

/** Inscription en 5 petites étapes, avec mascotte et célébration finale. */
export default function Register() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [form, setForm] = useState({ name: '', avatar: '🌸', age_range: '', mode: 'suivi', phone: '', email: '', password: '', consent: false, guardian_consent: false });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<Result | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const minor = form.age_range === '12-14' || form.age_range === '15-17';
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    Animated.timing(progress, { toValue: (step + 1) / STEPS.length, duration: 400, useNativeDriver: false }).start();
  }, [step, progress]);

  const canNext = [
    form.name.trim().length >= 2,
    !!form.age_range,
    !!form.mode,
    (method === 'phone' ? form.phone.replace(/\D/g, '').length >= 8 : /\S+@\S+\.\S+/.test(form.email)) && form.password.length >= 8,
    form.consent && (!minor || form.guardian_consent),
  ][step];

  const submit = async () => {
    setLoading(true);
    setErrors({});
    setError('');
    try {
      const res = await api<Result>('/auth/register', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          avatar: form.avatar,
          age_range: form.age_range,
          mode: form.mode,
          consent: form.consent,
          guardian_consent: form.guardian_consent,
          language: 'fr',
          password: form.password,
          ...(method === 'email' ? { email: form.email.trim() } : { phone: form.phone.replace(/[\s.-]/g, '') }),
        },
      });
      setDone(res);
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.errors);
        // Revenir à l'étape concernée par l'erreur
        const field = Object.keys(e.errors)[0];
        const target = { name: 0, age_range: 1, mode: 2, phone: 3, email: 3, password: 3 }[field ?? ''];
        if (target !== undefined) setStep(target);
      }
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : submit());
  const back = () => (step > 0 ? setStep(step - 1) : router.back());
  const err = (k: string) => errors[k]?.[0];

  if (done) return <Celebration name={form.name} avatar={form.avatar} onContinue={() => signIn(done.token, done.user)} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.header, { paddingTop: insets.top + space.sm }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={back} hitSlop={12} accessibilityLabel="Retour">
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </Pressable>
          <T weight="black" size={20} color={colors.white} style={{ flex: 1, marginLeft: space.sm }}>
            Inscription
          </T>
          <T weight="bold" size={14} color="#D9CCF5">
            {step + 1} / {STEPS.length}
          </T>
        </View>
        <View style={s.track}>
          <Animated.View style={[s.bar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          {STEPS.map((label, i) => (
            <T key={label} size={11} weight="bold" color={i <= step ? colors.white : '#9E8CCB'}>
              {label}
            </T>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        {/* Mascotte qui parle */}
        <View style={s.mascotRow}>
          <Float distance={6}>
            <View style={s.mascot}>
              <Image source={MOON_MARK} style={{ width: 52, height: 52 }} resizeMode="contain" />
            </View>
          </Float>
          <PopIn key={`bubble-${step}`} from={10} style={{ flex: 1 }}>
            <View style={s.bubble}>
              <T weight="bold" size={15}>
                {BUBBLES[step]}
              </T>
            </View>
          </PopIn>
        </View>

        <PopIn key={`step-${step}`} from={30}>
          {step === 0 && (
            <>
              <Field label="Prénom ou pseudo" value={form.name} onChangeText={(v) => set('name', v)} placeholder="Ex. Awa, LunaDouce…" autoFocus maxLength={50} error={err('name')} />
              <T weight="bold" size={14} style={{ marginBottom: space.sm }}>
                Choisis ton avatar
              </T>
              <View style={s.avatarGrid}>
                {AVATARS.map((a) => (
                  <AvatarChoice key={a} emoji={a} selected={form.avatar === a} onPress={() => set('avatar', a)} />
                ))}
              </View>
              <T size={12} color={colors.textMuted} style={{ marginTop: space.md }}>
                🔒 Pas besoin de ton vrai nom : un pseudo suffit.
              </T>
            </>
          )}

          {step === 1 && (
            <View style={{ gap: space.sm }}>
              {AGES.map((a) => (
                <ChoiceCard key={a.value} emoji={a.emoji} title={a.label} selected={form.age_range === a.value} onPress={() => set('age_range', a.value)} />
              ))}
              {minor && (
                <Card tint={colors.goldSoft} style={{ marginTop: space.sm }}>
                  <T size={14}>👨‍👩‍👧 Comme tu as moins de 18 ans, on te demandera l'accord d'un parent ou d'un tuteur à la dernière étape.</T>
                </Card>
              )}
            </View>
          )}

          {step === 2 && (
            <View style={{ gap: space.sm }}>
              <ChoiceCard emoji="📅" title="Suivre mon cycle" text="Calendrier, prévisions, journal et conseils pour chaque jour." selected={form.mode === 'suivi'} onPress={() => set('mode', 'suivi')} />
              <ChoiceCard emoji="📚" title="Comprendre" text="Pour les garçons et les proches qui veulent s'informer et soutenir." selected={form.mode === 'comprendre'} onPress={() => set('mode', 'comprendre')} />
            </View>
          )}

          {step === 3 && (
            <>
              <Segmented
                options={[
                  { value: 'phone', label: '📱 Téléphone' },
                  { value: 'email', label: '✉️ E-mail' },
                ]}
                value={method}
                onChange={(v) => setMethod(v as 'phone' | 'email')}
              />
              <View style={{ height: space.lg }} />
              {method === 'phone' ? (
                <Field label="Numéro de téléphone" value={form.phone} onChangeText={(v) => set('phone', v)} placeholder="+221 77 123 45 67" keyboardType="phone-pad" error={err('phone')} />
              ) : (
                <Field label="E-mail" value={form.email} onChangeText={(v) => set('email', v)} placeholder="toi@exemple.com" keyboardType="email-address" autoCapitalize="none" error={err('email')} />
              )}
              <Field label="Mot de passe (8 caractères minimum)" value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry error={err('password')} />
              <PasswordMeter value={form.password} />
              <T size={13} color={colors.textMuted} style={{ marginTop: space.md }}>
                🤫 Garde ton mot de passe secret : il protège tes données.
              </T>
            </>
          )}

          {step === 4 && (
            <>
              <Card tint={colors.lavenderSoft} style={{ alignItems: 'center', marginBottom: space.md }}>
                <T size={46}>🔐</T>
                <T weight="black" size={17} style={{ textAlign: 'center', marginTop: space.sm }}>
                  Tes données t'appartiennent
                </T>
                <T size={14} color={colors.textMuted} style={{ textAlign: 'center', marginTop: 4 }}>
                  Elles sont chiffrées, jamais vendues ni montrées à l'équipe. Tu peux les exporter ou les supprimer à tout moment.
                </T>
              </Card>
              <Card style={{ gap: space.lg }}>
                <Check checked={form.consent} onPress={() => set('consent', !form.consent)} label="J'accepte que Moon enregistre mes données de cycle pour me conseiller." />
                {minor && <Check checked={form.guardian_consent} onPress={() => set('guardian_consent', !form.guardian_consent)} label="Un parent ou tuteur est d'accord pour que j'utilise Moon." />}
              </Card>
              {(err('consent') || err('guardian_consent')) && (
                <T color={colors.red} style={{ marginTop: space.sm }}>
                  {err('consent') ?? err('guardian_consent')}
                </T>
              )}
            </>
          )}
        </PopIn>

        {error && !Object.keys(errors).length ? (
          <T color={colors.red} style={{ marginTop: space.md }}>
            {error}
          </T>
        ) : null}

        <Button
          title={step < STEPS.length - 1 ? 'Continuer' : 'Créer mon compte'}
          icon={step < STEPS.length - 1 ? 'arrow-forward' : 'sparkles'}
          onPress={next}
          loading={loading}
          disabled={!canNext}
          style={{ marginTop: space.xl }}
        />
        {step === 0 && <Button title="J'ai déjà un compte" variant="ghost" onPress={() => router.replace('/login')} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AvatarChoice({ emoji, selected, onPress }: { emoji: string; selected: boolean; onPress: () => void }) {
  const { style, bounce } = useBounce();
  return (
    <Pressable
      onPress={() => {
        bounce();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`Avatar ${emoji}`}
    >
      <Animated.View style={[s.avatar, selected && s.avatarSelected, style]}>
        <T size={26}>{emoji}</T>
      </Animated.View>
    </Pressable>
  );
}

function ChoiceCard({ emoji, title, text, selected, onPress }: { emoji: string; title: string; text?: string; selected: boolean; onPress: () => void }) {
  const { style, bounce } = useBounce();
  return (
    <Pressable
      onPress={() => {
        bounce();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Animated.View style={[s.choice, selected && s.choiceSelected, style]}>
        <T size={30}>{emoji}</T>
        <View style={{ flex: 1 }}>
          <T weight="black" size={16} color={selected ? colors.white : colors.text}>
            {title}
          </T>
          {text && (
            <T size={13} color={selected ? '#E5DBFF' : colors.textMuted}>
              {text}
            </T>
          )}
        </View>
        <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={selected ? colors.gold : colors.border} />
      </Animated.View>
    </Pressable>
  );
}

function PasswordMeter({ value }: { value: string }) {
  const score = [value.length >= 8, /[A-Z]/.test(value) || /[0-9]/.test(value), value.length >= 12, /[^A-Za-z0-9]/.test(value)].filter(Boolean).length;
  const labels = ['Trop court', 'Faible', 'Correct', 'Solide', 'Excellent 💪'];
  const tone = [colors.red, colors.red, colors.gold, colors.green, colors.green][score];
  return (
    <View style={{ marginTop: -space.sm }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < score ? tone : colors.lavender }} />
        ))}
      </View>
      <T size={12} weight="bold" color={tone} style={{ marginTop: 4 }}>
        {value ? labels[score] : ''}
      </T>
    </View>
  );
}

/** Écran de fête une fois le compte créé. */
function Celebration({ name, avatar, onContinue }: { name: string; avatar: string; onContinue: () => void }) {
  const [burst, setBurst] = useState(1);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.night, alignItems: 'center', justifyContent: 'center', padding: space.xl }]}>
      <Confetti />
      <PopIn spring>
        <Pressable onPress={() => setBurst((b) => b + 1)} accessibilityLabel="Ton avatar">
          <View style={s.bigAvatar}>
            <T size={72}>{avatar}</T>
          </View>
          <Burst trigger={burst} radius={140} />
        </Pressable>
      </PopIn>
      <PopIn delay={300}>
        <T weight="black" size={30} color={colors.white} style={{ textAlign: 'center', marginTop: space.xl }}>
          Bienvenue, {name.trim()} !
        </T>
      </PopIn>
      <PopIn delay={500}>
        <T size={16} color="#E5DBFF" style={{ textAlign: 'center', marginTop: space.sm, lineHeight: 23 }}>
          Ton compte est prêt. On commence ?
        </T>
      </PopIn>
      <PopIn delay={800} style={{ alignSelf: 'stretch', marginTop: space.xxl }}>
        <Button title="C'est parti !" icon="rocket" onPress={onContinue} />
      </PopIn>
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: colors.night, paddingHorizontal: space.lg, paddingBottom: space.lg, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: space.md, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.pink },
  mascotRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xl },
  mascot: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.lilac },
  bubble: { backgroundColor: colors.white, borderRadius: radius.lg, borderTopLeftRadius: 4, padding: space.md, borderWidth: 1, borderColor: colors.border },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border },
  avatarSelected: { backgroundColor: colors.lavender, borderColor: colors.purple, borderWidth: 3 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.white, borderRadius: radius.lg, padding: space.lg, borderWidth: 2, borderColor: colors.border },
  choiceSelected: { backgroundColor: colors.night, borderColor: colors.night },
  bigAvatar: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.gold },
});
