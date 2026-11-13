import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NightHeader } from '../../components/Header';
import { Button, Card, ErrorBox, Loading, Screen, T } from '../../components/ui';
import { api } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { colors, space } from '../../lib/theme';

type Section = { id: number; type: string; title: string | null; body: string | null; media_url: string | null };
type Module = { id: number; title: string; summary: string; duration_minutes: number; progress: number; completed: boolean; sections: Section[] };

/** Lecture d'un module, étape par étape, avec progression. */
export default function ModuleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, loading, error, reload } = useApi<Module>(`/modules/${slug}`);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const total = data?.sections.length ?? 0;

  useEffect(() => {
    if (data && !data.completed && data.progress > 0 && total) {
      setStep(Math.min(Math.floor((data.progress / 100) * total), total - 1));
    }
  }, [data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = async () => {
    if (!data) return;
    const progress = Math.round(((step + 1) / total) * 100);
    api(`/modules/${data.id}/progress`, { method: 'PUT', body: { progress } }).catch(() => {});
    if (step + 1 >= total) setDone(true);
    else setStep(step + 1);
  };

  const section = data?.sections[step];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title={data?.title ?? 'Module'} subtitle={data ? `🕒 ${data.duration_minutes} min` : undefined} back />
      <Screen edges={['bottom']}>
        {loading && !data && <Loading />}
        {error && !data && <ErrorBox message={error} onRetry={reload} />}
        {data && !done && section && (
          <>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: space.lg }}>
              {data.sections.map((s, i) => (
                <View key={s.id} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= step ? colors.pink : colors.lavender }} />
              ))}
            </View>
            <Card>
              {section.title && (
                <T weight="black" size={21} style={{ marginBottom: space.md }}>
                  {section.title}
                </T>
              )}
              <T size={17} style={{ lineHeight: 26 }}>
                {section.body}
              </T>
            </Card>
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xl }}>
              {step > 0 && <Button title="Précédent" variant="outline" style={{ flex: 1 }} onPress={() => setStep(step - 1)} />}
              <Button title={step + 1 >= total ? 'Terminer' : 'Suivant'} style={{ flex: 1 }} onPress={next} />
            </View>
          </>
        )}
        {done && (
          <Card style={{ alignItems: 'center', gap: space.md }}>
            <T size={64}>🎉</T>
            <T weight="black" size={22}>
              Bravo, module terminé !
            </T>
            <T color={colors.textMuted}>+20 points</T>
            <Button title="Tester mes connaissances" onPress={() => router.replace('/play')} style={{ alignSelf: 'stretch' }} />
            <Button title="Retour" variant="ghost" onPress={() => router.back()} />
          </Card>
        )}
      </Screen>
    </View>
  );
}
