/**
 * Calculs du cycle sur le téléphone (fonctionne hors ligne).
 * Même logique que App\Services\CycleService côté Laravel :
 *  - durée du cycle = moyenne des 6 derniers cycles complets (15-60 j), sinon réglage ;
 *  - ovulation au jour (durée - 14) ; période féconde de J-5 à J+1 autour.
 * Ce sont des estimations éducatives, pas un avis médical.
 */
import { addDays, diffDays, ISODate, today as todayISO } from './dates';

export type Cycle = { id?: number; start_date: ISODate; end_date: ISODate | null; cycle_length?: number | null };
export type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export type DayInfo = {
  date: ISODate;
  cycle_day: number | null;
  cycle_length: number;
  phase: Phase | null;
  is_period: boolean;
  is_predicted_period: boolean;
  is_fertile: boolean;
  is_ovulation: boolean;
  is_today: boolean;
};

export type CycleSettings = { cycle_length: number; period_length: number };

const LUTEAL = 14;

export class CycleModel {
  readonly cycles: Cycle[];
  readonly avgCycle: number;
  readonly avgPeriod: number;
  readonly today: ISODate;

  constructor(cycles: Cycle[], settings: CycleSettings, today: ISODate = todayISO()) {
    this.today = today;
    const sorted = [...cycles].sort((a, b) => a.start_date.localeCompare(b.start_date));
    // Recalcule les durées à partir des débuts successifs
    this.cycles = sorted.map((c, i) => ({
      ...c,
      cycle_length: sorted[i + 1] ? diffDays(c.start_date, sorted[i + 1].start_date) : null,
    }));

    const lengths = this.cycles.map((c) => c.cycle_length).filter((l): l is number => !!l && l >= 15 && l <= 60).slice(-6);
    this.avgCycle = lengths.length ? Math.round(avg(lengths)) : settings.cycle_length || 28;

    const periods = this.cycles
      .filter((c) => c.end_date)
      .map((c) => diffDays(c.start_date, c.end_date!) + 1)
      .filter((l) => l >= 1 && l <= 12)
      .slice(-6);
    this.avgPeriod = periods.length ? Math.round(avg(periods)) : settings.period_length || 5;
  }

  get last(): Cycle | undefined {
    return this.cycles[this.cycles.length - 1];
  }

  get hasData(): boolean {
    return this.cycles.length > 0;
  }

  /** Règles en cours (commencées, non terminées, depuis moins de 12 jours). */
  get openCycle(): Cycle | undefined {
    const last = this.last;
    if (!last || last.end_date) return undefined;
    return diffDays(last.start_date, this.today) < 12 ? last : undefined;
  }

  periodEnd(cycle: Cycle): ISODate {
    if (cycle.end_date) return cycle.end_date;
    const estimated = addDays(cycle.start_date, this.avgPeriod - 1);
    if (this.openCycle === cycle && this.today > estimated) return this.today;
    return estimated;
  }

  predictedStarts(until: ISODate): ISODate[] {
    const last = this.last;
    if (!last) return [];
    let next = addDays(last.start_date, this.avgCycle);
    if (next < this.today && !this.openCycle) next = this.today; // retard
    const starts: ISODate[] = [];
    while (next <= until && starts.length < 30) {
      starts.push(next);
      next = addDays(next, this.avgCycle);
    }
    return starts;
  }

  get nextPeriod(): ISODate | null {
    return this.predictedStarts(addDays(this.today, 120))[0] ?? null;
  }

  get nextOvulation(): ISODate | null {
    const next = this.nextPeriod;
    if (!next) return null;
    let ov = addDays(next, -(LUTEAL + 1));
    if (ov < this.today) ov = addDays(ov, this.avgCycle);
    return ov;
  }

  dayInfo(date: ISODate): DayInfo {
    const info: DayInfo = {
      date,
      cycle_day: null,
      cycle_length: this.avgCycle,
      phase: null,
      is_period: false,
      is_predicted_period: false,
      is_fertile: false,
      is_ovulation: false,
      is_today: date === this.today,
    };
    const actual = [...this.cycles].reverse().find((c) => c.start_date <= date);
    if (!actual) return info;

    let start = actual.start_date;
    let predicted = false;
    let length = actual.cycle_length || this.avgCycle;
    if (actual === this.last) {
      const p = this.predictedStarts(date).filter((s) => s <= date).pop();
      if (p) {
        start = p;
        predicted = true;
        length = this.avgCycle;
      }
    }

    const day = diffDays(start, date) + 1;
    const periodEnd = predicted ? addDays(start, this.avgPeriod - 1) : this.periodEnd(actual);
    const inPeriod = date <= periodEnd;
    const ovDay = Math.max(length - LUTEAL, 8);

    info.cycle_day = day;
    info.cycle_length = length;
    info.is_period = inPeriod && !predicted;
    info.is_predicted_period = inPeriod && predicted;
    info.is_ovulation = day === ovDay;
    info.is_fertile = !inPeriod && day >= ovDay - 5 && day <= ovDay + 1;
    info.phase = inPeriod ? 'menstrual' : Math.abs(day - ovDay) <= 1 ? 'ovulation' : day < ovDay ? 'follicular' : 'luteal';
    return info;
  }

  get todayInfo(): DayInfo {
    return this.dayInfo(this.today);
  }

  get daysUntilNextPeriod(): number | null {
    const n = this.nextPeriod;
    return n ? diffDays(this.today, n) : null;
  }
}

function avg(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
