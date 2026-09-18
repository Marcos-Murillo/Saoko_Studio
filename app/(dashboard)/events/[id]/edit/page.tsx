'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEventById, updateEvent } from '@/lib/services/event.service'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/components/shared/Toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EventHeader } from '@/components/events/EventHeader'
import { EventForm } from '@/components/events/EventForm'
import { Card, CardContent } from '@/components/ui/card'
import { parseLocalDateInput, toDateInputValue } from '@/lib/utils/localDate'
import type { StudioEvent } from '@/types'

export default function EventEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { adminUser } = useAuth()
  const toast = useToast()
  const [event, setEvent] = useState<StudioEvent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getEventById(id).then(ev => { setEvent(ev); setLoading(false) })
  }, [id])

  if (loading) return <PageLoader />
  if (!event) return <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Evento no encontrado</p>

  return (
    <div className="flex flex-col gap-6">
      <EventHeader event={event} />
      <Card className="max-w-xl mx-auto w-full">
        <CardContent className="pt-6">
          <EventForm
            submitLabel="Guardar cambios"
            defaultValues={{
              name: event.name,
              eventDate: toDateInputValue(event.eventDate),
              fullPassPrice: String(event.fullPassPrice),
              status: event.status,
              notes: event.notes ?? '',
            }}
            onCancel={() => router.push(`/events/${id}`)}
            onSubmit={async data => {
              if (!adminUser) return
              const date = parseLocalDateInput(data.eventDate)
              if (!date) throw new Error('Fecha inválida')
              await updateEvent(id, {
                name: data.name,
                eventDate: date,
                fullPassPrice: Number(data.fullPassPrice),
                status: data.status,
                notes: data.notes,
              }, { id: adminUser.id, name: adminUser.name })
              toast('Evento actualizado')
              router.push(`/events/${id}`)
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
