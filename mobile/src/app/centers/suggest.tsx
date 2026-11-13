import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { NightHeader } from '../../components/Header';
import { Button, Card, Field, Screen, T } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { colors, space } from '../../lib/theme';

export default function SuggestCenter() {
  const { resource_id } = useLocalSearchParams<{ resource_id?: string }>();
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    try {
      await api('/resource-suggestions', { method: 'POST', body: { resource_id: resource_id ? Number(resource_id) : null, message } });
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title={resource_id ? 'Signaler une erreur' : 'Proposer un centre'} back />
      <Screen edges={['bottom']}>
        {sent ? (
          <Card style={{ alignItems: 'center', gap: space.md }}>
            <T size={50}>🙏</T>
            <T weight="black" size={18}>
              Merci ! L'équipe va vérifier.
            </T>
            <Button title="Retour" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
          </Card>
        ) : (
          <>
            <Field
              label={resource_id ? 'Qu\'est-ce qui est incorrect ?' : 'Nom, quartier et ce que propose le centre'}
              value={message}
              onChangeText={setMessage}
              multiline
              style={{ minHeight: 140, textAlignVertical: 'top' }}
            />
            {error ? <T color={colors.red}>{error}</T> : null}
            <Button title="Envoyer" icon="send" onPress={send} disabled={message.trim().length < 5} />
          </>
        )}
      </Screen>
    </View>
  );
}
