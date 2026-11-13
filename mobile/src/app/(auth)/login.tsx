import { router } from 'expo-router';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { PopIn } from '../../components/anim';
import { MOON_LOGO } from '../../components/Brand';
import { NightHeader } from '../../components/Header';
import { Button, Card, Field, Screen, Segmented, T } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import { colors, space } from '../../lib/theme';

/** Connexion par téléphone ou e-mail, avec mot de passe. */
export default function Login() {
  const { signIn } = useAuth();
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const body = method === 'email' ? { email: identifier.trim(), password } : { phone: identifier.replace(/[\s.-]/g, ''), password };
      const res = await api('/auth/login', { method: 'POST', body });
      await signIn(res.token, res.user);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title="Me connecter" subtitle="Content de te revoir 🌙" back />
      <Screen edges={[]}>
        <PopIn spring style={{ alignItems: 'center', marginBottom: space.lg }}>
          <Image source={MOON_LOGO} style={{ width: 110, height: 136 }} resizeMode="contain" accessibilityLabel="Moon" />
        </PopIn>
        <Segmented
          options={[
            { value: 'phone', label: '📱 Téléphone' },
            { value: 'email', label: '✉️ E-mail' },
          ]}
          value={method}
          onChange={(v) => {
            setMethod(v as 'phone' | 'email');
            setIdentifier('');
            setError('');
          }}
        />
        <View style={{ height: space.lg }} />
        {method === 'phone' ? (
          <Field label="Numéro de téléphone" value={identifier} onChangeText={setIdentifier} keyboardType="phone-pad" placeholder="+221 77 123 45 67" />
        ) : (
          <Field label="E-mail" value={identifier} onChangeText={setIdentifier} keyboardType="email-address" autoCapitalize="none" placeholder="toi@exemple.com" />
        )}
        <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={submit} />
        {error ? <T color={colors.red}>{error}</T> : null}
        <Button title="Me connecter" icon="log-in-outline" onPress={submit} loading={loading} disabled={!identifier.trim() || !password} style={{ marginTop: space.lg }} />
        <Button title="Mot de passe oublié ?" variant="ghost" onPress={() => setForgot(!forgot)} />
        {forgot && (
          <PopIn>
            <Card tint={colors.lavenderSoft}>
              <T weight="black">Pas de panique 💜</T>
              <T size={14} style={{ marginTop: 4, lineHeight: 21 }}>
                Contacte l'équipe Moon ou rends-toi dans un centre partenaire. Après avoir vérifié que c'est bien toi, l'équipe te donnera un mot de passe
                temporaire. Tu pourras ensuite le changer dans ton profil.
              </T>
            </Card>
          </PopIn>
        )}
        <Button title="Pas encore de compte ? Inscris-toi" variant="ghost" onPress={() => router.replace('/register')} />
      </Screen>
    </View>
  );
}
