import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { PanResponder, ScrollView, View } from 'react-native';
import { Legend, MonthCalendar, MonthHeader, YearCalendar } from '../../components/Calendar';
import { CycleRing } from '../../components/CycleRing';
import { NightHeader, OfflineBanner } from '../../components/Header';
import { Button, Card, Segmented, T } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useCycle } from '../../context/CycleContext';
import { MONTHS, today } from '../../lib/dates';
import { colors, phaseLabels, space } from '../../lib/theme';

export default function CalendarScreen() {
  const { user } = useAuth();
  const { model, logs, online, pendingCount, startPeriod, endPeriod } = useCycle();
  const now = new Date();
  const [view, setView] = useState<'month' | 'year'>('month');
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const info = model.todayInfo;
  const inPeriod = info.is_period || !!model.openCycle;
  const logged = useMemo(() => new Set(Object.keys(logs)), [logs]);

  const shift = (n: number) =>
    setYm((cur) => {
      if (view === 'year') return { ...cur, y: cur.y + n };
      const d = new Date(cur.y, cur.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  // Glisser à gauche / à droite pour changer de mois
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 25 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -50) shift(1);
          else if (g.dx > 50) shift(-1);
        },
      }),
    [view], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title={view === 'month' ? `Bonjour, ${user?.name ?? ''} !` : 'Vue annuelle'} />
      {!online && <OfflineBanner pending={pendingCount} />}
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }} showsVerticalScrollIndicator={false}>
        {model.hasData && view === 'month' && (
          <Card tint={colors.lavenderSoft} style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center', marginTop: -space.xl }}>
            <CycleRing day={info.cycle_day} length={info.cycle_length} size={86} />
            <View style={{ flex: 1 }}>
              <T weight="black" size={17}>
                Jour {info.cycle_day} du cycle
              </T>
              <T weight="semibold" size={14} color={colors.pink}>
                🩸 {info.phase ? phaseLabels[info.phase] : ''}
              </T>
              <T size={13} style={{ marginTop: 4 }}>
                📅 Prochaines règles dans {model.daysUntilNextPeriod} jours <T size={12} color={colors.textMuted}>(estimation)</T>
              </T>
            </View>
          </Card>
        )}

        <MonthHeader
          label={view === 'month' ? `${MONTHS[ym.m]} ${ym.y}` : `${ym.y}`}
          onPrev={() => shift(-1)}
          onNext={() => shift(1)}
          onToday={() => setYm({ y: now.getFullYear(), m: now.getMonth() })}
        />
        <Segmented
          options={[
            { value: 'month', label: 'Mois' },
            { value: 'year', label: 'Année' },
          ]}
          value={view}
          onChange={(v) => setView(v as 'month' | 'year')}
        />

        <View style={{ marginTop: space.md }} {...pan.panHandlers}>
          {view === 'month' ? (
            <MonthCalendar model={model} year={ym.y} month={ym.m} loggedDates={logged} onDayPress={(d) => router.push(`/day/${d}`)} />
          ) : (
            <YearCalendar
              model={model}
              year={ym.y}
              onMonthPress={(m) => {
                setYm({ y: ym.y, m });
                setView('month');
              }}
            />
          )}
        </View>
        <Legend />

        {model.hasData ? (
          <Button
            title={inPeriod ? 'Mes règles sont terminées' : 'Mes règles ont commencé'}
            icon={inPeriod ? 'checkmark' : 'water'}
            onPress={() => (inPeriod ? endPeriod() : startPeriod())}
            style={{ marginTop: space.md }}
          />
        ) : (
          <Button title="Ajouter mes dernières règles" icon="add" onPress={() => router.push('/onboarding')} style={{ marginTop: space.md }} />
        )}

        {model.hasData && model.cycles.length > 1 && (
          <Card style={{ marginTop: space.xl }}>
            <T weight="black" size={17}>
              Mon historique
            </T>
            <T size={14} color={colors.textMuted} style={{ marginTop: 4 }}>
              Cycle moyen : {model.avgCycle} jours · Règles : {model.avgPeriod} jours
            </T>
            {[...model.cycles]
              .reverse()
              .slice(0, 6)
              .map((c) => (
                <View key={c.start_date} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 }}>
                  <T weight="semibold">{c.start_date.split('-').reverse().join('/')}</T>
                  <T color={c.cycle_length && (c.cycle_length < 21 || c.cycle_length > 35) ? colors.pink : colors.textMuted}>
                    {c.cycle_length ? `${c.cycle_length} jours` : c.start_date <= today() ? 'en cours' : ''}
                  </T>
                </View>
              ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
