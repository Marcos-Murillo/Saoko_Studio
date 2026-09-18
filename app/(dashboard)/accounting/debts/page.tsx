'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { RefreshCw, Search, ChevronDown, ChevronRight, Download } from 'lucide-react'
import { getAllPendingFees } from '@/lib/services/fee.service'
import { FeeStatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils/currency'
import { formatMonth } from '@/lib/utils/dates'
import { downloadXlsx } from '@/lib/utils/exportExcel'
import { BTN } from '@/components/shared/buttonStyles'
import { StatMini } from '@/components/shared/KpiCard'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { MonthlyFee } from '@/types'

import { LinkButton } from '@/components/shared/LinkButton'

interface DebtRow { dancerId: string; dancerName: string; groupName: string; debt: number; months: number; fees: MonthlyFee[] }

export default function DebtsPage() {
  const [fees, setFees] = useState<MonthlyFee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => { setLoading(true); setFees(await getAllPendingFees()); setLoading(false) }
  useEffect(() => { load() }, [])

  const rows = useMemo(() => {
    const map: Record<string, DebtRow> = {}
    fees.forEach(f => {
      if (!map[f.dancerId]) map[f.dancerId] = { dancerId: f.dancerId, dancerName: f.dancerName ?? '—', groupName: f.groupName ?? '—', debt: 0, months: 0, fees: [] }
      map[f.dancerId].debt += f.amount - f.amountPaid
      map[f.dancerId].months++
      map[f.dancerId].fees.push(f)
    })
    return Object.values(map).sort((a, b) => b.debt - a.debt)
      .filter(r => !search || r.dancerName.toLowerCase().includes(search.toLowerCase()))
  }, [fees, search])

  const totalDebt = rows.reduce((s, r) => s + r.debt, 0)
  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="relative" style={{ width: 320 }}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <Input className="pl-9" placeholder="Buscar bailarín..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>
        <Button variant="outline" size="sm" onClick={load}
          style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          <RefreshCw size={14} className="mr-1.5" />Actualizar
        </Button>
        <Button variant="outline" size="sm"
          onClick={() => downloadXlsx('deudas', rows.map(r => ({
            Bailarin: r.dancerName,
            Grupo: r.groupName,
            Meses: r.months,
            Deuda: r.debt,
          })))}
          style={BTN.excel}>
          <Download size={14} className="mr-1.5" />Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
        {[
          { label: 'Bailarines en mora', value: String(rows.length), color: '#E05252' },
          { label: 'Deuda total', value: formatCurrency(totalDebt), color: '#E05252' },
          { label: 'Mensualidades pendientes', value: String(fees.length), color: '#C9A84C' },
        ].map(s => (
          <StatMini key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <p className="text-3xl">✓</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Todos los bailarines están al día</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: 'var(--border)' }}>
                  <TableHead className="max-md:hidden" />
                  <TableHead style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Bailarín</TableHead>
                  <TableHead className="max-md:hidden" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Grupo</TableHead>
                  <TableHead className="max-md:hidden" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Meses pendientes</TableHead>
                  <TableHead style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Deuda</TableHead>
                  <TableHead className="saoko-col-action" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <>
                    <TableRow key={r.dancerId} style={{ borderColor: 'var(--border-subtle)', cursor: 'pointer' }}
                      onClick={() => setExpanded(expanded === r.dancerId ? null : r.dancerId)}>
                      <TableCell className="max-md:hidden" style={{ width: 32, color: 'var(--text-muted)' }}>
                        {expanded === r.dancerId ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </TableCell>
                      <TableCell className="font-medium min-w-0"><span className="truncate block">{r.dancerName}</span></TableCell>
                      <TableCell className="max-md:hidden" style={{ color: 'var(--text-secondary)' }}>{r.groupName}</TableCell>
                      <TableCell className="max-md:hidden">
                        <Badge variant="outline" style={{ color: '#E05252', borderColor: 'rgba(224,82,82,0.3)', background: 'rgba(224,82,82,0.1)' }}>
                          {r.months} mes{r.months !== 1 ? 'es' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold" style={{ color: '#E05252' }}>{formatCurrency(r.debt)}</TableCell>
                      <TableCell className="saoko-col-action">
                        <div className="hidden md:flex gap-2" onClick={e => e.stopPropagation()}>
                          <LinkButton href="/accounting/payments/new" variant="primary" size="sm">Pagar</LinkButton>
                          <LinkButton href={`/dancers/${r.dancerId}/financial`} variant="outline" size="sm">Historial</LinkButton>
                        </div>
                        <div className="md:hidden">
                          <TableRowMenu
                            details={[
                              { label: 'Grupo', value: r.groupName || '—' },
                              { label: 'Meses pendientes', value: `${r.months}` },
                            ]}
                          >
                            <DropdownMenuItem style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === r.dancerId ? null : r.dancerId)}>
                              {expanded === r.dancerId ? 'Ocultar meses' : 'Ver meses'}
                            </DropdownMenuItem>
                            <DropdownMenuItem style={{ cursor: 'pointer', color: 'var(--gold)' }} onClick={() => { window.location.href = '/accounting/payments/new' }}>
                              Pagar
                            </DropdownMenuItem>
                            <DropdownMenuItem style={{ cursor: 'pointer' }} onClick={() => { window.location.href = `/dancers/${r.dancerId}/financial` }}>
                              Historial
                            </DropdownMenuItem>
                          </TableRowMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded === r.dancerId && (
                      <TableRow key={`${r.dancerId}-detail`} style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                        <TableCell colSpan={6} style={{ padding: '8px 16px 16px' }}>
                          <div className="flex flex-col gap-2 pt-1">
                            {r.fees.map(f => (
                              <div key={f.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
                                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatMonth(f.periodYear, f.periodMonth)}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{f.groupName}</span>
                                <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{formatCurrency(f.amount)}</span>
                                <span style={{ color: '#4CAF7D', fontSize: '0.85rem' }}>Pagado: {formatCurrency(f.amountPaid)}</span>
                                <span style={{ color: '#E05252', fontWeight: 600, fontSize: '0.85rem' }}>Debe: {formatCurrency(f.amount - f.amountPaid)}</span>
                                <FeeStatusBadge status={f.status} />
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
