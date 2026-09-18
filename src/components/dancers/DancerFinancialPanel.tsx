'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, CreditCard } from 'lucide-react'
import { getMonthlyFeesByDancer } from '@/lib/services/fee.service'
import { getPaymentsByDancer } from '@/lib/services/payment.service'
import { getDancerCredit } from '@/lib/services/credit.service'
import { FeeStatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatDate, formatMonth } from '@/lib/utils/dates'
import { formatCurrency } from '@/lib/utils/currency'
import { KpiCard } from '@/components/shared/KpiCard'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import type { MonthlyFee, Payment, DancerCredit } from '@/types'

export function DancerFinancialPanel({ dancerId }: { dancerId: string }) {
  const [fees, setFees] = useState<MonthlyFee[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [credit, setCredit] = useState<DancerCredit | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'fees' | 'payments'>('fees')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getMonthlyFeesByDancer(dancerId),
      getPaymentsByDancer(dancerId),
      getDancerCredit(dancerId),
    ]).then(([f, p, cr]) => {
      setFees(f); setPayments(p); setCredit(cr); setLoading(false)
    })
  }, [dancerId])

  if (loading) return <PageLoader />

  const totalPaid = payments.filter(p => !p.isVoided).reduce((s, p) => s + p.amount, 0)
  const totalDebt = fees.filter(f => f.status !== 'paid' && f.status !== 'forgiven')
    .reduce((s, f) => s + (f.amount - f.amountPaid), 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <KpiCard title="Total pagado" value={formatCurrency(totalPaid)} icon={TrendingUp} color="#4caf7d" />
        <KpiCard title="Deuda" value={formatCurrency(totalDebt)} icon={TrendingDown} color="#e05252" />
        <KpiCard title="Saldo a favor" value={formatCurrency(credit?.balance ?? 0)} icon={CreditCard} color="#4a90d9" />
      </div>

      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,.04)' }}>
        {(['fees', 'payments'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{
            padding: '0.4rem 0.9rem', borderRadius: 10, fontSize: '0.8rem', cursor: 'pointer',
            background: tab === t ? 'var(--gold-muted)' : 'transparent',
            color: tab === t ? 'var(--gold)' : 'var(--muted-foreground)',
            border: 'none', fontWeight: tab === t ? 600 : 400,
          }}>
            {t === 'fees' ? `Mensualidades (${fees.length})` : `Pagos (${payments.length})`}
          </button>
        ))}
      </div>

      {tab === 'fees' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--muted-foreground)' }}>
                <th className="text-left py-2 font-medium">Período</th>
                <th className="text-left py-2 font-medium max-md:hidden">Grupo</th>
                <th className="text-left py-2 font-medium max-md:hidden">Pendiente</th>
                <th className="text-left py-2 font-medium">Estado</th>
                <th className="saoko-col-action"></th>
              </tr>
            </thead>
            <tbody>
              {fees.map(f => (
                <tr key={f.id}>
                  <td className="py-2">{formatMonth(f.periodYear, f.periodMonth)}</td>
                  <td className="py-2 max-md:hidden" style={{ color: 'var(--muted-foreground)' }}>{f.groupName}</td>
                  <td className="py-2 max-md:hidden">{formatCurrency(Math.max(0, f.amount - f.amountPaid))}</td>
                  <td className="py-2"><FeeStatusBadge status={f.status} /></td>
                  <td className="saoko-col-action">
                    <TableRowMenu details={[
                      { label: 'Grupo', value: f.groupName },
                      { label: 'Pendiente', value: formatCurrency(Math.max(0, f.amount - f.amountPaid)) },
                    ]} />
                  </td>
                </tr>
              ))}
              {fees.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>Sin mensualidades</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'payments' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--muted-foreground)' }}>
                <th className="text-left py-2 font-medium">Fecha</th>
                <th className="text-left py-2 font-medium max-md:hidden">Concepto</th>
                <th className="text-left py-2 font-medium">Monto</th>
                <th className="saoko-col-action"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ opacity: p.isVoided ? 0.5 : 1 }}>
                  <td className="py-2">{formatDate(p.paymentDate)}</td>
                  <td className="py-2 max-md:hidden">{p.concept}</td>
                  <td className="py-2" style={{ color: '#4caf7d', fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                  <td className="saoko-col-action">
                    <TableRowMenu details={[{ label: 'Concepto', value: p.concept }]} />
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>Sin pagos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
