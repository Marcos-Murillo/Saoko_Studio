'use client'
import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  startOfWeekMonday, endOfWeekMonday, monthStart, monthEnd, startOfYear, endOfYear,
} from '@/lib/utils/dates'

export type PeriodMode = 'week' | 'month' | 'year'

export function periodBounds(mode: PeriodMode, date: Date) {
  if (mode === 'week') return { start: startOfWeekMonday(date), end: endOfWeekMonday(date) }
  if (mode === 'year') return { start: startOfYear(date.getFullYear()), end: endOfYear(date.getFullYear()) }
  return { start: monthStart(date.getFullYear(), date.getMonth() + 1), end: monthEnd(date.getFullYear(), date.getMonth() + 1) }
}

export function periodLabel(mode: PeriodMode, date: Date) {
  const { start, end } = periodBounds(mode, date)
  if (mode === 'week') {
    return `Semana ${format(start, 'd MMM', { locale: es })} – ${format(end, 'd MMM yyyy', { locale: es })}`
  }
  if (mode === 'year') return `Año ${date.getFullYear()}`
  return format(date, 'MMMM yyyy', { locale: es })
}

export function PeriodFilter({
  mode,
  date,
  onModeChange,
  onDateChange,
}: {
  mode: PeriodMode
  date: Date
  onModeChange: (mode: PeriodMode) => void
  onDateChange: (date: Date) => void
}) {
  const [open, setOpen] = useState(false)
  const modes: { id: PeriodMode; label: string }[] = [
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'year', label: 'Año' },
  ]
  const label = useMemo(() => periodLabel(mode, date), [mode, date])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {modes.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => onModeChange(m.id)}
            className="px-3 py-2 text-sm"
            style={{
              background: mode === m.id ? 'rgba(201,168,76,.18)' : 'transparent',
              color: mode === m.id ? 'var(--gold)' : 'var(--muted-foreground)',
              fontWeight: mode === m.id ? 600 : 400,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="h-8 gap-2"
              style={{ background: '#1565c0', color: '#fff', border: 'none' }}
            />
          }
        >
          <CalendarIcon size={14} />
          {label}
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto p-2"
          style={{ background: 'var(--popover)', border: '1px solid var(--border)' }}
        >
          <Calendar
            mode="single"
            selected={date}
            onSelect={d => { if (d) { onDateChange(d); setOpen(false) } }}
            locale={es}
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
