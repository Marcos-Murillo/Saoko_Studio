'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import {
  getEventById,
  getEventCategories,
  getEventRegistrations,
  createEventRegistration,
} from '@/lib/services/event.service'
import { getDancers } from '@/lib/services/dancer.service'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/components/shared/Toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EventHeader } from '@/components/events/EventHeader'
import { FormField } from '@/components/shared/FormField'
import { SaokoCombobox } from '@/components/shared/SaokoCombobox'
import { EventRegStatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatCurrency } from '@/lib/utils/currency'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import type { Dancer, EventCategory, EventRegistration, StudioEvent } from '@/types'

export default function EventRegistrationsPage() {
  const { id } = useParams<{ id: string }>()
  const { adminUser } = useAuth()
  const toast = useToast()
  const [event, setEvent] = useState<StudioEvent | null>(null)
  const [categories, setCategories] = useState<EventCategory[]>([])
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [dancers, setDancers] = useState<Dancer[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [dancerId, setDancerId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')

  const eventId = Array.isArray(id) ? id[0] : id

  const load = async () => {
    if (!eventId) return
    setLoadError('')
    try {
      const [ev, cats, regs, ds] = await Promise.all([
        getEventById(eventId),
        getEventCategories(eventId),
        getEventRegistrations(eventId),
        getDancers(true),
      ])
      setEvent(ev)
      setCategories(cats)
      setRegistrations(regs)
      setDancers(ds)
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'No se pudo cargar las inscripciones')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [eventId])

  if (loading) return <PageLoader />
  if (loadError) {
    return <p className="text-sm" style={{ color: 'var(--destructive)' }}>{loadError}</p>
  }
  if (!event) return <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Evento no encontrado</p>

  const save = async () => {
    setError('')
    if (!adminUser) return
    if (!dancerId) { setError('Selecciona un bailarín'); return }
    if (!categoryId) { setError('Selecciona una categoría'); return }
    const dancer = dancers.find(d => d.id === dancerId)
    if (!dancer) { setError('Bailarín no encontrado'); return }
    setSaving(true)
    try {
      await createEventRegistration({
        eventId: eventId,
        dancerId,
        dancerName: dancer.fullName,
        categoryId,
      }, { id: adminUser.id, name: adminUser.name })
      toast('Inscripción registrada')
      setOpen(false)
      setDancerId(''); setCategoryId('')
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al inscribir')
    }
    setSaving(false)
  }

  const activeCats = categories.filter(c => c.status === 'active')

  return (
    <div className="flex flex-col gap-6">
      <EventHeader event={event} />
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}
          style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none' }}>
          <Plus size={15} />Inscribir bailarín
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          {registrations.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
              No hay inscripciones. Un bailarín puede inscribirse a varias categorías; el Full Pass se cobra una sola vez.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bailarín</TableHead>
                  <TableHead className="max-md:hidden">Categoría</TableHead>
                  <TableHead className="max-md:hidden">Full Pass</TableHead>
                  <TableHead className="max-md:hidden">Categoría $</TableHead>
                  <TableHead className="max-md:hidden">Total</TableHead>
                  <TableHead className="max-md:hidden">Pagado</TableHead>
                  <TableHead className="max-md:hidden">Pendiente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="saoko-col-action" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium min-w-0"><span className="truncate block">{r.dancerName}</span></TableCell>
                    <TableCell className="max-md:hidden">{r.categoryName}</TableCell>
                    <TableCell className="max-md:hidden">{formatCurrency(r.fullPassAmount)}</TableCell>
                    <TableCell className="max-md:hidden">{formatCurrency(r.categoryPrice)}</TableCell>
                    <TableCell className="max-md:hidden">{formatCurrency(r.totalDue)}</TableCell>
                    <TableCell className="max-md:hidden">{formatCurrency(r.amountPaid)}</TableCell>
                    <TableCell className="max-md:hidden">{formatCurrency(Math.max(0, r.totalDue - r.amountPaid))}</TableCell>
                    <TableCell><EventRegStatusBadge status={r.status} /></TableCell>
                    <TableCell className="saoko-col-action">
                      <TableRowMenu details={[
                        { label: 'Categoría', value: r.categoryName },
                        { label: 'Full Pass', value: formatCurrency(r.fullPassAmount) },
                        { label: 'Categoría $', value: formatCurrency(r.categoryPrice) },
                        { label: 'Total', value: formatCurrency(r.totalDue) },
                        { label: 'Pagado', value: formatCurrency(r.amountPaid) },
                      ]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" style={{ background: 'rgba(18,18,18,.92)', backdropFilter: 'blur(24px)' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--foreground)' }}>Nueva inscripción</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-8 flex flex-col gap-4">
            {open && (
            <>
            <FormField label="Bailarín" required>
              <SaokoCombobox
                options={dancers.map(d => ({ value: d.id, label: d.fullName || 'Sin nombre' }))}
                value={dancerId}
                onValueChange={setDancerId}
                placeholder="Seleccionar bailarín..."
              />
            </FormField>
            <FormField label="Categoría" required hint="Debe pertenecer a este evento">
              <SaokoCombobox
                options={activeCats.map(c => ({
                  value: c.id,
                  label: c.name,
                  description: formatCurrency(c.price),
                }))}
                value={categoryId}
                onValueChange={setCategoryId}
                placeholder={activeCats.length ? 'Seleccionar categoría...' : 'Crea una categoría primero'}
                disabled={!activeCats.length}
              />
            </FormField>
            {error && <p className="text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}
                style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                Cancelar
              </Button>
              <Button type="button" onClick={save} disabled={saving}
                style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none' }}>
                {saving ? 'Guardando...' : 'Inscribir'}
              </Button>
            </div>
            </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
