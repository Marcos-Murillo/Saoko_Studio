'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Users, CheckCircle2, Clock, Wallet, AlertCircle } from 'lucide-react'
import { getEventById, getEventStats } from '@/lib/services/event.service'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EventHeader } from '@/components/events/EventHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { LinkButton } from '@/components/shared/LinkButton'
import { formatCurrency } from '@/lib/utils/currency'
import { formatEventHeading } from '@/lib/utils/localDate'
import type { EventStats, StudioEvent } from '@/types'

export default function EventOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<StudioEvent | null>(null)
  const [stats, setStats] = useState<EventStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getEventById(id), getEventStats(id)]).then(([ev, st]) => {
      setEvent(ev)
      setStats(st)
      setLoading(false)
    })
  }, [id])

  if (loading) return <PageLoader />
  if (!event) return <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Evento no encontrado</p>

  return (
    <div className="flex flex-col gap-6">
      <EventHeader event={event} />

      <div className="rounded-2xl p-6" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--gold)' }}>Resumen</p>
        <h2 className="text-2xl font-bold mt-1 uppercase" style={{ color: 'var(--foreground)' }}>{event.name}</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>{formatEventHeading(event.eventDate)}</p>
        <p className="text-lg mt-4" style={{ color: 'var(--gold)' }}>Full Pass: {formatCurrency(event.fullPassPrice)}</p>
      </div>

      {stats && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 md:gap-4">
          <KpiCard title="Inscritos" value={String(stats.registeredDancers)} subtitle={`${stats.registrations} inscripciones`} icon={Users} />
          <KpiCard title="Pagados" value={String(stats.paidDancers)} icon={CheckCircle2} color="#4caf7d" />
          <KpiCard title="Pendientes" value={String(stats.pendingDancers)} icon={Clock} color="#e8a030" />
          <KpiCard title="Recaudado" value={formatCurrency(stats.collected)} icon={Wallet} />
          <KpiCard title="Pendiente" value={formatCurrency(stats.outstanding)} icon={AlertCircle} color="#e05252" />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <LinkButton href={`/events/${id}/categories`} variant="outline">Categorías</LinkButton>
        <LinkButton href={`/events/${id}/registrations`} variant="outline">Inscripciones</LinkButton>
        <LinkButton href={`/events/${id}/payments`} variant="primary">Registrar pago</LinkButton>
        <LinkButton href={`/events/${id}/payments`} variant="outline">Historial de pagos</LinkButton>
        <LinkButton href={`/events/${id}/stats`} variant="outline">Estadísticas</LinkButton>
        <LinkButton href={`/events/${id}/edit`} variant="outline">Editar</LinkButton>
      </div>
    </div>
  )
}
