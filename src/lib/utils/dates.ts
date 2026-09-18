import { Timestamp } from 'firebase/firestore'
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  differenceInYears,
  isValid,
} from 'date-fns'
import { es } from 'date-fns/locale'

export function toMillis(value: unknown): number {
  if (value == null) return 0
  const v = value as { toMillis?: () => number; toDate?: () => Date; seconds?: number }
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (typeof v.toDate === 'function') return v.toDate().getTime()
  if (typeof v.seconds === 'number') return v.seconds * 1000
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string' || typeof value === 'number') {
    const t = new Date(value).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  return 0
}

export function tsToDate(ts: Timestamp | Date | null | undefined): Date | null {
  if (!ts) return null
  const ms = toMillis(ts)
  if (!ms) return null
  const d = new Date(ms)
  return isValid(d) ? d : null
}

export function dateToTs(date: Date): Timestamp {
  return Timestamp.fromDate(date)
}

export function formatDate(ts: unknown): string {
  const d = tsToDate(ts as Timestamp | Date | null | undefined)
  if (!d || !isValid(d)) return '—'
  return format(d, 'dd/MM/yyyy', { locale: es })
}

export function formatDateTime(ts: Timestamp | null | undefined): string {
  const d = tsToDate(ts)
  if (!d || !isValid(d)) return '—'
  return format(d, 'dd/MM/yyyy HH:mm', { locale: es })
}

export function formatMonth(year: number, month: number): string {
  const d = new Date(year, month - 1, 1)
  return format(d, 'MMMM yyyy', { locale: es })
}

export function formatMonthShort(year: number, month: number): string {
  const d = new Date(year, month - 1, 1)
  return format(d, 'MMM yy', { locale: es })
}

export function getAge(birthDate: Timestamp | null | undefined): number {
  const d = tsToDate(birthDate)
  if (!d) return 0
  return differenceInYears(new Date(), d)
}

export function currentYearMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function monthStart(year: number, month: number): Date {
  return startOfMonth(new Date(year, month - 1, 1))
}

export function monthEnd(year: number, month: number): Date {
  return endOfMonth(new Date(year, month - 1, 1))
}

export function isoToTs(isoString: string): Timestamp {
  return Timestamp.fromDate(parseISO(isoString))
}

export function semesterRange(year: number, half: 1 | 2): { start: Date; end: Date; months: number[] } {
  if (half === 1) {
    return { start: monthStart(year, 1), end: monthEnd(year, 6), months: [1, 2, 3, 4, 5, 6] }
  }
  return { start: monthStart(year, 7), end: monthEnd(year, 12), months: [7, 8, 9, 10, 11, 12] }
}

export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfWeekMonday(date: Date): Date {
  const s = startOfWeekMonday(date)
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6, 23, 59, 59, 999)
}

export function startOfYear(year: number): Date {
  return new Date(year, 0, 1, 0, 0, 0, 0)
}

export function endOfYear(year: number): Date {
  return new Date(year, 11, 31, 23, 59, 59, 999)
}

export function monthsOverlapping(start: Date, end: Date): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = []
  let y = start.getFullYear()
  let m = start.getMonth() + 1
  const ey = end.getFullYear()
  const em = end.getMonth() + 1
  while (y < ey || (y === ey && m <= em)) {
    out.push({ year: y, month: m })
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return out
}
