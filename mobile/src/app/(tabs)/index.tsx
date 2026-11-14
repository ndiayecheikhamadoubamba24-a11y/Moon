import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { CycleRing } from '../../components/CycleRing';
import { HeaderIcon, NightHeader, OfflineBanner } from '../../components/Header';
import { SleepyMoon } from '../../components/Moon';
import { MoodPicker } from '../../components/MoodPicker';
import { HScroll, Tip, TipsRow } from '../../components/Tips';
import { Button, Card, Disclaimer, SectionTitle, T } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useCycle } from '../../context/CycleContext';
import { api } from '../../lib/api';
import { addDays, formatDayMonth, parseISO, startOfWeek, today, WEEKDAYS_SHORT } from '../../lib/dates';
import { useApi } from '../../lib/hooks';
import { colors, phaseLabels, phaseMessages, radius, space } from '../../lib/theme';

type Home = {
  tips: Tip[];
  continue_learning: { id: number; title: string; slug: string; duration_minutes: number; progress: number }[];
  daily_challenge: { id: number; prompt: string; game_id: number } | null;
  user: { points: number; streak_days: number };
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { model, logs, online, pendingCount, startPeriod, endPeriod, saveLog, refresh } = useCycle();
  const { data, reload, loading } = useApi<Home>('/home');
  const [challengeResult, setChallengeResult] = useState<{ correct: boolean; explanation: string } | null>(null);
  const t = today();
  const info = model.todayInfo;
  const inPeriod = info.is_period || !!model.openCycle;
  const todayLog = logs[t];
  const weekStart = startOfWeek(t);

  const answerChallenge = async (answer: 'myth' | 'fact') => {
    if (!data?.daily_challenge) return;
    try {
      const res = await api(`/questions/${data.daily_challenge.id}/check`, { method: 'POST', body: { answer } });
      setChallengeResult(res);
    } catch {
      setChallengeResult({ correct: false, explanation: 'Connecte-toi à Internet pour voir la réponse.' });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader
        title={`Bonjour, ${user?.name ?? ''} !`}
        subtitle={formatDayMonth(t).replace(/^./, (c) => c.toUpperCase())}
        right={
          <>
            <HeaderIcon name="notifications-outline" label="Notifications" onPress={() => router.push('/help')} />
            {user?.avatar ? (
              <Pressable onPress={() => router.push('/profile')} style={s.avatar} accessibilityLabel="Mon profil">
                <T size={22}>{user.avatar}</T>
              </Pressable>
            ) : (
              <HeaderIcon name="person-circle-outline" label="Mon profil" onPress={() => router.push('/profile')} />
            )}
          </>
        }
      />
      {!online && <OfflineBanner pending={pendingCount} />}
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => (reload(), refresh())} />}
        showsVerticalScrollIndicator={false}
      >
        {model.hasData ? (
          <Card tint={inPeriod ? colors.pinkSoft : colors.lavenderSoft} style={{ marginTop: -space.xl }} onPress={() => router.push('/calendar')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <CycleRing day={info.cycle_day} length={info.cycle_length} label="Jour" />
              <View style={{ flex: 1 }}>
                <T weight="black" size={18}>
                  {info.phase ? `🩸 ${phaseLabels[info.phase]}` : 'Cycle'}
                </T>
                <T size={14} style={{ marginTop: 2 }}>
                  {info.phase ? phaseMessages[info.phase] : ''}
                </T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.sm }}>
                  <Ionicons name="calendar-outline" size={18} color={colors.night} />
                  <T size={14} weight="semibold" style={{ flex: 1 }}>
                    {model.daysUntilNextPeriod === 0
                      ? 'Règles prévues aujourd\'hui'
                      : `Prochaines règles dans ${model.daysUntilNextPeriod} jours`}
                    <T size={12} color={colors.textMuted}>
                      {' '}
                      (estimation)
                    </T>
                  </T>
                </View>
              </View>
            </View>
          </Card>
        ) : (
          <Card style={{ marginTop: -space.xl, alignItems: 'center' }}>
            <SleepyMoon size={150} />
            <T weight="black" size={20} style={{ textAlign: 'center', marginTop: space.sm }}>
              Dis-moi quand tes dernières règles ont commencé
            </T>
            <Button title="Ajouter ma date" icon="add" onPress={() => router.push('/onboarding')} style={{ marginTop: space.lg, alignSelf: 'stretch' }} />
          </Card>
        )}

        {/* Semaine en cours */}
        <View style={s.week}>
          {WEEKDAYS_SHORT.map((label, i) => {
            const d = addDays(weekStart, i);
            const di = model.dayInfo(d);
            return (
              <Pressable key={d} style={{ alignItems: 'center', flex: 1 }} onPress={() => router.push(`/day/${d}`)}>
                <T weight="extrabold" size={13} color={di.is_period ? colors.pink : colors.text}>
                  {label}
                </T>
                <View
                  style={[
                    s.weekDay,
                    di.is_period && { backgroundColor: colors.pink },
                    di.is_fertile && { backgroundColor: colors.lilac },
                    di.is_ovulation && { backgroundColor: colors.gold },
                    d === t && { borderWidth: 2.5, borderColor: colors.night },
                  ]}
                >
                  <T weight="black" size={16} color={di.is_period ? colors.white : colors.text}>
                    {parseISO(d).getDate()}
                  </T>
                </View>
                <View style={[s.dot, { backgroundColor: logs[d] ? colors.night : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>
        <Button title="Voir le calendrier" variant="ghost" small onPress={() => router.push('/calendar')} />

        <Card style={{ marginTop: space.md }}>
          <T weight="black" size={18} style={{ marginBottom: space.md }}>
            Comment tu te sens aujourd'hui ?
          </T>
          <MoodPicker value={todayLog?.mood} onChange={(mood) => saveLog({ ...(todayLog ?? { date: t }), date: t, mood })} />
        </Card>

        <View style={s.actions}>
          {inPeriod ? (
            <ActionTile icon="checkmark-circle" label="Mes règles sont terminées" color={colors.pink} onPress={() => endPeriod()} />
          ) : (
            <ActionTile icon="water" label="Mes règles ont commencé" color={colors.pink} onPress={() => startPeriod()} />
          )}
          <ActionTile icon="create-outline" label="Noter ma journée" onPress={() => router.push(`/journal/${t}`)} />
          <ActionTile icon="help-circle" label="Poser une question" onPress={() => router.push({ pathname: '/help/new', params: { type: 'question' } })} />
        </View>

        {inPeriod && (
          <Card tint={colors.redSoft} style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }} onPress={() => router.push('/help')}>
            <Ionicons name="alert-circle" size={30} color={colors.red} />
            <T size={14} style={{ flex: 1 }}>
              <T weight="extrabold">Douleurs fortes ou inhabituelles ?</T> Parles-en à un professionnel de santé.
            </T>
            <Ionicons name="chevron-forward" size={20} color={colors.red} />
          </Card>
        )}

        {!!data?.tips?.length && (
          <>
            <SectionTitle icon="⭐" title={inPeriod ? 'Conseils pour cette période' : 'Tes conseils du jour'} action="Voir tous" onAction={() => router.push('/learn')} />
            <TipsRow tips={data.tips} />
          </>
        )}

        {!!data?.continue_learning?.length && (
          <>
            <SectionTitle icon="🎓" title="Continue d'apprendre" action="Voir plus" onAction={() => router.push('/learn')} />
            <HScroll>
              {data.continue_learning.map((m) => (
                <Card key={m.id} style={{ width: 230 }} onPress={() => router.push(`/module/${m.slug}`)}>
                  <T weight="extrabold" size={16} numberOfLines={2}>
                    {m.title}
                  </T>
                  <T size={13} color={colors.textMuted} style={{ marginTop: 4 }}>
                    🕒 {m.duration_minutes} min
                  </T>
                  <View style={s.progressTrack}>
                    <View style={[s.progressBar, { width: `${m.progress}%` }]} />
                  </View>
                  <T size={12} weight="bold" color={colors.textMuted} style={{ marginTop: 4 }}>
                    {m.progress} %
                  </T>
                </Card>
              ))}
            </HScroll>
          </>
        )}

        {data?.daily_challenge && (
          <Card tint={colors.goldSoft} style={{ marginTop: space.xl }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T weight="black" size={17}>
                🏆 Défi du jour
              </T>
              <T weight="extrabold" size={14}>
                🔥 {data.user.streak_days} jour{data.user.streak_days > 1 ? 's' : ''} d'affilée
              </T>
            </View>
            <T weight="extrabold" size={16} style={{ marginTop: 4 }}>
              Mythe ou réalité ?
            </T>
            <T size={14} style={{ marginTop: 4, fontStyle: 'italic' }}>
              « {data.daily_challenge.prompt} »
            </T>
            {challengeResult ? (
              <View style={{ marginTop: space.md }}>
                <T weight="black" color={challengeResult.correct ? colors.green : colors.pink}>
                  {challengeResult.correct ? '✅ Bonne réponse !' : '❌ Pas tout à fait…'}
                </T>
                <T size={14} style={{ marginTop: 4 }}>
                  {challengeResult.explanation}
                </T>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
                <Button title="Mythe" variant="outline" small style={{ flex: 1 }} onPress={() => answerChallenge('myth')} />
                <Button title="Réalité" variant="purple" small style={{ flex: 1 }} onPress={() => answerChallenge('fact')} />
              </View>
            )}
          </Card>
        )}

        <Card tint={colors.lavender} style={{ marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <T size={44}>🤗</T>
          <View style={{ flex: 1 }}>
            <T weight="black" size={17}>
              Je suis là pour toi 💜
            </T>
            <T size={13} color={colors.textMuted}>
              Une question ? Un souci ? Tu n'es pas seule.
            </T>
            <Button title="Demander de l'aide" variant="purple" small onPress={() => router.push('/help')} style={{ marginTop: space.sm, alignSelf: 'flex-start' }} />
          </View>
        </Card>
        <Disclaimer />
      </ScrollView>
    </View>
  );
}

function ActionTile({ icon, label, onPress, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.tile, color && { backgroundColor: color }, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      <Ionicons name={icon} size={28} color={color ? colors.white : colors.night} />
      <T weight="extrabold" size={14} color={color ? colors.white : colors.night} style={{ textAlign: 'center', marginTop: 6 }}>
        {label}
      </T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginLeft: space.md },
  week: { flexDirection: 'row', marginTop: space.lg },
  weekDay: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginTop: 6, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  tile: { flex: 1, backgroundColor: colors.lavender, borderRadius: radius.lg, padding: space.md, alignItems: 'center', justifyContent: 'center', minHeight: 100 },
  progressTrack: { height: 8, backgroundColor: colors.lavender, borderRadius: 4, marginTop: space.md, overflow: 'hidden' },
  progressBar: { height: 8, backgroundColor: colors.pink, borderRadius: 4 },
});
