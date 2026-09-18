'use client'
import { useEffect, useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Download } from 'lucide-react'
import { getMonthlyFeesByPeriod } from '@/lib/services/fee.service'
import { getExpenses } from '@/lib/services/expense.service'
import { getPaymentsByPeriod } from '@/lib/services/payment.service'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { DateRangePicker } from '@/components/shared/DatePicker'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, monthsOverlapping, toMillis } from '@/lib/utils/dates'
import { parseLocalDateInput } from '@/lib/utils/localDate'
import { downloadXlsxBook } from '@/lib/utils/exportExcel'
import { downloadMultiTablePdf } from '@/lib/utils/exportPdf'
import { Button } from '@/components/ui/button'
import { BTN } from '@/components/shared/buttonStyles'
import { StatMini } from '@/components/shared/KpiCard'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import type { MonthlyFee, Expense, Payment } from '@/types'

function toIso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function ReportsPage() {
  const now = new Date()
  const [from, setFrom] = useState(toIso(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo] = useState(toIso(now))
  const [fees, setFees] = useState<MonthlyFee[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  const start = parseLocalDateInput(from) ?? new Date()
  const endDate = parseLocalDateInput(to) ?? new Date()
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999)

  const load = async () => {
    setLoading(true)
    const months = monthsOverlapping(start, end)
    const [fChunks, e, p] = await Promise.all([
      Promise.all(months.map(m => getMonthlyFeesByPeriod(m.year, m.month))),
      getExpenses(start, end),
      getPaymentsByPeriod(start, end),
    ])
    setFees(fChunks.flat())
    setExpenses(e)
    setPayments(p)
    setLoading(false)
  }

  useEffect(() => { load() }, [from, to])

  const cashIncome = payments.reduce((s, p) => s + p.amount, 0)
  const accrual = fees.reduce((s, f) => s + f.amountPaid, 0)
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0)
  const balance = cashIncome - totalExpense
  const periodLabel = `${formatDate(start)} – ${formatDate(end)}`

  const movements = useMemo(() => {
    type Row = { date: Date; tipo: string; concepto: string; ingreso: number; egreso: number }
    const rows: Row[] = [
      ...payments.map(p => ({
        date: new Date(toMillis(p.paymentDate)),
        tipo: 'Ingreso',
        concepto: `${p.dancerName ?? 'Pago'} · ${p.concept ?? 'Mensualidad'}`,
        ingreso: p.amount,
        egreso: 0,
      })),
      ...expenses.map(e => ({
        date: new Date(toMillis(e.expenseDate)),
        tipo: 'Egreso',
        concepto: `${e.categoryName ?? 'Gasto'} · ${e.description ?? ''}`,
        ingreso: 0,
        egreso: e.amount,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime())

    let running = 0
    return rows.map(r => {
      running += r.ingreso - r.egreso
      return { ...r, saldo: running }
    })
  }, [payments, expenses])

  const exportExcel = () => {
    downloadXlsxBook(`reporte-${from}_${to}`, [
      {
        name: 'Cuadro general',
        rows: [
          { Concepto: 'Periodo', Valor: periodLabel },
          { Concepto: 'Caja (ingresos)', Valor: cashIncome },
          { Concepto: 'Devengo de cuotas', Valor: accrual },
          { Concepto: 'Gastos', Valor: totalExpense },
          { Concepto: 'Balance caja', Valor: balance },
        ],
      },
      {
        name: 'Movimientos',
        rows: movements.map(m => ({
          Fecha: formatDate(m.date),
          Tipo: m.tipo,
          Concepto: m.concepto,
          Ingreso: m.ingreso || '',
          Egreso: m.egreso || '',
          Saldo: m.saldo,
        })),
      },
    ])
  }

  const exportPdf = () => {
    downloadMultiTablePdf(`reporte-${from}_${to}`, `Reporte ${periodLabel}`, [
      `Caja (ingresos): ${formatCurrency(cashIncome)}`,
      `Devengo de cuotas: ${formatCurrency(accrual)}`,
      `Gastos: ${formatCurrency(totalExpense)}`,
      `Balance caja: ${formatCurrency(balance)}`,
    ], [
      {
        title: 'Cuadro general',
        head: ['Concepto', 'Valor'],
        body: [
          ['Caja (ingresos)', formatCurrency(cashIncome)],
          ['Devengo de cuotas', formatCurrency(accrual)],
          ['Gastos', formatCurrency(totalExpense)],
          ['Balance caja', formatCurrency(balance)],
        ],
      },
      {
        title: 'Movimientos (justificación de saldos)',
        head: ['Fecha', 'Tipo', 'Concepto', 'Ingreso', 'Egreso', 'Saldo'],
        body: movements.map(m => [
          formatDate(m.date),
          m.tipo,
          m.concepto.slice(0, 42),
          m.ingreso ? formatCurrency(m.ingreso) : '',
          m.egreso ? formatCurrency(m.egreso) : '',
          formatCurrency(m.saldo),
        ]),
      },
    ])
  }

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3 flex-wrap">
        <DateRangePicker from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b || a) }} />
        <Button size="sm" onClick={exportExcel} style={BTN.excel} className="ml-auto">
          <Download size={14} className="mr-1.5" />Excel
        </Button>
        <Button size="sm" onClick={exportPdf} style={BTN.pdf}>
          <Download size={14} className="mr-1.5" />PDF
        </Button>
      </div>

      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
        Elige de qué fecha a qué fecha. El cuadro general resume el período; los movimientos justifican el saldo día a día.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {[
          { label: 'CAJA', value: formatCurrency(cashIncome), color: '#4caf7d' },
          { label: 'DEVENGO CUOTAS', value: formatCurrency(accrual), color: 'var(--gold)' },
          { label: 'GASTOS', value: formatCurrency(totalExpense), color: '#e8a030' },
          { label: 'BALANCE CAJA', value: formatCurrency(balance), color: balance >= 0 ? '#4caf7d' : '#e05252' },
        ].map(s => (
          <StatMini key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <Card>
        <CardContent className="pt-5">
          <p className="font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Cuadro general</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ['Caja (ingresos)', formatCurrency(cashIncome)],
                ['Devengo de cuotas', formatCurrency(accrual)],
                ['Gastos', formatCurrency(totalExpense)],
                ['Balance caja', formatCurrency(balance)],
              ].map(([c, v]) => (
                <TableRow key={c}>
                  <TableCell>{c}</TableCell>
                  <TableCell className="font-semibold">{v}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <p className="font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Movimientos uno a uno</p>
          {movements.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--muted-foreground)' }}>Sin movimientos en el rango</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="max-md:hidden">Tipo</TableHead>
                  <TableHead className="max-md:hidden">Concepto</TableHead>
                  <TableHead className="max-md:hidden">Ingreso</TableHead>
                  <TableHead className="max-md:hidden">Egreso</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead className="saoko-col-action" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell>{formatDate(m.date)}</TableCell>
                    <TableCell className="max-md:hidden" style={{ color: m.tipo === 'Ingreso' ? '#4caf7d' : '#e05252' }}>{m.tipo}</TableCell>
                    <TableCell className="max-md:hidden">{m.concepto}</TableCell>
                    <TableCell className="max-md:hidden">{m.ingreso ? formatCurrency(m.ingreso) : '—'}</TableCell>
                    <TableCell className="max-md:hidden">{m.egreso ? formatCurrency(m.egreso) : '—'}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(m.saldo)}</TableCell>
                    <TableCell className="saoko-col-action">
                      <TableRowMenu details={[
                        { label: 'Tipo', value: m.tipo },
                        { label: 'Concepto', value: m.concepto },
                        { label: 'Ingreso', value: m.ingreso ? formatCurrency(m.ingreso) : '—' },
                        { label: 'Egreso', value: m.egreso ? formatCurrency(m.egreso) : '—' },
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
        <CardContent className="pt-5">
          <p className="font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Saldo acumulado</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={movements.map(m => ({ fecha: formatDate(m.date), saldo: m.saldo }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="fecha" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip />
              <Area type="monotone" dataKey="saldo" name="Saldo" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
