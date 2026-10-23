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

function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return null
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000)
  return isValid(d) ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12) : null
}

function parseBirthString(raw: string): Date | null {
  const value = raw.trim()
  if (!value) return null
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12)
    return isValid(d) ? d : null
  }
  const dmy = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (dmy) {
    let day = Number(dmy[1])
    let month = Number(dmy[2])
    let year = Number(dmy[3])
    if (year < 100) year += year <= 30 ? 2000 : 1900
    if (day <= 12 && month > 12) {
      const tmp = day
      day = month
      month = tmp
    }
    const d = new Date(year, month - 1, day, 12)
    return isValid(d) && d.getDate() === day ? d : null
  }
  const parsed = new Date(value)
  return isValid(parsed) ? parsed : null
}

export function tsToDate(ts: unknown): Date | null {
  if (ts == null || ts === '') return null
  if (typeof ts === 'number') {
    const fromExcel = excelSerialToDate(ts)
    if (fromExcel) return fromExcel
  }
  if (typeof ts === 'string') {
    const fromText = parseBirthString(ts)
    if (fromText) return fromText
  }
  const ms = toMillis(ts)
  if (!ms) return null
  const d = new Date(ms)
  return isValid(d) ? d : null
}

export function dateToTs(date: Date): Timestamp {
  return Timestamp.fromDate(date)
}

export function formatDate(ts: unknown): string {
  const d = tsToDate(ts)
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

export function getAge(birthDate: unknown): number {
  const d = tsToDate(birthDate)
  if (!d || d.getFullYear() < 1920) return 0
  const age = differenceInYears(new Date(), d)
  if (age < 0 || age > 120) return 0
  return age
}

export function formatAge(birthDate: unknown): string {
  const d = tsToDate(birthDate)
  if (!d || d.getFullYear() < 1920) return ''
  const age = differenceInYears(new Date(), d)
  if (age < 0 || age > 120) return ''
  return `${age} año${age === 1 ? '' : 's'}`
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
