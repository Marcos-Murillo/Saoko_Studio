'use client'
import { useEffect, useState } from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { getMonthlyFeesByPeriod, ensureCurrentMonthFees } from '@/lib/services/fee.service'
import { FeeStatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { currentYearMonth, MONTHS_ES } from '@/lib/utils/dates'
import { downloadXlsx } from '@/lib/utils/exportExcel'
import { BTN } from '@/components/shared/buttonStyles'
import { StatMini } from '@/components/shared/KpiCard'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import type { MonthlyFee } from '@/types'
import { useAuth } from '@/lib/auth/AuthContext'

export default function FeesPage() {
  const { year: cy, month: cm } = currentYearMonth()
  const { adminUser } = useAuth()
  const [year, setYear] = useState(cy)
  const [month, setMonth] = useState(cm)
  const [fees, setFees] = useState<MonthlyFee[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    if (year === cy && month === cm && adminUser) {
      await ensureCurrentMonthFees({ id: adminUser.id, name: adminUser.name })
    }
    setFees(await getMonthlyFeesByPeriod(year, month))
    setLoading(false)
  }
  useEffect(() => { load() }, [year, month, adminUser])

  const total = fees.reduce((s, f) => s + f.amount, 0)
  const collected = fees.reduce((s, f) => s + f.amountPaid, 0)
  const years = Array.from({ length: 5 }, (_, i) => cy - 2 + i)

  const selectStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.875rem', padding: '0.4rem 0.75rem', height: 36, outline: 'none' }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <select style={selectStyle} value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS_ES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select style={selectStyle} value={year} onChange={e => setYear(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={load}
          style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          <RefreshCw size={14} className="mr-1.5" />Actualizar
        </Button>
        <Button variant="outline" size="sm"
          onClick={() => downloadXlsx(`mensualidades-${year}-${month}`, fees.map(f => ({
            Bailarin: f.dancerName ?? '',
            Grupo: f.groupName ?? '',
            Monto: f.amount,
            Pagado: f.amountPaid,
            Pendiente: Math.max(0, f.amount - f.amountPaid),
            Estado: f.status,
          })))}
          style={BTN.excel}>
          <Download size={14} className="mr-1.5" />Excel
        </Button>
      </div>
      <p className="text-xs -mt-2" style={{ color: 'var(--muted-foreground)' }}>
        Las cuotas del mes se crean solas el día 1 (bailarines activos). El pago registrado es un ingreso y marca el mes como pagado.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {[
          { label: 'Total a cobrar', value: formatCurrency(total), color: 'var(--text-primary)' },
          { label: 'Recaudado', value: formatCurrency(collected), color: '#4CAF7D' },
          { label: 'Pendiente', value: formatCurrency(total - collected), color: '#E05252' },
          { label: 'Registros', value: String(fees.length), color: 'var(--gold)' },
        ].map(s => (
          <StatMini key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <CardContent className="p-0">
          {loading ? <PageLoader /> : (
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: 'var(--border)' }}>
                  <TableHead style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Bailarín</TableHead>
                  <TableHead className="max-md:hidden" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Grupo</TableHead>
                  <TableHead className="max-md:hidden" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Monto</TableHead>
                  <TableHead className="max-md:hidden" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Pagado</TableHead>
                  <TableHead className="max-md:hidden" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Pendiente</TableHead>
                  <TableHead style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Estado</TableHead>
                  <TableHead className="saoko-col-action" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map(f => (
                  <TableRow key={f.id} style={{ borderColor: 'var(--border-subtle)' }}>
                    <TableCell className="font-medium min-w-0"><span className="truncate block">{f.dancerName}</span></TableCell>
                    <TableCell className="max-md:hidden" style={{ color: 'var(--text-secondary)' }}>{f.groupName}</TableCell>
                    <TableCell className="max-md:hidden" style={{ color: 'var(--text-primary)' }}>{formatCurrency(f.amount)}</TableCell>
                    <TableCell className="max-md:hidden" style={{ color: '#4CAF7D' }}>{formatCurrency(f.amountPaid)}</TableCell>
                    <TableCell className="max-md:hidden" style={{ color: f.amount - f.amountPaid > 0 ? '#E05252' : 'var(--text-muted)' }}>
                      {formatCurrency(Math.max(0, f.amount - f.amountPaid))}
                    </TableCell>
                    <TableCell><FeeStatusBadge status={f.status} /></TableCell>
                    <TableCell className="saoko-col-action">
                      <TableRowMenu details={[
                        { label: 'Grupo', value: f.groupName || '—' },
                        { label: 'Monto', value: formatCurrency(f.amount) },
                        { label: 'Pagado', value: formatCurrency(f.amountPaid) },
                        { label: 'Pendiente', value: formatCurrency(Math.max(0, f.amount - f.amountPaid)) },
                      ]} />
                    </TableCell>
                  </TableRow>
                ))}
                {fees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                      Sin mensualidades para este período. Las del mes en curso se crean al entrar al sistema.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
