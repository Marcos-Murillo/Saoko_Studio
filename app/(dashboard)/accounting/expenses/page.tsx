'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, Plus, RefreshCw, TrendingDown, BarChart3, DollarSign } from 'lucide-react'
import { downloadXlsx } from '@/lib/utils/exportExcel'
import { BTN } from '@/components/shared/buttonStyles'
import { getExpenses } from '@/lib/services/expense.service'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, currentYearMonth, MONTHS_ES, monthStart, monthEnd } from '@/lib/utils/dates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import type { Expense } from '@/types'

import { LinkButton } from '@/components/shared/LinkButton'

export default function ExpensesPage() {
  const { year: cy, month: cm } = currentYearMonth()
  const [year,   setYear]   = useState(cy)
  const [month,  setMonth]  = useState(cm)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading,  setLoading]  = useState(true)

  const load = async () => {
    setLoading(true)
    setExpenses(await getExpenses(monthStart(year, month), monthEnd(year, month)))
    setLoading(false)
  }
  useEffect(() => { load() }, [year, month])

  const total   = expenses.reduce((s, e) => s + e.amount, 0)
  const years   = Array.from({ length: 4 }, (_, i) => cy - 1 + i)
  const selectStyle = { background: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)', fontSize: '0.875rem', padding: '0.4rem 0.75rem', height: 36, outline: 'none' }

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      <PageHeader
        title="Gastos"
        description="Registro de gastos de la academia. Mantén actualizado para calcular el balance real."
        action={
          <LinkButton href="/accounting/expenses/new" variant="primary">
            <Plus size={15} />Registrar Gasto
          </LinkButton>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <select style={selectStyle} value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS_ES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select style={selectStyle} value={year} onChange={e => setYear(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={load}
          style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
          <RefreshCw size={13} className="mr-1.5" />Actualizar
        </Button>
        <Button variant="outline" size="sm"
          onClick={() => downloadXlsx(`gastos-${year}-${month}`, expenses.map(e => ({
            Fecha: formatDate(e.expenseDate),
            Concepto: e.concept,
            Categoria: e.categoryName ?? '',
            Metodo: e.paymentMethodName ?? '',
            Monto: e.amount,
            Recibo: e.receiptUrl ?? '',
          })))}
          style={BTN.excel}>
          <Download size={13} className="mr-1.5" />Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
        <KpiCard title="Total gastos"  value={formatCurrency(total)} subtitle={`${expenses.length} registros`} icon={TrendingDown} color="#e8a030" />
        <KpiCard title="Registros"     value={String(expenses.length)} subtitle="en el período" icon={BarChart3} color="var(--gold)" />
        <KpiCard title="Promedio"      value={expenses.length ? formatCurrency(total / expenses.length) : '$0'} subtitle="por registro" icon={DollarSign} color="var(--muted-foreground)" />
      </div>

      <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: 'var(--border)' }}>
                <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Fecha</TableHead>
                <TableHead className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Concepto</TableHead>
                <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Categoría</TableHead>
                <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Método</TableHead>
                <TableHead className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Monto</TableHead>
                <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Recibo</TableHead>
                <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Registrado por</TableHead>
                <TableHead className="saoko-col-action" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map(e => (
                <TableRow key={e.id} style={{ borderColor: 'var(--border)' }}>
                  <TableCell className="max-md:hidden text-sm" style={{ color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{formatDate(e.expenseDate)}</TableCell>
                  <TableCell className="font-medium text-sm min-w-0"><span className="truncate block">{e.concept}</span></TableCell>
                  <TableCell className="max-md:hidden">
                    {e.categoryName && (
                      <Badge variant="outline" style={{ color: 'var(--muted-foreground)', borderColor: 'var(--border)', fontSize: '0.72rem' }}>
                        {e.categoryName}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-md:hidden text-sm" style={{ color: 'var(--muted-foreground)' }}>{e.paymentMethodName}</TableCell>
                  <TableCell className="font-semibold text-sm" style={{ color: '#e8a030' }}>{formatCurrency(e.amount)}</TableCell>
                  <TableCell className="max-md:hidden text-xs">
                    {e.receiptUrl
                      ? <a href={e.receiptUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>Ver</a>
                      : '—'}
                  </TableCell>
                  <TableCell className="max-md:hidden text-xs" style={{ color: 'var(--muted-foreground)' }}>{e.registeredByName}</TableCell>
                  <TableCell className="saoko-col-action">
                    <TableRowMenu details={[
                      { label: 'Fecha', value: formatDate(e.expenseDate) },
                      { label: 'Categoría', value: e.categoryName || '—' },
                      { label: 'Método', value: e.paymentMethodName || '—' },
                      { label: 'Registrado por', value: e.registeredByName || '—' },
                    ]} />
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    Sin gastos en este período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
