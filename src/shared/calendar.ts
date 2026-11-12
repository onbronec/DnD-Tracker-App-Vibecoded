import type { CalendarRecord, WorldCalendarState } from './types';

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const WEEKDAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export const GREGORIAN_YEAR_OFFSET = 1523;

export function gregorianDate(year: number, monthIndex: number, day: number) {
  return new Date(year + GREGORIAN_YEAR_OFFSET, monthIndex, day);
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year + GREGORIAN_YEAR_OFFSET, monthIndex + 1, 0).getDate();
}

export function formatDateKey(year: number, month: string | number, day: number): string {
  const monthName = typeof month === 'number' ? MONTHS[month] : month;
  return `${year}-${monthName}-${day}`;
}

export interface ParsedCalendarDate {
  year: number;
  month: string;
  monthIndex: number;
  day: number;
}

export function parseCalendarDateKey(dateKey: string): ParsedCalendarDate | null {
  if (!dateKey || typeof dateKey !== 'string') return null;
  const parts = dateKey.split('-');
  if (parts.length < 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parts[1];
  const day = parseInt(parts[2], 10);
  const monthIndex = MONTHS.indexOf(month);
  if (isNaN(year) || isNaN(day) || monthIndex === -1) return null;
  return { year, month, monthIndex, day };
}

export function parseDateInputOrKey(value: { year: number; month: string | number; day: number } | string): ParsedCalendarDate | null {
  if (typeof value === 'string') {
    return parseCalendarDateKey(value);
  }
  if (!value) return null;
  const monthIndex = typeof value.month === 'number' ? value.month : MONTHS.indexOf(value.month);
  const monthName = typeof value.month === 'number' ? MONTHS[value.month] : value.month;
  if (monthIndex === -1) return null;
  return {
    year: value.year,
    month: monthName,
    monthIndex,
    day: value.day
  };
}

export function compareCalendarDates(
  a: { year: number; month: string | number; day: number } | string,
  b: { year: number; month: string | number; day: number } | string
): number {
  const parsedA = parseDateInputOrKey(a);
  const parsedB = parseDateInputOrKey(b);
  if (!parsedA && !parsedB) return 0;
  if (!parsedA) return -1;
  if (!parsedB) return 1;

  if (parsedA.year !== parsedB.year) return parsedA.year - parsedB.year;
  if (parsedA.monthIndex !== parsedB.monthIndex) return parsedA.monthIndex - parsedB.monthIndex;
  return parsedA.day - parsedB.day;
}

export function isTriggerDue(calendar: WorldCalendarState, record: CalendarRecord): boolean {
  if (record.type !== 'trigger') return false;
  const targetDateKey = record.dateKey;
  if (!targetDateKey) return false;
  return compareCalendarDates(calendar, targetDateKey) >= 0;
}

export function formatDisplayDate(dateKey: string): string {
  const parsed = parseCalendarDateKey(dateKey);
  if (!parsed) return dateKey;
  return `${parsed.day}. ${parsed.month} ${parsed.year}`;
}
