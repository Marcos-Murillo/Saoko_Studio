'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Ticket, Eye, Pencil, BarChart3, FileSpreadsheet } from 'lucide-react'
import { getEvents, createEvent, EVENT_STATUS_LABEL } from '@/lib/services/event.service'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/components/shared/Toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { LinkButton } from '@/components/shared/LinkButton'
import { EventForm } from '@/components/events/EventForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDate } from '@/lib/utils/dates'
import { parseLocalDateInput } from '@/lib/utils/localDate'
import { formatCurrency } from '@/lib/utils/currency'
import { BTN } from '@/components/shared/buttonStyles'
import { downloadEventRosterExcel } from '@/lib/utils/eventRosterExcel'
import type { StudioEvent } from '@/types'

export default function EventsPage() {
  const router = useRouter()
  const { adminUser } = useAuth()
  const toast = useToast()
  const [events, setEvents] = useState<StudioEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)

  const exportRoster = async (ev: StudioEvent) => {
    setExportingId(ev.id)
    try {
      await downloadEventRosterExcel(ev)
      toast('Excel descargado')
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'No se pudo generar el Excel', 'error')
    }
    setExportingId(null)
  }

  const load = async () => {
    setEvents(await getEvents())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-6 max-w-[1400px]">
      <PageHeader
        title="Eventos"
        description="Festivales y competencias. Los pagos de eventos no entran a la caja de Saoko."
        action={
          <Button onClick={() => setOpen(true)}
            style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none' }}>
            <Plus size={15} />Nuevo evento
          </Button>
        }
      />

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 gap-3">
            <Ticket size={36} style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Aún no hay eventos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map(ev => (
            <Card key={ev.id}>
              <CardContent className="pt-5 flex flex-col gap-4">
                <div>
                  <p className="font-semibold text-base" style={{ color: 'var(--foreground)' }}>{ev.name}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{formatDate(ev.eventDate)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--gold)' }}>Full Pass {formatCurrency(ev.fullPassPrice)}</span>
                  <Badge variant="outline" style={{
                    color: ev.status === 'active' ? '#4caf7d' : 'var(--muted-foreground)',
                    borderColor: 'var(--glass-border)',
                  }}>
                    {EVENT_STATUS_LABEL[ev.status]}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <LinkButton href={`/events/${ev.id}`} variant="primary" size="sm">
                    <Eye size={13} />Ver evento
                  </LinkButton>
                  <LinkButton href={`/events/${ev.id}/edit`} variant="outline" size="sm">
                    <Pencil size={13} />Editar
                  </LinkButton>
                  <LinkButton href={`/events/${ev.id}/stats`} variant="outline" size="sm">
                    <BarChart3 size={13} />Estadísticas
                  </LinkButton>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={exportingId === ev.id}
                    onClick={() => exportRoster(ev)}
                    style={BTN.excel}
                  >
                    <FileSpreadsheet size={13} />
                    {exportingId === ev.id ? 'Generando...' : 'Excel'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" style={{ background: 'rgba(18,18,18,.92)', backdropFilter: 'blur(24px)', overflowY: 'auto' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--foreground)' }}>Nuevo evento</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-8">
            <EventForm
              submitLabel="Crear evento"
              onCancel={() => setOpen(false)}
              onSubmit={async data => {
                if (!adminUser) return
                const date = parseLocalDateInput(data.eventDate)
                if (!date) throw new Error('Fecha inválida')
                const eventId = await createEvent({
                  name: data.name,
                  eventDate: date,
                  fullPassPrice: Number(data.fullPassPrice),
                  status: data.status,
                  notes: data.notes,
                }, { id: adminUser.id, name: adminUser.name })
                toast('Evento creado')
                setOpen(false)
                router.push(`/events/${eventId}`)
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
