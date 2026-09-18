'use client'
import { useEffect, useMemo, useState } from 'react'
import { FormField } from '@/components/shared/FormField'
import { SaokoCombobox } from '@/components/shared/SaokoCombobox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/currency'
import { CONCEPT_LABEL } from '@/lib/services/event.service'
import { DatePicker } from '@/components/shared/DatePicker'
import type { EventPaymentConcept, EventRegistration, PaymentMethod } from '@/types'

const inputStyle = { background: 'var(--accent)', borderColor: 'var(--border)', color: 'var(--foreground)' }

export function EventPaymentForm({
  registrations,
  methods,
  eventName,
  lockedDancerId,
  onSubmit,
  onClose,
}: {
  registrations: EventRegistration[]
  methods: PaymentMethod[]
  eventName?: string
  lockedDancerId?: string
  onSubmit: (data: {
    registrationId: string
    concept: EventPaymentConcept
    amount: number
    paymentDate: string
    paymentMethodId: string
    notes: string
  }) => Promise<void>
  onClose: () => void
}) {
  const dancers = useMemo(() => {
    const map = new Map<string, string>()
    registrations.forEach(r => map.set(r.dancerId, r.dancerName ?? r.dancerId))
    return [...map.entries()].map(([value, label]) => ({ value, label }))
  }, [registrations])

  const [dancerId, setDancerId] = useState(lockedDancerId ?? '')
  const [registrationId, setRegistrationId] = useState('')
  const [concept, setConcept] = useState<EventPaymentConcept>('category')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [methodId, setMethodId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const dancerRegs = registrations.filter(r => r.dancerId === dancerId)
  const selected = dancerRegs.find(r => r.id === registrationId)
  const remaining = selected ? Math.max(0, selected.totalDue - selected.amountPaid) : 0

  useEffect(() => {
    if (lockedDancerId) setDancerId(lockedDancerId)
  }, [lockedDancerId])

  useEffect(() => {
    if (dancerRegs.length === 1) setRegistrationId(dancerRegs[0].id)
  }, [dancerId])

  useEffect(() => {
    if (selected) setAmount(String(remaining))
  }, [registrationId])

  const handle = async () => {
    setError('')
    const value = Number(amount)
    if (!dancerId) { setError('Selecciona un bailarín'); return }
    if (!registrationId) { setError('Selecciona una inscripción'); return }
    if (!(value > 0)) { setError('El valor debe ser mayor a 0'); return }
    if (value > remaining) { setError(`El saldo pendiente es ${formatCurrency(remaining)}`); return }
    if (!date) { setError('Fecha inválida'); return }
    if (!methodId) { setError('Selecciona un método de pago'); return }
    setSaving(true)
    try {
      await onSubmit({ registrationId, concept, amount: value, paymentDate: date, paymentMethodId: methodId, notes })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar')
      setSaving(false)
      return
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {eventName && (
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Evento: <span style={{ color: 'var(--foreground)' }}>{eventName}</span></p>
      )}
      <FormField label="Bailarín" required>
        <SaokoCombobox options={dancers} value={dancerId} onValueChange={v => { setDancerId(v); setRegistrationId('') }} placeholder="Seleccionar bailarín..." />
      </FormField>
      <FormField label="Inscripción" required hint="Usuario + categoría del evento">
        <SaokoCombobox
          options={dancerRegs.map(r => ({
            value: r.id,
            label: r.categoryName ?? 'Categoría',
            description: `Total ${formatCurrency(r.totalDue)} · Pagado ${formatCurrency(r.amountPaid)} · Pendiente ${formatCurrency(Math.max(0, r.totalDue - r.amountPaid))}`,
          }))}
          value={registrationId}
          onValueChange={setRegistrationId}
          placeholder={dancerId ? 'Seleccionar inscripción...' : 'Elige un bailarín primero'}
          disabled={!dancerId}
        />
      </FormField>

      {selected && (
        <div className="rounded-xl p-3 text-xs flex flex-col gap-1" style={{ background: 'rgba(201,168,76,.08)', color: 'var(--foreground)' }}>
          <p>Full Pass: {formatCurrency(selected.fullPassAmount)}</p>
          <p>Categoría: {formatCurrency(selected.categoryPrice)}</p>
          <p className="font-semibold">Total: {formatCurrency(selected.totalDue)}</p>
          <p>Pagado: {formatCurrency(selected.amountPaid)}</p>
          <p style={{ color: remaining > 0 ? '#e05252' : '#4caf7d' }}>Pendiente: {formatCurrency(remaining)}</p>
        </div>
      )}

      <FormField label="Concepto" required>
        <SaokoCombobox
          options={(Object.keys(CONCEPT_LABEL) as EventPaymentConcept[]).map(k => ({ value: k, label: CONCEPT_LABEL[k] }))}
          value={concept}
          onValueChange={v => setConcept(v as EventPaymentConcept)}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Valor pagado" required>
          <Input type="number" min={1} style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} />
        </FormField>
        <FormField label="Fecha" required>
          <DatePicker value={date} onChange={setDate} />
        </FormField>
      </div>
      <FormField label="Método de pago" required>
        <SaokoCombobox
          options={methods.map(m => ({ value: m.id, label: m.name }))}
          value={methodId}
          onValueChange={setMethodId}
          placeholder="Seleccionar método..."
        />
      </FormField>
      <FormField label="Observaciones">
        <Input style={inputStyle} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" />
      </FormField>
      {error && <p className="text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}
          style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
          Cancelar
        </Button>
        <Button type="button" onClick={handle} disabled={saving || remaining <= 0}
          style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none' }}>
          {saving ? 'Registrando...' : 'Registrar pago'}
        </Button>
      </div>
    </div>
  )
}
