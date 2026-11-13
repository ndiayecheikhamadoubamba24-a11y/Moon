import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MOODS } from '../../components/MoodPicker';
import { tipEmoji } from '../../components/Tips';
import { Button, Card, T } from '../../components/ui';
import { useCycle } from '../../context/CycleContext';
import { cachedGet } from '../../lib/api';
import { formatLong, today } from '../../lib/dates';
import { colors, phaseLabels, space } from '../../lib/theme';

type Tip = { title: string; body: string; icon?: string };

/** Fiche du jour (feuille du bas) : phase, conseil du jour, journal. */
export default function DaySheet() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { model, logs, startPeriod } = useCycle();
  const insets = useSafeAreaInsets();
  const info = model.dayInfo(date);
  const log = logs[date];
  const [tip, setTip] = useState<Tip | null>(null);
  const future = date > today();

  useEffect(() => {
    cachedGet<{ tip: Tip | null }>(`/cycle/day/${date}`)
      .then((r) => setTip(r.data.tip))
      .catch(() => {});
  }, [date]);

  const mood = MOODS.find((m) => m.value === log?.mood);

  return (
    <View style={s.backdrop}>
      <Pressable style={{ flex: 1 }} onPress={() => router.back()} accessibilityLabel="Fermer" />
      <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={s.handle} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <T weight="black" size={24} style={{ flex: 1 }}>
              {formatLong(date)}
            </T>
            <Pressable onPress={() => router.back()} style={s.close} accessibilityLabel="Fermer">
              <Ionicons name="close" size={22} color={colors.night} />
            </Pressable>
          </View>
          {info.phase && (
            <View style={s.phase}>
              <Ionicons name="moon" size={16} color={colors.purple} />
              <T weight="extrabold" size={15}>
                {phaseLabels[info.phase]} · Jour {info.cycle_day}
                {info.is_predicted_period ? ' (prévu)' : ''}
              </T>
            </View>
          )}

          {tip && (
            <Card tint={colors.lavenderSoft} style={{ marginTop: space.lg, flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
              <View style={{ flex: 1, backgroundColor: colors.background }}>
                <T weight="black" size={17}>
                  ⭐ Conseil du jour
                </T>
                <T size={15} style={{ marginTop: 4 }}>
                  {tip.body}
                </T>
              </View>
              <T size={40}>{tipEmoji(tip.icon)}</T>
            </Card>
          )}

          <T weight="black" size={18} style={{ marginTop: space.xl, marginBottom: space.sm }}>
            📖 Mon journal
          </T>
          <Card tint={colors.lavenderSoft}>
            {log ? (
              <View style={{ gap: 4 }}>
                {mood && <T>Humeur : {mood.emoji} {mood.label}</T>}
                {log.flow && <T>Flux : {FLOW_LABELS[log.flow] ?? log.flow}</T>}
                {log.pain_level != null && <T>Douleur : {log.pain_level}/10</T>}
                {!!log.symptoms?.length && <T>Symptômes : {log.symptoms.map((x) => SYMPTOM_LABELS[x] ?? x).join(', ')}</T>}
                {log.notes ? <T color={colors.textMuted}>« {log.notes} »</T> : null}
              </View>
            ) : (
              <T color={colors.textMuted} style={{ textAlign: 'center' }}>
                Rien noté pour l'instant.
              </T>
            )}
          </Card>

          {!future && (
            <Button
              title={log ? 'Modifier mon journal' : 'Ouvrir mon journal'}
              icon="pencil"
              variant="purple"
              style={{ marginTop: space.lg }}
              onPress={() => router.replace(`/journal/${date}`)}
            />
          )}
          {!future && !info.is_period && (
            <Button
              title="Mes règles ont commencé ce jour-là"
              variant="light"
              style={{ marginTop: space.sm }}
              onPress={async () => {
                await startPeriod(date);
                router.back();
              }}
            />
          )}
          <Button title="Corriger mes dates de règles" variant="ghost" onPress={() => router.replace('/periods')} />
        </ScrollView>
      </View>
    </View>
  );
}

export const FLOW_LABELS: Record<string, string> = { none: 'Aucun', spotting: 'Traces', light: 'Léger', medium: 'Moyen', heavy: 'Abondant' };
export const SYMPTOM_LABELS: Record<string, string> = {
  cramps: 'Crampes',
  headache: 'Maux de tête',
  bloating: 'Ballonnements',
  back_pain: 'Mal de dos',
  fatigue: 'Fatigue',
  acne: 'Boutons',
  tender_breasts: 'Seins sensibles',
  nausea: 'Nausées',
  cravings: 'Envies',
  insomnia: 'Insomnie',
  mood_swings: "Sautes d'humeur",
};

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,24,88,0.45)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: space.xl, maxHeight: '85%' },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: space.md },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
  phase: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: colors.lavender, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, marginTop: space.md },
});
