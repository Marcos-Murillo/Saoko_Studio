'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import {
  CONCEPT_LABEL,
  getEventById,
  getEventPayments,
  getEventRegistrations,
  registerEventPayment,
} from '@/lib/services/event.service'
import { getPaymentMethods } from '@/lib/services/catalog.service'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/components/shared/Toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EventHeader } from '@/components/events/EventHeader'
import { EventPaymentForm } from '@/components/events/EventPaymentForm'
import { FormField } from '@/components/shared/FormField'
import { SaokoCombobox } from '@/components/shared/SaokoCombobox'
import { DateRangePicker } from '@/components/shared/DatePicker'
import { EventRegStatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, toMillis } from '@/lib/utils/dates'
import { parseLocalDateInput } from '@/lib/utils/localDate'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import type { EventPayment, EventRegistration, PaymentMethod, StudioEvent } from '@/types'

const inputStyle = { background: 'var(--accent)', borderColor: 'var(--border)', color: 'var(--foreground)' }

export default function EventPaymentsPage() {
  const { id } = useParams<{ id: string }>()
  const { adminUser } = useAuth()
  const toast = useToast()
  const [event, setEvent] = useState<StudioEvent | null>(null)
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [payments, setPayments] = useState<EventPayment[]>([])
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const [dancerFilter, setDancerFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = async () => {
    const [ev, regs, pays, mets] = await Promise.all([
      getEventById(id),
      getEventRegistrations(id),
      getEventPayments(id),
      getPaymentMethods(true),
    ])
    setEvent(ev)
    setRegistrations(regs)
    setPayments(pays)
    setMethods(mets)
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  const dancers = useMemo(() => {
    const map = new Map<string, string>()
    registrations.forEach(r => map.set(r.dancerId, r.dancerName ?? r.dancerId))
    return [...map.entries()].map(([value, label]) => ({ value, label }))
  }, [registrations])

  const categories = useMemo(() => {
    const map = new Map<string, string>()
    registrations.forEach(r => map.set(r.categoryId, r.categoryName ?? r.categoryId))
    return [...map.entries()].map(([value, label]) => ({ value, label }))
  }, [registrations])

  const filtered = payments.filter(p => {
    if (dancerFilter && p.dancerId !== dancerFilter) return false
    if (categoryFilter && p.categoryId !== categoryFilter) return false
    const reg = registrations.find(r => r.id === p.registrationId)
    if (statusFilter && reg?.status !== statusFilter) return false
    const ms = toMillis(p.paymentDate)
    if (fromDate) {
      const from = parseLocalDateInput(fromDate)
      if (from && ms < from.getTime()) return false
    }
    if (toDate) {
      const to = parseLocalDateInput(toDate)
      if (to && ms > to.getTime() + 24 * 60 * 60 * 1000 - 1) return false
    }
    return true
  })

  if (loading) return <PageLoader />
  if (!event) return <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Evento no encontrado</p>

  return (
    <div className="flex flex-col gap-6">
      <EventHeader event={event} />
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}
          style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none' }}>
          <Plus size={15} />Registrar pago
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <FormField label="Usuario">
              <SaokoCombobox options={dancers} value={dancerFilter} onValueChange={setDancerFilter} placeholder="Todos" />
            </FormField>
            <FormField label="Categoría">
              <SaokoCombobox options={categories} value={categoryFilter} onValueChange={setCategoryFilter} placeholder="Todas" />
            </FormField>
            <FormField label="Estado de pago">
              <SaokoCombobox
                options={[
                  { value: 'pending', label: 'Pendiente' },
                  { value: 'partial', label: 'Parcial' },
                  { value: 'paid', label: 'Pagado' },
                ]}
                value={statusFilter}
                onValueChange={setStatusFilter}
                placeholder="Todos"
              />
            </FormField>
            <FormField label="Fecha">
              <DateRangePicker from={fromDate} to={toDate} onChange={(a, b) => { setFromDate(a); setToDate(b) }} />
            </FormField>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Evento filtrado: {event.name}. Este dinero no entra a la contabilidad de Saoko.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
              No hay pagos con esos filtros.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="max-md:hidden">Evento</TableHead>
                  <TableHead className="max-md:hidden">Categoría</TableHead>
                  <TableHead className="max-md:hidden">Concepto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="max-md:hidden">Fecha</TableHead>
                  <TableHead className="max-md:hidden">Método</TableHead>
                  <TableHead className="max-md:hidden">Estado insc.</TableHead>
                  <TableHead className="saoko-col-action" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const reg = registrations.find(r => r.id === p.registrationId)
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium min-w-0"><span className="truncate block">{p.dancerName}</span></TableCell>
                      <TableCell className="max-md:hidden">{p.eventName}</TableCell>
                      <TableCell className="max-md:hidden">{p.categoryName}</TableCell>
                      <TableCell className="max-md:hidden">{CONCEPT_LABEL[p.concept]}</TableCell>
                      <TableCell>{formatCurrency(p.amount)}</TableCell>
                      <TableCell className="max-md:hidden">{formatDate(p.paymentDate)}</TableCell>
                      <TableCell className="max-md:hidden">{p.paymentMethodName}</TableCell>
                      <TableCell className="max-md:hidden">{reg ? <EventRegStatusBadge status={reg.status} /> : '—'}</TableCell>
                      <TableCell className="saoko-col-action">
                        <TableRowMenu details={[
                          { label: 'Categoría', value: p.categoryName },
                          { label: 'Concepto', value: CONCEPT_LABEL[p.concept] },
                          { label: 'Fecha', value: formatDate(p.paymentDate) },
                          { label: 'Método', value: p.paymentMethodName },
                        ]} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" style={{ background: 'rgba(18,18,18,.92)', backdropFilter: 'blur(24px)', overflowY: 'auto' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--foreground)' }}>Registrar pago</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-8">
            {registrations.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Primero inscribe a un bailarín. El pago siempre se asocia a una inscripción concreta.
              </p>
            ) : (
              <EventPaymentForm
                registrations={registrations}
                methods={methods}
                eventName={event.name}
                onClose={() => setOpen(false)}
                onSubmit={async data => {
                  if (!adminUser) return
                  const date = parseLocalDateInput(data.paymentDate)
                  if (!date) throw new Error('Fecha inválida')
                  const method = methods.find(m => m.id === data.paymentMethodId)
                  await registerEventPayment({
                    registrationId: data.registrationId,
                    concept: data.concept,
                    amount: data.amount,
                    paymentDate: date,
                    paymentMethodId: data.paymentMethodId,
                    paymentMethodName: method?.name ?? '',
                    notes: data.notes,
                  }, { id: adminUser.id, name: adminUser.name })
                  toast('Pago registrado (no entra a caja Saoko)')
                  setOpen(false)
                  await load()
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
