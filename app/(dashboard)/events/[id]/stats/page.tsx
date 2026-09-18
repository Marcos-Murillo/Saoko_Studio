'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Users, CheckCircle2, Clock, Wallet, AlertCircle, Layers } from 'lucide-react'
import { getEventById, getEventRegistrations, getEventStats } from '@/lib/services/event.service'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EventHeader } from '@/components/events/EventHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { EventRegStatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import type { EventRegistration, EventStats, StudioEvent } from '@/types'

export default function EventStatsPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<StudioEvent | null>(null)
  const [stats, setStats] = useState<EventStats | null>(null)
  const [regs, setRegs] = useState<EventRegistration[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getEventById(id), getEventStats(id), getEventRegistrations(id)]).then(([ev, st, r]) => {
      setEvent(ev)
      setStats(st)
      setRegs(r)
      setLoading(false)
    })
  }, [id])

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; count: number; collected: number; outstanding: number }>()
    for (const r of regs) {
      const cur = map.get(r.categoryId) ?? { name: r.categoryName ?? 'Categoría', count: 0, collected: 0, outstanding: 0 }
      cur.count++
      cur.collected += r.amountPaid
      cur.outstanding += Math.max(0, r.totalDue - r.amountPaid)
      map.set(r.categoryId, cur)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [regs])

  if (loading) return <PageLoader />
  if (!event) return <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Evento no encontrado</p>

  return (
    <div className="flex flex-col gap-6">
      <EventHeader event={event} />
      {stats && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 md:gap-4">
          <KpiCard title="Inscritos" value={String(stats.registeredDancers)} subtitle={`${stats.registrations} inscripciones`} icon={Users} />
          <KpiCard title="Pagados" value={String(stats.paidDancers)} icon={CheckCircle2} color="#4caf7d" />
          <KpiCard title="Pendientes" value={String(stats.pendingDancers)} icon={Clock} color="#e8a030" />
          <KpiCard title="Recaudado" value={formatCurrency(stats.collected)} icon={Wallet} />
          <KpiCard title="Pendiente" value={formatCurrency(stats.outstanding)} icon={AlertCircle} color="#e05252" />
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Layers size={16} /> Por categoría
          </p>
          {byCategory.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--muted-foreground)' }}>Sin datos aún</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="max-md:hidden">Inscripciones</TableHead>
                  <TableHead>Recaudado</TableHead>
                  <TableHead className="max-md:hidden">Pendiente</TableHead>
                  <TableHead className="saoko-col-action" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCategory.map(row => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium min-w-0"><span className="truncate block">{row.name}</span></TableCell>
                    <TableCell className="max-md:hidden">{row.count}</TableCell>
                    <TableCell>{formatCurrency(row.collected)}</TableCell>
                    <TableCell className="max-md:hidden">{formatCurrency(row.outstanding)}</TableCell>
                    <TableCell className="saoko-col-action">
                      <TableRowMenu details={[
                        { label: 'Inscripciones', value: String(row.count) },
                        { label: 'Pendiente', value: formatCurrency(row.outstanding) },
                      ]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Inscripciones</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bailarín</TableHead>
                <TableHead className="max-md:hidden">Categoría</TableHead>
                <TableHead className="max-md:hidden">Total</TableHead>
                <TableHead className="max-md:hidden">Pagado</TableHead>
                <TableHead className="max-md:hidden">Pendiente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="saoko-col-action" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {regs.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="min-w-0"><span className="truncate block">{r.dancerName}</span></TableCell>
                  <TableCell className="max-md:hidden">{r.categoryName}</TableCell>
                  <TableCell className="max-md:hidden">{formatCurrency(r.totalDue)}</TableCell>
                  <TableCell className="max-md:hidden">{formatCurrency(r.amountPaid)}</TableCell>
                  <TableCell className="max-md:hidden">{formatCurrency(Math.max(0, r.totalDue - r.amountPaid))}</TableCell>
                  <TableCell><EventRegStatusBadge status={r.status} /></TableCell>
                  <TableCell className="saoko-col-action">
                    <TableRowMenu details={[
                      { label: 'Categoría', value: r.categoryName },
                      { label: 'Total', value: formatCurrency(r.totalDue) },
                      { label: 'Pagado', value: formatCurrency(r.amountPaid) },
                    ]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
