'use client'
import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getDancerById } from '@/lib/services/dancer.service'
import { getDancerMemberships } from '@/lib/services/group.service'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatDate } from '@/lib/utils/dates'
import { formatCurrency } from '@/lib/utils/currency'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import type { GroupMembership, Dancer } from '@/types'

export default function DancerHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [dancer, setDancer] = useState<Dancer | null>(null)
  const [memberships, setMemberships] = useState<GroupMembership[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDancerById(id), getDancerMemberships(id)]).then(([d, m]) => {
      setDancer(d); setMemberships(m); setLoading(false)
    })
  }, [id])

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <Link href={`/dancers/${id}`} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Volver a {dancer?.fullName}
      </Link>

      <div className="card overflow-hidden">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Historial de grupos</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>{memberships.length} registro(s)</p>
        </div>

        {memberships.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sin historial de grupos</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th className="max-md:hidden">Inicio</th>
                <th className="max-md:hidden">Fin</th>
                <th className="max-md:hidden">Mensualidad al ingreso</th>
                <th>Estado</th>
                <th className="saoko-col-action"></th>
              </tr>
            </thead>
            <tbody>
              {memberships.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }} className="min-w-0"><span className="truncate block">{m.groupName}</span></td>
                  <td className="max-md:hidden" style={{ color: 'var(--text-secondary)' }}>{formatDate(m.startDate)}</td>
                  <td className="max-md:hidden" style={{ color: 'var(--text-secondary)' }}>{m.endDate ? formatDate(m.endDate) : '—'}</td>
                  <td className="max-md:hidden" style={{ color: 'var(--gold)', fontWeight: 500 }}>{formatCurrency(m.monthlyFeeSnapshot)}</td>
                  <td>{m.isCurrent ? <span className="badge-paid">Actual</span> : <span className="badge-pending">Histórico</span>}</td>
                  <td className="saoko-col-action">
                    <TableRowMenu details={[
                      { label: 'Inicio', value: formatDate(m.startDate) },
                      { label: 'Fin', value: m.endDate ? formatDate(m.endDate) : '—' },
                      { label: 'Mensualidad', value: formatCurrency(m.monthlyFeeSnapshot) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
