import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CycleModel, DayInfo } from '../lib/cycle';
import { ISODate, MONTHS, monthGrid, parseISO, toISO, WEEKDAYS_SHORT } from '../lib/dates';
import { colors } from '../lib/theme';
import { T } from './ui';

type Props = {
  model: CycleModel;
  year: number;
  month: number;
  loggedDates: Set<ISODate>;
  onDayPress: (date: ISODate) => void;
};

/** Grand calendrier mensuel (écran central). */
export const MonthCalendar = memo(function MonthCalendar({ model, year, month, loggedDates, onDayPress }: Props) {
  const days = monthGrid(year, month);
  const weeks: ISODate[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <View>
      <View style={s.row}>
        {WEEKDAYS_SHORT.map((d, i) => (
          <T key={i} weight="extrabold" size={13} color={colors.textMuted} style={s.weekday}>
            {d}
          </T>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]} style={s.row}>
          {week.map((date, i) => {
            const inMonth = parseISO(date).getMonth() === month;
            if (!inMonth) return <View key={date} style={s.cell} />;
            const info = model.dayInfo(date);
            const prev = i > 0 ? model.dayInfo(week[i - 1]) : null;
            const next = i < 6 ? model.dayInfo(week[i + 1]) : null;
            return (
              <DayCell
                key={date}
                info={info}
                fertileLeft={!!prev?.is_fertile && parseISO(week[i - 1]).getMonth() === month}
                fertileRight={!!next?.is_fertile && parseISO(week[i + 1]).getMonth() === month}
                hasLog={loggedDates.has(date)}
                onPress={() => onDayPress(date)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
});

function DayCell({ info, hasLog, onPress, fertileLeft, fertileRight }: { info: DayInfo; hasLog: boolean; onPress: () => void; fertileLeft: boolean; fertileRight: boolean }) {
  const day = parseISO(info.date).getDate();
  const fertile = info.is_fertile || (info.is_ovulation && (fertileLeft || fertileRight));
  let circle: object = {};
  let color: string = colors.text;
  if (info.is_period) {
    circle = { backgroundColor: colors.pink };
    color = colors.white;
  } else if (info.is_predicted_period) {
    circle = { borderWidth: 1.5, borderColor: colors.pink, borderStyle: 'dashed' };
    color = colors.pink;
  } else if (info.is_ovulation) {
    circle = { backgroundColor: colors.gold };
  }
  const label = [
    `${day}`,
    info.is_period && 'règles',
    info.is_predicted_period && 'règles prévues',
    info.is_ovulation && 'ovulation estimée',
    info.is_fertile && 'période féconde',
    info.is_today && "aujourd'hui",
    hasLog && 'note enregistrée',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable onPress={onPress} style={s.cell} accessibilityRole="button" accessibilityLabel={label}>
      {fertile && (
        <View
          style={[
            s.fertile,
            { left: fertileLeft ? 0 : 4, right: fertileRight ? 0 : 4 },
            !fertileLeft && { borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
            !fertileRight && { borderTopRightRadius: 20, borderBottomRightRadius: 20 },
          ]}
        />
      )}
      <View style={[s.circle, circle, info.is_today && s.today]}>
        <T weight={info.is_period || info.is_today || fertile ? 'black' : 'bold'} size={16} color={color}>
          {day}
        </T>
      </View>
      <View style={[s.dot, { backgroundColor: hasLog ? colors.night : 'transparent' }]} />
    </Pressable>
  );
}

export function Legend() {
  const items = [
    { label: 'Règles', style: { backgroundColor: colors.pink } },
    { label: 'Période féconde', style: { backgroundColor: colors.lilac } },
    { label: 'Ovulation (estimation)', style: { backgroundColor: colors.gold } },
    { label: 'Règles prévues', style: { borderWidth: 1.5, borderColor: colors.pink, borderStyle: 'dashed' as const } },
    { label: "Aujourd'hui", style: { borderWidth: 2, borderColor: colors.night } },
  ];
  return (
    <View style={s.legend}>
      {items.map((it) => (
        <View key={it.label} style={s.legendItem}>
          <View style={[s.legendDot, it.style]} />
          <T size={12} weight="semibold" color={colors.textMuted}>
            {it.label}
          </T>
        </View>
      ))}
    </View>
  );
}

/** Vue année : 12 mini-mois avec les jours de règles et d'ovulation. */
export function YearCalendar({ model, year, onMonthPress }: { model: CycleModel; year: number; onMonthPress: (m: number) => void }) {
  const current = new Date();
  return (
    <View style={s.yearGrid}>
      {MONTHS.map((name, m) => {
        const days = monthGrid(year, m).filter((d) => parseISO(d).getMonth() === m);
        const isCurrent = current.getFullYear() === year && current.getMonth() === m;
        return (
          <Pressable key={name} onPress={() => onMonthPress(m)} style={[s.miniMonth, isCurrent && { borderColor: colors.purple, borderWidth: 2 }]}>
            <T weight="extrabold" size={13} style={{ textAlign: 'center', marginBottom: 6 }}>
              {name}
            </T>
            <View style={s.miniDays}>
              {days.map((d) => {
                const info = model.dayInfo(d);
                const bg = info.is_period
                  ? colors.pink
                  : info.is_ovulation
                    ? colors.gold
                    : info.is_fertile
                      ? colors.lilac
                      : info.is_predicted_period
                        ? colors.pinkSoft
                        : colors.lavender;
                return <View key={d} style={[s.miniDot, { backgroundColor: bg }, toISO(current) === d && { borderWidth: 1.5, borderColor: colors.night }]} />;
              })}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MonthHeader({ label, onPrev, onNext, onToday }: { label: string; onPrev: () => void; onNext: () => void; onToday?: () => void }) {
  return (
    <View style={s.monthHeader}>
      <Pressable onPress={onPrev} hitSlop={12} accessibilityLabel="Précédent">
        <Ionicons name="chevron-back" size={24} color={colors.night} />
      </Pressable>
      <T weight="black" size={19} style={{ flex: 1, textAlign: 'center' }}>
        {label}
      </T>
      <Pressable onPress={onNext} hitSlop={12} accessibilityLabel="Suivant">
        <Ionicons name="chevron-forward" size={24} color={colors.night} />
      </Pressable>
      {onToday && (
        <Pressable onPress={onToday} style={s.todayBtn}>
          <T weight="extrabold" size={13} color={colors.night}>
            Aujourd'hui
          </T>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingVertical: 6 },
  cell: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 2.5, borderColor: colors.night },
  fertile: { position: 'absolute', top: 6, bottom: 8, backgroundColor: colors.lilac },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  miniMonth: { width: '31.5%', backgroundColor: colors.white, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: colors.border },
  miniDays: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center' },
  miniDot: { width: 7, height: 7, borderRadius: 4 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  todayBtn: { borderWidth: 1.5, borderColor: colors.lilac, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.white },
});
