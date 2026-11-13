import { router } from 'expo-router';
import { Linking, View } from 'react-native';
import { NightHeader } from '../../components/Header';
import { Button, Card, Loading, Screen, T } from '../../components/ui';
import { useApi } from '../../lib/hooks';
import { colors, space } from '../../lib/theme';

export default function Emergency() {
  const { data, loading } = useApi<{ id: number; name: string; phone: string; description: string }[]>('/emergency-contacts');
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title="Aide urgente" back />
      <Screen edges={['bottom']}>
        <Card tint={colors.redSoft}>
          <T weight="black" size={17}>
            Si tu es en danger ou si tu as très mal, appelle tout de suite un de ces numéros.
          </T>
        </Card>
        {loading && !data && <Loading />}
        {data?.map((c) => (
          <Card key={c.id} style={{ marginTop: space.md, gap: space.sm }}>
            <T weight="black" size={17}>
              {c.name}
            </T>
            <T color={colors.textMuted}>{c.description}</T>
            <Button title={`Appeler le ${c.phone}`} icon="call" onPress={() => Linking.openURL(`tel:${c.phone}`)} />
          </Card>
        ))}
        <Button title="Trouver un centre proche" variant="outline" icon="location" style={{ marginTop: space.xl }} onPress={() => router.replace('/centers')} />
        <Button title="Écrire à l'équipe Moon" variant="ghost" onPress={() => router.replace({ pathname: '/help/new', params: { type: 'medical' } })} />
      </Screen>
    </View>
  );
}
