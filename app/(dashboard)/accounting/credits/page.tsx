'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { getAllCredits } from '@/lib/services/credit.service'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/dates'
import { StatMini } from '@/components/shared/KpiCard'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import type { DancerCredit } from '@/types'

export default function CreditsPage() {
  const [credits, setCredits] = useState<DancerCredit[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => { setLoading(true); setCredits(await getAllCredits()); setLoading(false) }
  useEffect(() => { load() }, [])

  const total = credits.reduce((s, c) => s + c.balance, 0)

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Bailarines con saldo a favor. Este saldo se aplica automáticamente al generar las próximas mensualidades.
        </p>
        <button className="btn-secondary flex items-center gap-2 text-sm" onClick={load}><RefreshCw size={14} />Actualizar</button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-4">
        {[
          { label: 'BAILARINES CON SALDO', value: String(credits.length), color: 'var(--status-credit)' },
          { label: 'TOTAL SALDO A FAVOR', value: formatCurrency(total), color: 'var(--status-credit)' },
        ].map(s => (
          <StatMini key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <div className="card overflow-hidden">
        {credits.length === 0 ? (
          <div className="py-16 text-center">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No hay saldos a favor registrados</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr>
              <th className="saoko-col-main">Bailarín</th>
              <th>Saldo a favor</th>
              <th className="max-md:hidden">Última actualización</th>
              <th className="saoko-col-action"></th>
            </tr></thead>
            <tbody>
              {credits.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }} className="min-w-0"><span className="truncate block">{c.dancerName}</span></td>
                  <td>
                    <span style={{ color: 'var(--status-credit)', fontWeight: 700, fontSize: '1rem' }}>
                      {formatCurrency(c.balance)}
                    </span>
                  </td>
                  <td className="max-md:hidden" style={{ color: 'var(--text-muted)' }}>{formatDate(c.lastUpdated)}</td>
                  <td className="saoko-col-action">
                    <div className="hidden md:block">
                      <Link href={`/dancers/${c.dancerId}/financial`}>
                        <button className="btn-secondary py-1 px-3 text-xs">Ver historial</button>
                      </Link>
                    </div>
                    <div className="md:hidden">
                      <TableRowMenu details={[{ label: 'Actualizado', value: formatDate(c.lastUpdated) }]}>
                        <a href={`/dancers/${c.dancerId}/financial`} className="block px-3 py-2 text-sm" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Ver historial</a>
                      </TableRowMenu>
                    </div>
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
