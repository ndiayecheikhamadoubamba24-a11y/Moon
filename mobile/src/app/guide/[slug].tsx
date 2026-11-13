import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { NightHeader } from '../../components/Header';
import { Card, Disclaimer, ErrorBox, Loading, Screen, T } from '../../components/ui';
import { useApi } from '../../lib/hooks';
import { colors } from '../../lib/theme';

export default function GuideScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, loading, error, reload } = useApi<{ title: string; body: string; kind: string }>(`/guides/${slug}`);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title={data?.title ?? 'Fiche pratique'} back />
      <Screen edges={['bottom']}>
        {loading && !data && <Loading />}
        {error && !data && <ErrorBox message={error} onRetry={reload} />}
        {data && (
          <Card tint={data.kind === 'alert' ? colors.redSoft : undefined}>
            <T size={17} style={{ lineHeight: 27 }}>
              {data.body}
            </T>
          </Card>
        )}
        <Disclaimer />
      </Screen>
    </View>
  );
}
