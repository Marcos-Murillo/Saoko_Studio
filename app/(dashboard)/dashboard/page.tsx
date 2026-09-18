'use client'
import { useEffect, useState } from 'react'
import {
  Users, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, CreditCard, BarChart3, RefreshCw, ArrowRight,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { getDashboardStatsRange, getMonthlyChartData } from '@/lib/services/dashboard.service'
import { getMonthlyFeesByPeriod, ensureCurrentMonthFees } from '@/lib/services/fee.service'
import { getDancers } from '@/lib/services/dancer.service'
import { formatCurrency } from '@/lib/utils/currency'
import { formatMonthShort, monthsOverlapping } from '@/lib/utils/dates'
import { PeriodFilter, periodBounds, periodLabel, type PeriodMode } from '@/components/shared/PeriodFilter'
import { BTN } from '@/components/shared/buttonStyles'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { LinkButton } from '@/components/shared/LinkButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth/AuthContext'
import { PERMISSIONS } from '@/lib/auth/roles'
import type { DashboardStats, MonthlyChartData, MonthlyFee } from '@/types'

/* ─── Empty chart data (6 meses en cero) para render sin datos ─────────── */
function emptyChartData(): MonthlyChartData[] {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      month: formatMonthShort(d.getFullYear(), d.getMonth() + 1),
      income: 0, expenses: 0, balance: 0,
    }
  })
}

const EMPTY_STATS: DashboardStats = {
  activeDancers: 0, dancersWithDebt: 0, dancersUpToDate: 0,
  dancersWithCredit: 0, cashIncomeThisMonth: 0, accrualCollectedThisMonth: 0,
  totalCollectedThisMonth: 0, totalPendingThisMonth: 0,
  totalExpensesThisMonth: 0, balanceThisMonth: 0, totalCreditBalance: 0,
  feesGeneratedCount: 0,
}

/* ─── Chart tooltip ──────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 text-xs shadow-xl"
      style={{ background: 'var(--popover)', border: '1px solid var(--border)', minWidth: 160 }}>
      <p className="mb-2 font-semibold" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{formatCurrency(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

/* ─── KPI skeleton (mientras carga) ─────────────────────────────────────── */
function KpiSkeleton() {
  return (
    <div
      className="rounded-xl px-2.5 py-2 md:rounded-2xl md:px-4 md:py-5"
      style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
    >
      <Skeleton className="h-2.5 w-12 md:w-24 rounded mb-2" style={{ background: 'var(--accent)' }} />
      <Skeleton className="h-4 w-16 md:h-7 md:w-32 rounded" style={{ background: 'var(--accent)' }} />
    </div>
  )
}

/* ─── Debtors list ───────────────────────────────────────────────────────── */
function DebtorsList({ fees, loading }: { fees: MonthlyFee[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="w-36 h-3.5 rounded" style={{ background: 'var(--accent)' }} />
              <Skeleton className="w-24 h-3 rounded" style={{ background: 'var(--accent)' }} />
            </div>
            <Skeleton className="w-20 h-6 rounded-xl" style={{ background: 'var(--accent)' }} />
          </div>
        ))}
      </div>
    )
  }

  const byDancer = fees.reduce<Record<string, { name: string; debt: number; months: number }>>((acc, f) => {
    if (!acc[f.dancerId]) acc[f.dancerId] = { name: f.dancerName ?? '—', debt: 0, months: 0 }
    acc[f.dancerId].debt  += f.amount - f.amountPaid
    acc[f.dancerId].months++
    return acc
  }, {})
  const top = Object.entries(byDancer).sort((a, b) => b[1].debt - a[1].debt).slice(0, 5)

  if (!top.length)
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <CheckCircle size={28} style={{ color: '#4caf7d' }} />
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Sin morosos — todos al día
        </p>
        <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)', maxWidth: 180 }}>
          Aquí aparecerán los bailarines con mensualidades pendientes
        </p>
      </div>
    )

  return (
    <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
      {top.map(([id, d]) => (
        <div key={id} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{d.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {d.months} mes{d.months !== 1 ? 'es' : ''} pendiente{d.months !== 1 ? 's' : ''}
            </p>
          </div>
          <Badge variant="outline" style={{
            color: '#e05252', borderColor: 'rgba(224,82,82,.35)',
            background: 'rgba(224,82,82,.1)', fontWeight: 600,
          }}>
            {formatCurrency(d.debt)}
          </Badge>
        </div>
      ))}
    </div>
  )
}

