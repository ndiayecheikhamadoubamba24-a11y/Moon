import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { NightHeader } from '../../components/Header';
import { MoodPicker } from '../../components/MoodPicker';
import { Button, Card, Chip, Field, Screen, T } from '../../components/ui';
import { useCycle } from '../../context/CycleContext';
import { formatLong } from '../../lib/dates';
import { colors, space } from '../../lib/theme';
import { FLOW_LABELS, SYMPTOM_LABELS } from '../day/[date]';

/** Journal du jour : humeur, flux, douleur, symptômes, notes (fonctionne hors ligne). */
export default function Journal() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { logs, saveLog } = useCycle();
  const existing = logs[date];
  const [mood, setMood] = useState(existing?.mood ?? null);
  const [flow, setFlow] = useState(existing?.flow ?? null);
  const [pain, setPain] = useState<number | null>(existing?.pain_level ?? null);
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const toggle = (s: string) => setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const save = async () => {
    await saveLog({ date, mood, flow, pain_level: pain, symptoms, notes: notes.trim() || null });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title="Mon journal" subtitle={formatLong(date)} back />
      <Screen edges={['bottom']}>
        <Card>
          <T weight="black" size={16} style={{ marginBottom: space.md }}>
            Mon humeur
          </T>
          <MoodPicker value={mood} onChange={(v) => setMood(v === mood ? null : v)} />
        </Card>

        <Card style={{ marginTop: space.md }}>
          <T weight="black" size={16} style={{ marginBottom: space.md }}>
            🩸 Flux
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(FLOW_LABELS).map(([k, label]) => (
              <Chip key={k} label={label} active={flow === k} onPress={() => setFlow(flow === k ? null : k)} />
            ))}
          </View>
        </Card>

        <Card style={{ marginTop: space.md }}>
          <T weight="black" size={16} style={{ marginBottom: space.md }}>
            Douleur {pain != null ? `: ${pain}/10` : ''}
          </T>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {Array.from({ length: 11 }, (_, i) => (
              <Chip key={i} label={String(i)} active={pain === i} onPress={() => setPain(pain === i ? null : i)} />
            ))}
          </View>
          {pain != null && pain >= 8 && (
            <T size={13} color={colors.red} style={{ marginTop: space.sm }}>
              Une douleur aussi forte mérite l'avis d'un professionnel de santé, surtout si elle revient chaque mois.
            </T>
          )}
        </Card>

        <Card style={{ marginTop: space.md }}>
          <T weight="black" size={16} style={{ marginBottom: space.md }}>
            Symptômes
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(SYMPTOM_LABELS).map(([k, label]) => (
              <Chip key={k} label={label} active={symptoms.includes(k)} onPress={() => toggle(k)} />
            ))}
          </View>
        </Card>

        <View style={{ marginTop: space.md }}>
          <Field label="Notes (privées et chiffrées)" value={notes} onChangeText={setNotes} multiline style={{ minHeight: 100, textAlignVertical: 'top' }} maxLength={2000} />
        </View>
        <Button title="Enregistrer" icon="checkmark" onPress={save} />
      </Screen>
    </View>
  );
}
