'use client'
import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getDancerById } from '@/lib/services/dancer.service'
import { getMonthlyFeesByDancer } from '@/lib/services/fee.service'
import { getPaymentsByDancer } from '@/lib/services/payment.service'
import { getDancerCredit } from '@/lib/services/credit.service'
import { FeeStatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatDate, formatMonth } from '@/lib/utils/dates'
import { formatCurrency } from '@/lib/utils/currency'
import { StatMini } from '@/components/shared/KpiCard'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import type { Dancer, MonthlyFee, Payment, DancerCredit } from '@/types'

export default function DancerFinancialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [dancer, setDancer] = useState<Dancer | null>(null)
  const [fees, setFees] = useState<MonthlyFee[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [credit, setCredit] = useState<DancerCredit | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'fees' | 'payments'>('fees')

  useEffect(() => {
    Promise.all([
      getDancerById(id),
      getMonthlyFeesByDancer(id),
      getPaymentsByDancer(id),
      getDancerCredit(id),
    ]).then(([d, f, p, cr]) => {
      setDancer(d); setFees(f); setPayments(p); setCredit(cr); setLoading(false)
    })
  }, [id])

  if (loading) return <PageLoader />

  const totalPaid = payments.filter(p => !p.isVoided).reduce((s, p) => s + p.amount, 0)
  const totalDebt = fees.filter(f => f.status !== 'paid' && f.status !== 'forgiven')
    .reduce((s, f) => s + (f.amount - f.amountPaid), 0)

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <Link href={`/dancers/${id}`} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Volver a {dancer?.fullName}
      </Link>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <StatMini label="Total pagado" value={formatCurrency(totalPaid)} color="#4caf7d" />
        <StatMini label="Deuda" value={formatCurrency(totalDebt)} color={totalDebt > 0 ? '#e05252' : 'var(--foreground)'} />
        <StatMini label="Saldo a favor" value={formatCurrency(credit?.balance ?? 0)} color="#4a90d9" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        {(['fees', 'payments'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '0.4rem 1rem', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer',
            background: tab === t ? 'var(--gold-muted)' : 'transparent',
            color: tab === t ? 'var(--gold)' : 'var(--text-secondary)',
            border: 'none', fontWeight: tab === t ? 600 : 400,
          }}>
            {{ fees: `Mensualidades (${fees.length})`, payments: `Pagos (${payments.length})` }[t]}
          </button>
        ))}
      </div>

      {tab === 'fees' && (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead><tr>
              <th>Período</th>
              <th className="max-md:hidden">Grupo</th>
              <th className="max-md:hidden">Monto</th>
              <th className="max-md:hidden">Pagado</th>
              <th className="max-md:hidden">Pendiente</th>
              <th>Estado</th>
              <th className="saoko-col-action"></th>
            </tr></thead>
            <tbody>
              {fees.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 500 }}>{formatMonth(f.periodYear, f.periodMonth)}</td>
                  <td className="max-md:hidden" style={{ color: 'var(--text-secondary)' }}>{f.groupName}</td>
                  <td className="max-md:hidden">{formatCurrency(f.amount)}</td>
                  <td className="max-md:hidden" style={{ color: 'var(--status-paid)' }}>{formatCurrency(f.amountPaid)}</td>
                  <td className="max-md:hidden" style={{ color: f.amount - f.amountPaid > 0 ? 'var(--status-debt)' : 'var(--text-muted)' }}>
                    {formatCurrency(Math.max(0, f.amount - f.amountPaid))}
                  </td>
                  <td><FeeStatusBadge status={f.status} /></td>
                  <td className="saoko-col-action">
                    <TableRowMenu details={[
                      { label: 'Grupo', value: f.groupName },
                      { label: 'Monto', value: formatCurrency(f.amount) },
                      { label: 'Pagado', value: formatCurrency(f.amountPaid) },
                      { label: 'Pendiente', value: formatCurrency(Math.max(0, f.amount - f.amountPaid)) },
                    ]} />
                  </td>
                </tr>
              ))}
              {fees.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Sin mensualidades</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'payments' && (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead><tr>
              <th>Fecha</th>
              <th className="max-md:hidden">Concepto</th>
              <th className="max-md:hidden">Método</th>
              <th>Monto</th>
              <th className="max-md:hidden">Estado</th>
              <th className="saoko-col-action"></th>
            </tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ opacity: p.isVoided ? 0.5 : 1 }}>
                  <td style={{ color: 'var(--text-secondary)' }}>{formatDate(p.paymentDate)}</td>
                  <td className="max-md:hidden" style={{ fontWeight: 500 }}>{p.concept}</td>
                  <td className="max-md:hidden" style={{ color: 'var(--text-secondary)' }}>{p.paymentMethodName}</td>
                  <td style={{ color: 'var(--status-paid)', fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                  <td className="max-md:hidden">{p.isVoided ? <span className="badge-debt">Anulado</span> : <span className="badge-paid">Válido</span>}</td>
                  <td className="saoko-col-action">
                    <TableRowMenu details={[
                      { label: 'Concepto', value: p.concept },
                      { label: 'Método', value: p.paymentMethodName },
                      { label: 'Estado', value: p.isVoided ? 'Anulado' : 'Válido' },
                    ]} />
                  </td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Sin pagos registrados</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
