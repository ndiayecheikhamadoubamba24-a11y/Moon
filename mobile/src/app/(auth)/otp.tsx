import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NightHeader } from '../../components/Header';
import { Button, Field, Screen, T } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import { colors, space } from '../../lib/theme';

/** Saisie du code reçu par SMS ou e-mail (connexion ou nouveau mot de passe). */
export default function Otp() {
  const { identifier, reset } = useLocalSearchParams<{ identifier: string; reset?: string }>();
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reset) api('/auth/password/forgot', { method: 'POST', body: { identifier } }).catch(() => {});
  }, [reset, identifier]);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      if (reset) {
        await api('/auth/password/reset', { method: 'POST', body: { identifier, code, password, password_confirmation: password } });
        const res = await api('/auth/login', { method: 'POST', body: { email: identifier, password } });
        await signIn(res.token, res.user);
      } else {
        const res = await api('/auth/otp/verify', { method: 'POST', body: { identifier, code } });
        await signIn(res.token, res.user);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    await api(reset ? '/auth/password/forgot' : '/auth/otp/request', { method: 'POST', body: { identifier } }).catch(() => {});
    setInfo('Un nouveau code a été envoyé.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title={reset ? 'Nouveau mot de passe' : 'Ton code'} subtitle={`Envoyé à ${identifier}`} back />
      <Screen edges={[]}>
        <Field label="Code à 6 chiffres" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" style={{ fontSize: 26, letterSpacing: 10, textAlign: 'center' }} autoFocus />
        {reset && <Field label="Nouveau mot de passe" value={password} onChangeText={setPassword} secureTextEntry />}
        {error ? <T color={colors.red}>{error}</T> : null}
        {info ? <T color={colors.green}>{info}</T> : null}
        <Button title="Valider" onPress={submit} loading={loading} disabled={code.length !== 6 || (!!reset && password.length < 8)} style={{ marginTop: space.lg }} />
        <Button title="Renvoyer le code" variant="ghost" onPress={resend} />
        <Button title="Modifier le numéro" variant="ghost" onPress={() => router.back()} />
      </Screen>
    </View>
  );
}
