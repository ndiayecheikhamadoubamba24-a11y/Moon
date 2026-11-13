import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { NightHeader } from '../../components/Header';
import { Button, Card, ErrorBox, Field, Loading, Screen, T } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { HELP_STATUS } from '../../lib/constants';
import { useApi } from '../../lib/hooks';
import { colors, space } from '../../lib/theme';

type Thread = {
  id: number;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
  public_messages: { id: number; from_staff: boolean; body: string; created_at: string }[];
};

export default function HelpThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useApi<Thread>(`/help-requests/${id}`);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const send = async () => {
    setSending(true);
    setSendError('');
    try {
      await api(`/help-requests/${id}/messages`, { method: 'POST', body: { body: reply } });
      setReply('');
      reload();
    } catch (e) {
      setSendError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const status = data ? HELP_STATUS[data.status] : null;
  const steps = ['received', 'in_progress', 'resolved'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title={data?.subject || 'Ma demande'} back />
      <Screen edges={['bottom']}>
        {loading && !data && <Loading />}
        {error && !data && <ErrorBox message={error} onRetry={reload} />}
        {data && (
          <>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: space.lg }}>
              {steps.map((st, i) => (
                <View key={st} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ height: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: steps.indexOf(data.status) >= i ? status?.color : colors.lavender }} />
                  <T size={12} weight="bold" color={colors.textMuted} style={{ marginTop: 4 }}>
                    {HELP_STATUS[st].label}
                  </T>
                </View>
              ))}
            </View>
            <Bubble mine body={data.message} date={data.created_at} />
            {data.public_messages.map((m) => (
              <Bubble key={m.id} mine={!m.from_staff} body={m.body} date={m.created_at} />
            ))}
            {data.public_messages.every((m) => !m.from_staff) && (
              <T size={13} color={colors.textMuted} style={{ textAlign: 'center', marginVertical: space.md }}>
                L'équipe Moon va te répondre ici. Tu recevras une notification discrète.
              </T>
            )}
            {data.status !== 'resolved' ? (
              <>
                <Field label="Répondre" value={reply} onChangeText={setReply} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
                {sendError ? <T color={colors.red}>{sendError}</T> : null}
                <Button title="Envoyer" icon="send" variant="purple" onPress={send} loading={sending} disabled={!reply.trim()} />
              </>
            ) : (
              <Card tint={colors.greenSoft}>
                <T weight="bold">Cette demande est traitée. Tu peux en créer une nouvelle à tout moment.</T>
              </Card>
            )}
          </>
        )}
      </Screen>
    </View>
  );
}

function Bubble({ mine, body, date }: { mine: boolean; body: string; date: string }) {
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: space.md }}>
      <View style={{ maxWidth: '85%', backgroundColor: mine ? colors.lavender : colors.white, borderRadius: 18, padding: space.md, borderWidth: mine ? 0 : 1, borderColor: colors.border }}>
        {!mine && (
          <T weight="black" size={12} color={colors.purple}>
            Équipe Moon
          </T>
        )}
        <T>{body}</T>
        <T size={11} color={colors.textMuted} style={{ marginTop: 4 }}>
          {new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
        </T>
      </View>
    </View>
  );
}
