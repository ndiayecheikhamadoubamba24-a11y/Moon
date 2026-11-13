import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ISODate, MONTHS, monthGrid, parseISO, today, WEEKDAYS_SHORT } from '../lib/dates';
import { colors } from '../lib/theme';
import { MonthHeader } from './Calendar';
import { T } from './ui';

/** Sélecteur de date simple (jours futurs désactivés). */
export function DatePicker({ value, onChange, maxDate = today() }: { value: ISODate | null; onChange: (d: ISODate) => void; maxDate?: ISODate }) {
  const init = parseISO(value ?? maxDate);
  const [ym, setYm] = useState({ y: init.getFullYear(), m: init.getMonth() });
  const days = monthGrid(ym.y, ym.m);
  const shift = (n: number) => {
    const d = new Date(ym.y, ym.m + n, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <View>
      <MonthHeader label={`${MONTHS[ym.m]} ${ym.y}`} onPrev={() => shift(-1)} onNext={() => shift(1)} />
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS_SHORT.map((d, i) => (
          <T key={i} weight="bold" size={12} color={colors.textMuted} style={{ flex: 1, textAlign: 'center' }}>
            {d}
          </T>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {days.map((d) => {
          const inMonth = parseISO(d).getMonth() === ym.m;
          const disabled = d > maxDate;
          const selected = d === value;
          return (
            <Pressable key={d} disabled={!inMonth || disabled} onPress={() => onChange(d)} style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              {inMonth && (
                <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.pink : 'transparent' }}>
                  <T weight={selected ? 'black' : 'bold'} color={selected ? colors.white : disabled ? '#C9C2DB' : colors.text}>
                    {parseISO(d).getDate()}
                  </T>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Stepper({ label, value, min, max, onChange, unit = 'jours' }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
      <T weight="bold" style={{ flex: 1 }}>
        {label}
      </T>
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={stepBtn} accessibilityLabel="Moins">
        <T weight="black" size={20} color={colors.night}>
          −
        </T>
      </Pressable>
      <T weight="black" size={18} style={{ width: 80, textAlign: 'center' }}>
        {value} {unit}
      </T>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} style={stepBtn} accessibilityLabel="Plus">
        <T weight="black" size={20} color={colors.night}>
          +
        </T>
      </Pressable>
    </View>
  );
}

const stepBtn = { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.lavender, alignItems: 'center' as const, justifyContent: 'center' as const };
