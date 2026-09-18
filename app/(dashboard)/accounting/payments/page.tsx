'use client'
import { useEffect, useState } from 'react'
import { Plus, RefreshCw, XCircle, TrendingUp, AlertTriangle, Download } from 'lucide-react'
import { getAllPayments, voidPayment } from '@/lib/services/payment.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { LinkButton } from '@/components/shared/LinkButton'
import { KpiCard } from '@/components/shared/KpiCard'
import { FormField } from '@/components/shared/FormField'
import { useToast } from '@/components/shared/Toast'
import { useAuth } from '@/lib/auth/AuthContext'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, currentYearMonth, MONTHS_ES, toMillis } from '@/lib/utils/dates'
import { downloadXlsx } from '@/lib/utils/exportExcel'
import { Button } from '@/components/ui/button'
import { BTN } from '@/components/shared/buttonStyles'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { Payment } from '@/types'

export default function PaymentsPage() {
  const { year: cy, month: cm } = currentYearMonth()
  const { adminUser } = useAuth()
  const toast  = useToast()

  const [year,       setYear]       = useState(0)
  const [month,      setMonth]      = useState(0)
  const [payments,   setPayments]   = useState<Payment[]>([])
  const [loading,    setLoading]    = useState(true)
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [voiding,    setVoiding]    = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setPayments(await getAllPayments())
    } catch {
      setPayments([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const visible = payments.filter(p => {
    const t = toMillis(p.paymentDate) || toMillis(p.createdAt)
    if (!t) return year === 0 && month === 0
    const d = new Date(t)
    if (year !== 0 && d.getFullYear() !== year) return false
    if (month !== 0 && d.getMonth() + 1 !== month) return false
    return true
  })

  const handleVoid = async () => {
    if (!voidTarget || !adminUser) return
    setVoiding(true)
    try {
      await voidPayment(voidTarget.id, voidReason || 'Sin razón especificada', adminUser.id, adminUser.name)
      toast('Pago anulado')
      setVoidTarget(null); setVoidReason(''); load()
    } catch (e: any) { toast(e.message ?? 'Error', 'error') }
    setVoiding(false)
  }

  const valid  = visible.filter(p => !p.isVoided)
  const voided = visible.filter(p => p.isVoided)
  const total  = valid.reduce((s, p) => s + p.amount, 0)

  const selectStyle = {
    background: 'var(--accent)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--foreground)', fontSize: '0.875rem',
    padding: '0.4rem 0.75rem', height: 36, outline: 'none',
  }
  const years = Array.from({ length: 4 }, (_, i) => cy - 1 + i)

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      <PageHeader
        title="Pagos"
        description="Todos los pagos registrados. Filtra por mes o año si lo necesitas."
        action={
          <LinkButton href="/accounting/payments/new" variant="primary">
            <Plus size={15} />Registrar Pago
          </LinkButton>
        }
      />

      {/* Filtro período */}
      <div className="flex items-center gap-3 flex-wrap">
        <select style={selectStyle} value={month} onChange={e => setMonth(Number(e.target.value))}>
          <option value={0}>Todos los meses</option>
          {MONTHS_ES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select style={selectStyle} value={year} onChange={e => setYear(Number(e.target.value))}>
          <option value={0}>Todos los años</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={load}
          style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
          <RefreshCw size={13} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Cargando...' : 'Actualizar'}
        </Button>
        <Button variant="outline" size="sm"
          onClick={() => downloadXlsx(`pagos`, visible.map(p => ({
            Fecha: formatDate(p.paymentDate),
            Bailarin: p.dancerName ?? '',
            Concepto: p.concept,
            Metodo: p.paymentMethodName ?? '',
            Monto: p.amount,
            Estado: p.isVoided ? 'Anulado' : 'Valido',
          })))}
          style={BTN.excel}>
          <Download size={13} className="mr-1.5" />Excel
        </Button>
      </div>

      {/* KPIs — con skeleton si carga */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <Skeleton className="w-10 h-10 rounded-xl" style={{ background: 'var(--accent)' }} />
                  <Skeleton className="w-24 h-3 rounded" style={{ background: 'var(--accent)' }} />
                </div>
                <Skeleton className="w-28 h-7 rounded" style={{ background: 'var(--accent)' }} />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <KpiCard title="Total recaudado" value={formatCurrency(total)}
              subtitle={`${valid.length} pago(s) válidos`} icon={TrendingUp} color="#4caf7d" />
            <KpiCard title="Pagos válidos" value={String(valid.length)}
              subtitle="en el período" icon={TrendingUp} color="var(--gold)" />
            <KpiCard title="Anulados" value={String(voided.length)}
              subtitle="requieren revisión" icon={AlertTriangle} color="#e05252" />
          </>
        )}
      </div>

      {/* Tabla */}
      <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: 'var(--border)' }}>
                <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Fecha</TableHead>
                <TableHead className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Bailarín</TableHead>
                <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Concepto</TableHead>
                <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Método</TableHead>
                <TableHead className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Monto</TableHead>
                <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Registrado por</TableHead>
                <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Estado</TableHead>
                <TableHead className="saoko-col-action" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Skeleton rows mientras carga */}
              {loading && [...Array(4)].map((_, i) => (
                <TableRow key={`sk-${i}`} style={{ borderColor: 'var(--border)' }}>
                  {[...Array(8)].map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 rounded" style={{ background: 'var(--accent)', width: j === 4 ? 80 : 60 }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

              {/* Datos reales */}
              {!loading && visible.map(p => (
                <TableRow key={p.id} style={{ borderColor: 'var(--border)', opacity: p.isVoided ? 0.5 : 1 }}>
                  <TableCell className="max-md:hidden text-sm" style={{ color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                    {formatDate(p.paymentDate)}
                  </TableCell>
                  <TableCell className="min-w-0">
                    <LinkButton href={`/dancers/${p.dancerId}`} variant="ghost" size="sm"
                      className="truncate max-w-full"
                      style={{ color: 'var(--gold)', fontWeight: 500 }}>
                      {p.dancerName}
                    </LinkButton>
                  </TableCell>
                  <TableCell className="max-md:hidden text-sm" style={{ color: 'var(--muted-foreground)' }}>{p.concept}</TableCell>
                  <TableCell className="max-md:hidden text-sm" style={{ color: 'var(--muted-foreground)' }}>{p.paymentMethodName}</TableCell>
                  <TableCell className="font-semibold text-sm" style={{ color: '#4caf7d' }}>
                    {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell className="max-md:hidden text-xs" style={{ color: 'var(--muted-foreground)' }}>{p.registeredByName}</TableCell>
                  <TableCell className="max-md:hidden">
                    {p.isVoided
                      ? <Badge variant="outline" style={{ color: '#e05252', borderColor: 'rgba(224,82,82,.35)', background: 'rgba(224,82,82,.1)', fontSize: '0.72rem' }}>Anulado</Badge>
                      : <Badge variant="outline" style={{ color: '#4caf7d', borderColor: 'rgba(76,175,125,.35)', background: 'rgba(76,175,125,.1)', fontSize: '0.72rem' }}>Válido</Badge>}
                  </TableCell>
                  <TableCell className="saoko-col-action">
                    <TableRowMenu details={[
                      { label: 'Fecha', value: formatDate(p.paymentDate) },
                      { label: 'Concepto', value: p.concept },
                      { label: 'Método', value: p.paymentMethodName },
                      { label: 'Estado', value: p.isVoided ? 'Anulado' : 'Válido' },
                    ]}>
                      {!p.isVoided && (
                        <DropdownMenuItem style={{ color: '#e05252', cursor: 'pointer' }} onClick={() => setVoidTarget(p)}>
                          Anular pago
                        </DropdownMenuItem>
                      )}
                    </TableRowMenu>
                  </TableCell>
                </TableRow>
              ))}

              {/* Estado vacío */}
              {!loading && visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-14"
                    style={{ color: 'var(--muted-foreground)' }}>
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center"
                        style={{ borderColor: 'var(--border)' }}>
                        <TrendingUp size={20} style={{ color: 'var(--muted-foreground)' }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Sin pagos en este período</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                          Registra el primer pago con el botón de arriba
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de anulación */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(4px)' }}>
          <Card className="w-full max-w-sm" style={{ background: 'var(--popover)', border: '1px solid var(--border)' }}>
            <CardContent className="pt-6 flex flex-col gap-5">
              <div>
                <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--foreground)' }}>Anular pago</h3>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Pago de <strong style={{ color: 'var(--foreground)' }}>{formatCurrency(voidTarget.amount)}</strong> de {voidTarget.dancerName}
                </p>
              </div>
              <FormField label="Razón de anulación">
                <textarea rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                  style={{ background: 'var(--accent)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  value={voidReason} onChange={e => setVoidReason(e.target.value)}
                  placeholder="Ej: Pago registrado por error..." />
              </FormField>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setVoidTarget(null); setVoidReason('') }}
                  style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleVoid} disabled={voiding}>
                  {voiding ? 'Anulando...' : 'Anular pago'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
