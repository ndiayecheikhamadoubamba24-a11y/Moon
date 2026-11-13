import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { BADGE_ICONS } from '../lib/constants';
import type { Badge } from './(tabs)/play';
import { NightHeader } from '../components/Header';
import { Card, ErrorBox, Loading, Screen, Segmented, T } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../lib/hooks';
import { colors, space } from '../lib/theme';

type Leaderboard = { opted_in: boolean; entries: { rank: number; alias: string; points: number; is_me: boolean }[] };

export default function Badges() {
  const [tab, setTab] = useState<'badges' | 'ranking'>('badges');
  const { user, updateUser } = useAuth();
  const badges = useApi<Badge[]>('/badges');
  const board = useApi<Leaderboard>(tab === 'ranking' ? '/leaderboard' : null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title="Badges et classement" back />
      <Screen edges={['bottom']}>
        <Segmented
          options={[
            { value: 'badges', label: 'Badges' },
            { value: 'ranking', label: 'Classement' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as 'badges' | 'ranking')}
        />
        <View style={{ height: space.lg }} />
        {tab === 'badges' && (
          <>
            {badges.loading && !badges.data && <Loading />}
            {badges.error && !badges.data && <ErrorBox message={badges.error} onRetry={badges.reload} />}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {badges.data?.map((b) => (
                <Card key={b.id} tint={b.earned ? colors.goldSoft : colors.lavenderSoft} style={{ width: '48.5%', alignItems: 'center' }}>
                  {b.earned ? <T size={44}>{BADGE_ICONS[b.icon] ?? '🏅'}</T> : <Ionicons name="lock-closed" size={40} color="#9A90B8" />}
                  <T weight="black" style={{ textAlign: 'center', marginTop: 6 }}>
                    {b.name}
                  </T>
                  <T size={12} color={colors.textMuted} style={{ textAlign: 'center' }}>
                    {b.earned && b.earned_at ? `Obtenu le ${new Date(b.earned_at).toLocaleDateString('fr-FR')}` : b.description}
                  </T>
                </Card>
              ))}
            </View>
          </>
        )}
        {tab === 'ranking' && (
          <>
            {board.data?.entries.map((e) => (
              <Card key={e.rank} tint={e.is_me ? colors.lavender : undefined} style={{ flexDirection: 'row', marginBottom: space.sm }}>
                <T weight="black" style={{ width: 40 }}>
                  #{e.rank}
                </T>
                <T weight="bold" style={{ flex: 1 }}>
                  {e.alias}
                  {e.is_me ? ' (toi)' : ''}
                </T>
                <T weight="black">⭐ {e.points}</T>
              </Card>
            ))}
            {board.data && !board.data.entries.length && <T color={colors.textMuted}>Personne n'est encore inscrite au classement.</T>}
          </>
        )}
        <Card tint={colors.goldSoft} style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.xl }}>
          <T weight="bold" style={{ flex: 1 }}>
            🏆 Classement (optionnel et anonyme)
          </T>
          <Switch
            value={!!user?.leaderboard_opt_in}
            onValueChange={async (v) => {
              await updateUser({ leaderboard_opt_in: v }).catch(() => {});
              board.reload();
            }}
            trackColor={{ true: colors.purple, false: colors.border }}
          />
        </Card>
      </Screen>
    </View>
  );
}
