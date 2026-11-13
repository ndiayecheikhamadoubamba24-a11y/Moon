import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { NightHeader, OfflineBanner } from '../../components/Header';
import { Button, Card, ErrorBox, Loading, SectionTitle, T } from '../../components/ui';
import { useCycle } from '../../context/CycleContext';
import { BADGE_ICONS } from '../../lib/constants';
import { useApi } from '../../lib/hooks';
import { colors, radius, space } from '../../lib/theme';

export type Badge = { id: number; code: string; name: string; description: string; icon: string; earned: boolean; earned_at: string | null };
type PlayHome = {
  points: number;
  streak_days: number;
  played_today: boolean;
  week: { date: string; done: boolean }[];
  challenge: { title: string; description: string; progress: number; target: number; days_left: number; completed: boolean } | null;
  games: { id: number; type: string; title: string; duration_minutes: number; questions_count: number; best_score: number }[];
  badges: Badge[];
};

const GAME_STYLE: Record<string, { emoji: string; bg: string }> = {
  quiz: { emoji: '🧠', bg: colors.pinkSoft },
  myth_fact: { emoji: '✅', bg: colors.greenSoft },
  association: { emoji: '🔗', bg: colors.goldSoft },
};

export default function Play() {
  const { data, loading, error, reload } = useApi<PlayHome>('/games');
  const { online } = useCycle();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader
        title="Jouer"
        subtitle="Apprendre en s'amusant"
        right={
          <T weight="black" size={18} color={colors.white}>
            ⭐ {data?.points ?? 0} pts
          </T>
        }
      />
      {!online && <OfflineBanner />}
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
        {loading && !data && <Loading />}
        {error && !data && <ErrorBox message={error} onRetry={reload} />}
        {data && (
          <>
            <Card style={{ marginTop: -space.xl, alignItems: 'center' }}>
              <T weight="black" size={17}>
                🔥 {data.streak_days} jour{data.streak_days > 1 ? 's' : ''} d'affilée
              </T>
              <View style={{ flexDirection: 'row', gap: 10, marginVertical: space.md }}>
                {data.week.map((d) => (
                  <View key={d.date} style={[s.streakDot, d.done && { backgroundColor: colors.gold, borderColor: colors.gold }]}>
                    {d.done && <Ionicons name="checkmark" size={16} color={colors.white} />}
                  </View>
                ))}
              </View>
              {!data.played_today && (
                <T size={14} color={colors.textMuted}>
                  Un petit jeu aujourd'hui pour continuer ?
                </T>
              )}
            </Card>

            {data.challenge && (
              <Card tint={colors.goldSoft} style={{ marginTop: space.lg }}>
                <T weight="black" size={17}>
                  🏆 Défi de la semaine
                </T>
                <T weight="extrabold" style={{ marginTop: 4 }}>
                  {data.challenge.title} : {data.challenge.description}
                </T>
                <View style={s.track}>
                  <View style={[s.bar, { width: `${(data.challenge.progress / data.challenge.target) * 100}%` }]} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <T size={13} weight="bold">
                    {data.challenge.progress} / {data.challenge.target}
                  </T>
                  <T size={13} weight="bold">
                    {data.challenge.completed ? '✅ Réussi !' : `⏳ Encore ${data.challenge.days_left} jours`}
                  </T>
                </View>
                {!data.challenge.completed && (
                  <Button
                    title="Relever le défi"
                    small
                    style={{ marginTop: space.md, alignSelf: 'center' }}
                    onPress={() => {
                      const g = data.games.find((x) => x.type === 'myth_fact') ?? data.games[0];
                      if (g) router.push(`/game/${g.id}`);
                    }}
                  />
                )}
              </Card>
            )}

            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
              {data.games.map((g) => (
                <Card key={g.id} tint={GAME_STYLE[g.type]?.bg} style={{ flex: 1, alignItems: 'center', padding: space.md }} onPress={() => router.push(`/game/${g.id}`)}>
                  <T size={34}>{GAME_STYLE[g.type]?.emoji ?? '🎮'}</T>
                  <T weight="black" size={15} style={{ textAlign: 'center', marginTop: 4 }}>
                    {g.title}
                  </T>
                  <T size={12} color={colors.textMuted}>
                    {g.questions_count} questions
                  </T>
                  <T size={12} color={colors.textMuted}>
                    {g.duration_minutes} min
                  </T>
                </Card>
              ))}
            </View>

            <SectionTitle title="Mes badges" action="Tout voir" onAction={() => router.push('/badges')} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {data.badges.map((b) => (
                <View key={b.id} style={[s.badge, !b.earned && { backgroundColor: colors.lavender }]}>
                  {b.earned ? <T size={32}>{BADGE_ICONS[b.icon] ?? '🏅'}</T> : <Ionicons name="lock-closed" size={26} color="#9A90B8" />}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  streakDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.lilac, alignItems: 'center', justifyContent: 'center' },
  track: { height: 10, backgroundColor: colors.white, borderRadius: 5, marginTop: space.md, overflow: 'hidden' },
  bar: { height: 10, backgroundColor: colors.green, borderRadius: 5 },
  badge: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
});
