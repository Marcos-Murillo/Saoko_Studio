'use client'
import { EventNav } from '@/components/events/EventNav'
import { formatEventHeading } from '@/lib/utils/localDate'
import { formatCurrency } from '@/lib/utils/currency'
import { EVENT_STATUS_LABEL } from '@/lib/services/event.service'
import type { StudioEvent } from '@/types'

export function EventHeader({ event }: { event: StudioEvent }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--gold)' }}>
          {EVENT_STATUS_LABEL[event.status]}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-wide uppercase" style={{ color: 'var(--foreground)' }}>
          {event.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          {formatEventHeading(event.eventDate)} · Full Pass {formatCurrency(event.fullPassPrice)}
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
          Los pagos de este módulo no se suman a la caja ni a la contabilidad de Saoko.
        </p>
      </div>
      <EventNav eventId={event.id} />
    </div>
  )
}
