'use client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { parseLocalDateInput } from '@/lib/utils/localDate'
import type { DateRange } from 'react-day-picker'

function toIso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const selected = parseLocalDateInput(value) ?? undefined
  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 font-normal h-11 md:h-8"
            style={{
              background: 'var(--accent)',
              borderColor: 'var(--border)',
              color: value ? 'var(--foreground)' : 'var(--muted-foreground)',
            }}
          />
        }
      >
        <CalendarIcon size={14} />
        {selected ? format(selected, 'dd/MM/yyyy', { locale: es }) : placeholder}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-2"
        style={{ background: 'var(--popover)', border: '1px solid var(--border)' }}
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={d => { if (d) onChange(toIso(d)) }}
          locale={es}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  )
}

export function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}) {
  const range: DateRange | undefined = {
    from: parseLocalDateInput(from) ?? undefined,
    to: parseLocalDateInput(to) ?? undefined,
  }
  const label = range.from && range.to
    ? `${format(range.from, 'dd/MM/yyyy', { locale: es })} – ${format(range.to, 'dd/MM/yyyy', { locale: es })}`
    : range.from
      ? format(range.from, 'dd/MM/yyyy', { locale: es })
      : 'Rango de fechas'

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2 font-normal h-11 md:h-8 w-full max-w-full md:w-auto"
            style={{
              background: 'var(--accent)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
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
          mode="range"
          selected={range}
          onSelect={r => {
            onChange(r?.from ? toIso(r.from) : '', r?.to ? toIso(r.to) : r?.from ? toIso(r.from) : '')
          }}
          locale={es}
          captionLayout="dropdown"
          numberOfMonths={1}
        />
      </PopoverContent>
    </Popover>
  )
}
