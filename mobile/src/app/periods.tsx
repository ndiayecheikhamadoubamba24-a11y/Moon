import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { DatePicker } from '../components/DatePicker';
import { NightHeader } from '../components/Header';
import { Button, Card, ErrorBox, Loading, Screen, Segmented, T } from '../components/ui';
import { useCycle } from '../context/CycleContext';
import { api, errorMessage } from '../lib/api';
import { Cycle } from '../lib/cycle';
import { formatLong, ISODate } from '../lib/dates';
import { useApi } from '../lib/hooks';
import { colors, space } from '../lib/theme';

/** « Corriger mes dates de règles » (nécessite une connexion). */
export default function Periods() {
  const { data, loading, error, reload } = useApi<Cycle[]>('/cycles');
  const { refresh, online } = useCycle();
  const [editing, setEditing] = useState<Cycle | null>(null);
  const [field, setField] = useState<'start_date' | 'end_date'>('start_date');
  const [draft, setDraft] = useState<{ start_date: ISODate; end_date: ISODate | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const save = async () => {
    if (!editing?.id || !draft) return;
    setSaving(true);
    setMessage('');
    try {
      await api(`/cycles/${editing.id}`, { method: 'PATCH', body: draft });
      setEditing(null);
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = (c: Cycle) =>
    Alert.alert('Supprimer ces règles ?', formatLong(c.start_date), [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await api(`/cycles/${c.id}`, { method: 'DELETE' }).catch(() => {});
          await Promise.all([reload(), refresh()]);
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title="Mes dates de règles" subtitle="Corrige une date si besoin" back />
      <Screen edges={['bottom']}>
        {!online && <ErrorBox message="Connecte-toi à Internet pour corriger tes dates." />}
        {loading && !data && <Loading />}
        {error && !data && <ErrorBox message={error} onRetry={reload} />}

        {editing && draft ? (
          <Card>
            <Segmented
              options={[
                { value: 'start_date', label: 'Début' },
                { value: 'end_date', label: 'Fin' },
              ]}
              value={field}
              onChange={(v) => setField(v as 'start_date' | 'end_date')}
            />
            <DatePicker value={draft[field]} onChange={(d) => setDraft({ ...draft, [field]: d })} />
            <T size={14} color={colors.textMuted}>
              Du {formatLong(draft.start_date)} {draft.end_date ? `au ${formatLong(draft.end_date)}` : '(en cours)'}
            </T>
            {message ? <T color={colors.red}>{message}</T> : null}
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
              <Button title="Annuler" variant="outline" style={{ flex: 1 }} onPress={() => setEditing(null)} />
              <Button title="Enregistrer" style={{ flex: 1 }} loading={saving} onPress={save} />
            </View>
          </Card>
        ) : (
          data?.map((c) => (
            <Card key={c.id} style={{ marginBottom: space.sm, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <T weight="extrabold">{formatLong(c.start_date)}</T>
                <T size={13} color={colors.textMuted}>
                  {c.end_date ? `Fin : ${formatLong(c.end_date)}` : 'Fin non renseignée'}
                  {c.cycle_length ? ` · cycle de ${c.cycle_length} jours` : ''}
                </T>
              </View>
              <Pressable
                onPress={() => {
                  setEditing(c);
                  setField('start_date');
                  setDraft({ start_date: c.start_date, end_date: c.end_date });
                }}
                hitSlop={10}
                style={{ padding: 6 }}
                accessibilityLabel="Modifier"
              >
                <Ionicons name="pencil" size={20} color={colors.purple} />
              </Pressable>
              <Pressable onPress={() => remove(c)} hitSlop={10} style={{ padding: 6 }} accessibilityLabel="Supprimer">
                <Ionicons name="trash-outline" size={20} color={colors.red} />
              </Pressable>
            </Card>
          ))
        )}
      </Screen>
    </View>
  );
}
