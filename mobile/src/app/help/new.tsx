import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { NightHeader } from '../../components/Header';
import { Button, Card, Check, Chip, Field, Screen, T } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { HELP_TYPES } from '../../lib/constants';
import { colors, space } from '../../lib/theme';

export default function NewHelpRequest() {
  const params = useLocalSearchParams<{ type?: string }>();
  const [type, setType] = useState<string>(params.type ?? 'information');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(params.type === 'question');
  const [faqConsent, setFaqConsent] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ id: number; message: string } | null>(null);

  const send = async () => {
    setSending(true);
    setError('');
    try {
      const res = await api('/help-requests', {
        method: 'POST',
        body: { type, subject: subject || null, message, is_anonymous: anonymous, faq_consent: faqConsent, urgent },
      });
      setSent({ id: res.request.id, message: res.message });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <NightHeader title="Demande envoyée" back />
        <Screen edges={['bottom']}>
          <Card style={{ alignItems: 'center', gap: space.md }}>
            <T size={60}>💌</T>
            <T weight="black" size={20} style={{ textAlign: 'center' }}>
              {sent.message}
            </T>
            <T color={colors.textMuted} style={{ textAlign: 'center' }}>
              Tu peux suivre ta demande dans « Mes demandes ».
            </T>
            <Button title="Voir ma demande" style={{ alignSelf: 'stretch' }} onPress={() => router.replace(`/help/${sent.id}`)} />
          </Card>
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <NightHeader title="Demander de l'aide" subtitle="Une personne de l'équipe te répondra" back />
      <Screen edges={['bottom']}>
        <T weight="bold" style={{ marginBottom: 8 }}>
          J'ai besoin de…
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.lg }}>
          {HELP_TYPES.map((t) => (
            <Chip key={t.value} label={t.label} active={type === t.value} onPress={() => setType(t.value)} />
          ))}
        </View>
        <Field label="Sujet (facultatif)" value={subject} onChangeText={setSubject} maxLength={150} />
        <Field label="Ton message" value={message} onChangeText={setMessage} multiline maxLength={3000} style={{ minHeight: 140, textAlignVertical: 'top' }} placeholder="Écris ici, sans te juger 💜" />
        <Card tint={colors.lavenderSoft} style={{ gap: space.md }}>
          <Check checked={anonymous} onPress={() => setAnonymous(!anonymous)} label="Rester anonyme (l'équipe ne verra pas mon prénom)" />
          {type === 'question' && <Check checked={faqConsent} onPress={() => setFaqConsent(!faqConsent)} label="J'accepte que la réponse soit publiée dans la FAQ, sans mon nom" />}
          <Check checked={urgent} onPress={() => setUrgent(!urgent)} label="C'est urgent" />
        </Card>
        {error ? (
          <T color={colors.red} style={{ marginTop: space.sm }}>
            {error}
          </T>
        ) : null}
        <Button title="Envoyer" icon="send" onPress={send} loading={sending} disabled={message.trim().length < 3} style={{ marginTop: space.xl }} />
      </Screen>
    </View>
  );
}
