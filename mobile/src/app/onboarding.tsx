import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { DatePicker, Stepper } from '../components/DatePicker';
import { NightHeader, OfflineBanner } from '../components/Header';
import { SleepyMoon } from '../components/Moon';
import { Button, Card, Check, Screen, T } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCycle } from '../context/CycleContext';
import { api } from '../lib/api';
import { addDays, ISODate, today } from '../lib/dates';
import { registerForPush } from '../lib/notifications';
import { store } from '../lib/storage';
import { colors, space } from '../lib/theme';

/** Premier lancement : dernières règles, durées, rappels. */
export default function Onboarding() {
  const { user, updateUser } = useAuth();
  const { model, addPeriod, online } = useCycle();
  const [step, setStep] = useState<'intro' | 'date' | 'lengths' | 'reminders'>('intro');
  const [date, setDate] = useState<ISODate | null>(null);
  const [cycleLength, setCycleLength] = useState(user?.cycle_length ?? 28);
  const [periodLength, setPeriodLength] = useState(user?.period_length ?? 5);
  const [reminders, setReminders] = useState({ period_soon: true, daily_log: false, change_protection: false });
  const [saving, setSaving] = useState(false);

  // Compte existant avec un historique (autre téléphone) : rien à demander.
  useEffect(() => {
    if (model.hasData) finish();
  }, [model.hasData]); // eslint-disable-line react-hooks/exhaustive-deps

  async function finish() {
    await store.set('onboarded', true);
    router.replace('/');
  }

  const save = async () => {
    setSaving(true);
    try {
      await updateUser({ cycle_length: cycleLength, period_length: periodLength }).catch(() => {});
      if (date) {
        const end = addDays(date, periodLength - 1);
        await addPeriod(date, end < today() ? end : null);
      }
      const enabled = Object.entries(reminders).filter(([, v]) => v);
      if (enabled.length && (await registerForPush())) {
        await Promise.all(enabled.map(([type]) => api(`/reminders/${type}`, { method: 'PUT', body: { enabled: true } }).catch(() => {})));
      }
    } finally {
      setSaving(false);
      finish();
    }
  };

  if (step === 'intro') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <NightHeader title="Moon" />
        {!online && <OfflineBanner />}
        <Screen edges={[]}>
          <View style={{ alignItems: 'center', marginTop: space.xl }}>
            <SleepyMoon size={220} />
            <T weight="black" size={26} style={{ textAlign: 'center', marginTop: space.lg }}>
              Dis-moi quand tes dernières règles ont commencé
            </T>
            <T size={16} color={colors.textMuted} style={{ textAlign: 'center', marginTop: space.sm }}>
              Cela nous aidera à personnaliser Moon pour toi 💜
            </T>
          </View>
          <Button title="Ajouter ma date" icon="add" onPress={() => setStep('date')} style={{ marginTop: space.xxl }} />
          <Button title="Je ne sais pas / plus tard" variant="ghost" onPress={() => setStep('reminders')} />
          {user?.mode === 'comprendre' && (
            <T size={13} color={colors.textMuted} style={{ textAlign: 'center' }}>
              Mode « Comprendre » : tu peux explorer Moon sans suivre de cycle.
            </T>
          )}
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <NightHeader title={step === 'date' ? 'Mes dernières règles' : step === 'lengths' ? 'Mon cycle' : 'Mes rappels'} subtitle="Tu pourras modifier ça plus tard" />
      <Screen edges={['bottom']}>
        {step === 'date' && (
          <>
            <Card>
              <DatePicker value={date} onChange={setDate} />
            </Card>
            <Button title="Continuer" onPress={() => setStep('lengths')} disabled={!date} style={{ marginTop: space.xl }} />
          </>
        )}
        {step === 'lengths' && (
          <>
            <Card>
              <Stepper label="Durée de mes règles" value={periodLength} min={1} max={12} onChange={setPeriodLength} />
              <Stepper label="Durée de mon cycle" value={cycleLength} min={18} max={45} onChange={setCycleLength} />
              <T size={13} color={colors.textMuted} style={{ marginTop: space.sm }}>
                Tu ne sais pas ? Laisse 5 et 28 jours : Moon apprendra de ton historique.
              </T>
            </Card>
            <Button title="Continuer" onPress={() => setStep('reminders')} style={{ marginTop: space.xl }} />
          </>
        )}
        {step === 'reminders' && (
          <>
            <Card style={{ gap: space.lg }}>
              <Check checked={reminders.period_soon} onPress={() => setReminders((r) => ({ ...r, period_soon: !r.period_soon }))} label="Me prévenir 2 jours avant mes règles" />
              <Check checked={reminders.change_protection} onPress={() => setReminders((r) => ({ ...r, change_protection: !r.change_protection }))} label="Me rappeler de changer de protection pendant mes règles" />
              <Check checked={reminders.daily_log} onPress={() => setReminders((r) => ({ ...r, daily_log: !r.daily_log }))} label="Me rappeler de noter ma journée le soir" />
            </Card>
            <T size={13} color={colors.textMuted} style={{ marginTop: space.md }}>
              🔒 Les notifications sont discrètes : aucun mot sur les règles ne s'affiche sur ton écran.
            </T>
            <Button title="C'est parti !" onPress={save} loading={saving} style={{ marginTop: space.xl }} />
          </>
        )}
      </Screen>
    </View>
  );
}
