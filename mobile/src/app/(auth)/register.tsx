import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { NightHeader } from '../../components/Header';
import { Button, Card, Check, Chip, Field, Screen, Segmented, T } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError, errorMessage } from '../../lib/api';
import { colors, space } from '../../lib/theme';

const AGES = ['12-14', '15-17', '18-21', '22-25', '25+'];

export default function Register() {
  const { signIn } = useAuth();
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', age_range: '', consent: false, guardian_consent: false });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const minor = form.age_range === '12-14' || form.age_range === '15-17';
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true);
    setErrors({});
    setError('');
    try {
      const body = {
        name: form.name.trim(),
        age_range: form.age_range,
        consent: form.consent,
        guardian_consent: form.guardian_consent,
        language: 'fr',
        ...(method === 'email' ? { email: form.email.trim(), password: form.password } : { phone: form.phone.replace(/\s/g, '') }),
      };
      const res = await api('/auth/register', { method: 'POST', body });
      if (res.token) await signIn(res.token, res.user);
      else router.push({ pathname: '/otp', params: { identifier: res.identifier } });
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.errors);
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const err = (k: string) => errors[k]?.[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title="Créer mon compte" subtitle="Juste l'essentiel, rien de plus" back />
      <Screen edges={[]}>
        <Field label="Prénom ou pseudo" value={form.name} onChangeText={(v) => set('name', v)} placeholder="Ex. Awa" error={err('name')} autoCapitalize="words" />

        <T weight="bold" size={14} style={{ marginBottom: 8 }}>
          Ton âge
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.md }}>
          {AGES.map((a) => (
            <Chip key={a} label={`${a} ans`} active={form.age_range === a} onPress={() => set('age_range', a)} />
          ))}
        </View>
        {err('age_range') && <T color={colors.red}>{err('age_range')}</T>}

        <Segmented
          options={[
            { value: 'phone', label: 'Téléphone' },
            { value: 'email', label: 'E-mail' },
          ]}
          value={method}
          onChange={(v) => setMethod(v as 'phone' | 'email')}
        />
        <View style={{ height: space.md }} />
        {method === 'phone' ? (
          <Field label="Numéro de téléphone" value={form.phone} onChangeText={(v) => set('phone', v)} placeholder="+221 77 123 45 67" keyboardType="phone-pad" error={err('phone')} />
        ) : (
          <>
            <Field label="E-mail" value={form.email} onChangeText={(v) => set('email', v)} placeholder="toi@exemple.com" keyboardType="email-address" autoCapitalize="none" error={err('email')} />
            <Field label="Mot de passe (8 caractères min.)" value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry error={err('password')} />
          </>
        )}

        <Card tint={colors.lavenderSoft} style={{ gap: space.md }}>
          <Check
            checked={form.consent}
            onPress={() => set('consent', !form.consent)}
            label="J'accepte que Moon enregistre mes données de cycle pour me conseiller. Elles restent confidentielles et je peux les supprimer à tout moment."
          />
          {minor && (
            <Check checked={form.guardian_consent} onPress={() => set('guardian_consent', !form.guardian_consent)} label="Un parent ou tuteur est d'accord pour que j'utilise Moon." />
          )}
        </Card>
        {(err('consent') || err('guardian_consent')) && (
          <T color={colors.red} style={{ marginTop: 6 }}>
            {err('consent') ?? err('guardian_consent')}
          </T>
        )}
        {error && !Object.keys(errors).length ? (
          <T color={colors.red} style={{ marginTop: 6 }}>
            {error}
          </T>
        ) : null}

        <Button
          title={method === 'phone' ? 'Recevoir mon code' : 'Créer mon compte'}
          onPress={submit}
          loading={loading}
          disabled={!form.name || !form.age_range || !form.consent || (minor && !form.guardian_consent)}
          style={{ marginTop: space.xl }}
        />
      </Screen>
    </View>
  );
}
