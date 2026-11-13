/** Utilitaires de dates en jours calendaires (format AAAA-MM-JJ, sans fuseau). */

export type ISODate = string;

export const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
export const WEEKDAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const WEEKDAYS_LONG = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): ISODate {
  return toISO(new Date());
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Nombre de jours de a à b (positif si b est après a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}

/** Lundi de la semaine contenant la date. */
export function startOfWeek(s: ISODate): ISODate {
  const d = parseISO(s);
  const dow = (d.getDay() + 6) % 7;
  return addDays(s, -dow);
}

export function monthGrid(year: number, month: number): ISODate[] {
  const first = toISO(new Date(year, month, 1));
  const last = toISO(new Date(year, month + 1, 0));
  const start = startOfWeek(first);
  const end = addDays(startOfWeek(last), 6);
  const days: ISODate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

export function formatLong(s: ISODate): string {
  const d = parseISO(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDayMonth(s: ISODate): string {
  const d = parseISO(s);
  return `${WEEKDAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()}`;
}
