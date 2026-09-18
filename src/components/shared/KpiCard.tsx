import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface StatMiniProps {
  label: string
  value: string
  color?: string
}

/** Compacto en móvil (dato pequeño). En escritorio se ve como tarjeta de resumen. */
export function StatMini({ label, value, color = 'var(--foreground)' }: StatMiniProps) {
  return (
    <div
      className="min-w-0 rounded-xl px-2.5 py-2 md:rounded-2xl md:px-4 md:py-4"
      style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
    >
      <p
        className="text-[0.58rem] md:text-xs font-medium uppercase tracking-wider leading-tight truncate"
        style={{ color: 'var(--muted-foreground)' }}
      >
        {label}
      </p>
      <p
        className="text-[0.95rem] md:text-2xl font-bold mt-0.5 md:mt-2 leading-none tabular-nums tracking-tight truncate"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  )
}

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  color?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function KpiCard({ title, value, subtitle, icon: Icon, color = 'var(--gold)' }: KpiCardProps) {
  return (
    <>
      <div className="md:hidden">
        <StatMini label={title} value={value} color={color} />
      </div>
      <Card className="hidden md:block overflow-hidden min-w-0">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{ background: `${color}18` }}
            >
              <Icon size={19} style={{ color }} />
            </div>
            <p
              className="text-xs font-semibold uppercase tracking-widest text-right"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {title}
            </p>
          </div>
          <p className="text-2xl font-bold leading-none" style={{ color: 'var(--foreground)' }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--muted-foreground)' }}>{subtitle}</p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