/* ─── Empty chart placeholder ─────────────────────────────────────────────── */
function EmptyChartOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { adminUser } = useAuth()
  const canFinance = !!adminUser && PERMISSIONS.canManageAccounting(adminUser.role)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month')
  const [periodDate, setPeriodDate] = useState(() => new Date())
  const [stats,      setStats]      = useState<DashboardStats>(EMPTY_STATS)
  const [chart,      setChart]      = useState<MonthlyChartData[]>(emptyChartData())
  const [pending,    setPending]    = useState<MonthlyFee[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const { start, end } = periodBounds(periodMode, periodDate)
  const label = periodLabel(periodMode, periodDate)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      if (!canFinance) {
        const dancers = await getDancers(true)
        setStats({ ...EMPTY_STATS, activeDancers: dancers.length })
        setChart(emptyChartData())
        setPending([])
      } else {
        await ensureCurrentMonthFees(adminUser ? { id: adminUser.id, name: adminUser.name } : undefined)
        const months = monthsOverlapping(start, end)
        const [sRes, cRes, fRes] = await Promise.allSettled([
          getDashboardStatsRange(start, end),
          getMonthlyChartData(periodMode === 'year' ? 12 : 6),
          Promise.all(months.map(m => getMonthlyFeesByPeriod(m.year, m.month))),
        ])
        if (sRes.status === 'fulfilled') setStats(sRes.value)
        if (cRes.status === 'fulfilled' && cRes.value.length > 0) setChart(cRes.value)
        else if (cRes.status === 'fulfilled') setChart(emptyChartData())
        if (fRes.status === 'fulfilled') {
          setPending(fRes.value.flat().filter(f => f.status === 'pending' || f.status === 'partial'))
        }
      }
    } catch {
      // On error keep showing zeros — don't crash the page
    }
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { load() }, [canFinance, periodMode, periodDate])
  const hasChartData = chart.some(c => c.income > 0 || c.expenses > 0)

  const pieData = [
    { name: 'Al día',        value: stats.dancersUpToDate,  color: '#4caf7d' },
    { name: 'Con deuda',     value: stats.dancersWithDebt,  color: '#e05252' },
    { name: 'Saldo a favor', value: stats.dancersWithCredit,color: '#4a90d9' },
  ].filter(d => d.value > 0)

  return (
    <div className="flex flex-col gap-8 max-w-[1400px]">
      <PageHeader
        title="Dashboard"
        description={`Resumen de ${label}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter
              mode={periodMode}
              date={periodDate}
              onModeChange={setPeriodMode}
              onDateChange={setPeriodDate}
            />
            <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}
              style={BTN.refresh}>
              <RefreshCw size={13} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
        }
      />

      {canFinance ? (
      <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {loading ? [...Array(4)].map((_, i) => <KpiSkeleton key={i} />) : (
          <>
            <KpiCard title="Caja del período"  value={formatCurrency(stats.cashIncomeThisMonth)}
              subtitle="pagos registrados" icon={TrendingUp} color="#4caf7d" />
            <KpiCard title="Cuotas cobradas" value={formatCurrency(stats.accrualCollectedThisMonth)}
              subtitle={`mensualidades de ${label}`} icon={CheckCircle} color="var(--gold)" />
            <KpiCard title="Pendiente de cobro" value={formatCurrency(stats.totalPendingThisMonth)}
              subtitle={`${stats.dancersWithDebt} con saldo pendiente`} icon={AlertTriangle} color="#e05252" />
            <KpiCard title="Gastos del período"      value={formatCurrency(stats.totalExpensesThisMonth)}
              subtitle={`Balance caja: ${formatCurrency(stats.balanceThisMonth)}`} icon={TrendingDown} color="#e8a030" />
          </>
        )}
      </div>

      {/* KPI grid 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {loading ? [...Array(4)].map((_, i) => <KpiSkeleton key={i} />) : (
          <>
            <KpiCard title="Al día"          value={String(stats.dancersUpToDate)}
              subtitle="cuotas al día en el período" icon={CheckCircle} color="#4caf7d" />
            <KpiCard title="En mora"         value={String(stats.dancersWithDebt)}
              subtitle="cuotas pendientes del período" icon={AlertTriangle} color="#e05252" />
            <KpiCard title="Saldo a favor"   value={formatCurrency(stats.totalCreditBalance)}
              subtitle={`${stats.dancersWithCredit} bailarín(es)`} icon={CreditCard} color="#4a90d9" />
            <KpiCard title="Balance" value={formatCurrency(stats.balanceThisMonth)}
              subtitle="ingresos − gastos" icon={BarChart3}
              color={stats.balanceThisMonth >= 0 ? '#4caf7d' : '#e05252'} />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area chart */}
        <Card className="lg:col-span-2 min-w-0 overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
              Ingresos de caja vs Gastos — últimos 6 meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--gold)"  stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--gold)"  stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#e05252" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#e05252" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="income"   name="Caja" stroke="var(--gold)" strokeWidth={2} fill="url(#gIncome)" />
                  <Area type="monotone" dataKey="expenses" name="Gastos"   stroke="#e05252"     strokeWidth={2} fill="url(#gExpense)" />
                </AreaChart>
              </ResponsiveContainer>
              {!hasChartData && !loading && (
                <EmptyChartOverlay label="Sin movimientos registrados aún" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card className="min-w-0 overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
              Estado de pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={85}
                    dataKey="value" paddingAngle={3}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Legend formatter={(v) => (
                    <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{v}</span>
                  )} />
                  <Tooltip
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: 'var(--foreground)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3"
                style={{ height: 240 }}>
                <div className="w-20 h-20 rounded-full border-4 border-dashed flex items-center justify-center"
                  style={{ borderColor: 'var(--border)' }}>
                  <Users size={28} style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    Sin datos de pagos
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    Genera mensualidades para ver el estado
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart balance */}
        <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
              Balance mensual (caja − gastos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="balance" name="Balance" radius={[6, 6, 0, 0]} fill="var(--gold)" />
                </BarChart>
              </ResponsiveContainer>
              {!hasChartData && !loading && (
                <EmptyChartOverlay label="Sin transacciones aún" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top debtors */}
        <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
              Principales morosos
            </CardTitle>
            <LinkButton href="/accounting/debts" variant="ghost" size="sm"
              style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>
              Ver todos <ArrowRight size={13} className="ml-1" />
            </LinkButton>
          </CardHeader>
          <Separator style={{ background: 'var(--border)' }} />
          <CardContent className="pt-3">
            <DebtorsList fees={pending} loading={loading} />
          </CardContent>
        </Card>
      </div>
      </>
      ) : (
        <KpiCard title="Bailarines activos" value={String(stats.activeDancers)}
          subtitle="Vista de instructor — sin datos financieros" icon={Users} color="var(--gold)" />
      )}
    </div>
  )
}
