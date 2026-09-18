import { format, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { Timestamp } from 'firebase/firestore'
import { tsToDate } from '@/lib/utils/dates'

/** Convierte `yyyy-MM-dd` del input date a Date local (mediodía, evita desfase UTC). */
export function parseLocalDateInput(value: string): Date | null {
  if (!value) return null
  const parts = value.split('-')
  if (parts.length !== 3) return null
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d, 12, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

export function toDateInputValue(value: unknown): string {
  const d = tsToDate(value as Timestamp | Date | null | undefined)
  if (!d) return ''
  return format(d, 'yyyy-MM-dd')
}

export function formatEventHeading(value: unknown): string {
  const d = tsToDate(value as Timestamp | Date | null | undefined)
  if (!d || !isValid(d)) return '—'
  return format(d, 'd MMM yyyy', { locale: es }).toUpperCase()
}
