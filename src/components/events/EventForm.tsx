'use client'
import { useState } from 'react'
import { FormField } from '@/components/shared/FormField'
import { SaokoCombobox } from '@/components/shared/SaokoCombobox'
import { DatePicker } from '@/components/shared/DatePicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EVENT_STATUS_LABEL } from '@/lib/services/event.service'
import type { EventStatus } from '@/types'

const inputStyle = { background: 'var(--accent)', borderColor: 'var(--border)', color: 'var(--foreground)' }

export interface EventFormValues {
  name: string
  eventDate: string
  fullPassPrice: string
  status: EventStatus
  notes: string
}

export function EventForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Partial<EventFormValues>
  submitLabel: string
  onSubmit: (data: EventFormValues) => Promise<void>
  onCancel?: () => void
}) {
  const [name, setName] = useState(defaultValues?.name ?? '')
  const [eventDate, setEventDate] = useState(defaultValues?.eventDate ?? '')
  const [fullPassPrice, setFullPassPrice] = useState(defaultValues?.fullPassPrice ?? '')
  const [status, setStatus] = useState<EventStatus>(defaultValues?.status ?? 'active')
  const [notes, setNotes] = useState(defaultValues?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handle = async () => {
    setError('')
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (!eventDate) { setError('La fecha es obligatoria'); return }
    const price = Number(fullPassPrice)
    if (Number.isNaN(price) || price < 0) { setError('Full Pass inválido'); return }
    setSaving(true)
    try {
      await onSubmit({ name, eventDate, fullPassPrice: String(price), status, notes })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Nombre del evento" required>
        <Input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Cali Salsa Festival" />
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Fecha" required>
          <DatePicker value={eventDate} onChange={setEventDate} />
        </FormField>
        <FormField label="Precio Full Pass (COP)" required>
          <Input type="number" min={0} style={inputStyle} value={fullPassPrice} onChange={e => setFullPassPrice(e.target.value)} placeholder="150000" />
        </FormField>
      </div>
      <FormField label="Estado">
        <SaokoCombobox
          options={(Object.keys(EVENT_STATUS_LABEL) as EventStatus[]).map(k => ({ value: k, label: EVENT_STATUS_LABEL[k] }))}
          value={status}
          onValueChange={v => setStatus(v as EventStatus)}
        />
      </FormField>
      <FormField label="Notas">
        <Input style={inputStyle} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" />
      </FormField>
      {error && <p className="text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}
            style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
            Cancelar
          </Button>
        )}
        <Button type="button" onClick={handle} disabled={saving}
          style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none' }}>
          {saving ? 'Guardando...' : submitLabel}
        </Button>
      </div>
    </div>
  )
}
