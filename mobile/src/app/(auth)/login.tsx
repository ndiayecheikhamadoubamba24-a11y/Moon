import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { NightHeader } from '../../components/Header';
import { Button, Field, Screen, Segmented, T } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import { colors, space } from '../../lib/theme';

export default function Login() {
  const { signIn } = useAuth();
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      if (method === 'email' && password) {
        const res = await api('/auth/login', { method: 'POST', body: { email: identifier.trim(), password } });
        await signIn(res.token, res.user);
      } else {
        const id = identifier.replace(/\s/g, '');
        await api('/auth/otp/request', { method: 'POST', body: { identifier: id } });
        router.push({ pathname: '/otp', params: { identifier: id } });
      }
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
        <Segmented
          options={[
            { value: 'phone', label: 'Téléphone' },
            { value: 'email', label: 'E-mail' },
          ]}
          value={method}
          onChange={(v) => setMethod(v as 'phone' | 'email')}
        />
        <View style={{ height: space.lg }} />
        {method === 'phone' ? (
          <Field label="Numéro de téléphone" value={identifier} onChangeText={setIdentifier} keyboardType="phone-pad" placeholder="+221 77 123 45 67" />
        ) : (
          <>
            <Field label="E-mail" value={identifier} onChangeText={setIdentifier} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry placeholder="Ou laisse vide pour recevoir un code" />
          </>
        )}
        {error ? <T color={colors.red}>{error}</T> : null}
        <Button title={method === 'email' && password ? 'Me connecter' : 'Recevoir mon code'} onPress={submit} loading={loading} disabled={!identifier} style={{ marginTop: space.lg }} />
        {method === 'email' && (
          <Button title="Mot de passe oublié ?" variant="ghost" onPress={() => router.push({ pathname: '/otp', params: { identifier: identifier.trim(), reset: '1' } })} disabled={!identifier} />
        )}
      </Screen>
    </View>
  );
}
