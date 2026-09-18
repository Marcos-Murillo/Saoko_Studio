import { Badge } from '@/components/ui/badge'
import type { EventRegistrationStatus, FeeStatus } from '@/types'

const FEE_MAP: Record<FeeStatus, { label: string; color: string }> = {
  paid:     { label: 'Pagado',    color: '#4caf7d' },
  partial:  { label: 'Parcial',   color: '#e8a030' },
  pending:  { label: 'Pendiente', color: '#c9a84c' },
  forgiven: { label: 'Condonado', color: '#4a90d9' },
}

export function FeeStatusBadge({ status }: { status: FeeStatus }) {
  const { label, color } = FEE_MAP[status] ?? FEE_MAP.pending
  return (
    <Badge variant="outline" style={{
      color,
      borderColor: `${color}40`,
      background: `${color}12`,
      borderRadius: 20,
      fontSize: '0.72rem',
      fontWeight: 500,
      padding: '2px 10px',
    }}>
      {label}
    </Badge>
  )
}

export function MonthPaidBadge({ status }: { status: 'paid' | 'pending' | 'partial' | 'na' }) {
  const map = {
    paid:    { label: 'Pagado',    color: '#4caf7d' },
    partial: { label: 'Parcial',   color: '#e8a030' },
    pending: { label: 'Pendiente', color: '#e05252' },
    na:      { label: '—',         color: 'var(--muted-foreground)' },
  } as const
  const { label, color } = map[status]
  return (
    <Badge variant="outline" style={{
      color,
      borderColor: status === 'na' ? 'var(--border)' : `${color}40`,
      background: status === 'na' ? 'transparent' : `${color}12`,
      borderRadius: 20,
      fontSize: '0.72rem',
      fontWeight: 500,
      padding: '2px 10px',
    }}>
      {label}
    </Badge>
  )
}

export function EventRegStatusBadge({ status }: { status: EventRegistrationStatus }) {
  const map: Record<EventRegistrationStatus, { label: string; color: string }> = {
    paid:    { label: 'Pagado',    color: '#4caf7d' },
    partial: { label: 'Parcial',   color: '#e8a030' },
    pending: { label: 'Pendiente', color: '#e05252' },
  }
  const { label, color } = map[status] ?? map.pending
  return (
    <Badge variant="outline" style={{
      color,
      borderColor: `${color}40`,
      background: `${color}12`,
      borderRadius: 20,
      fontSize: '0.72rem',
      fontWeight: 500,
      padding: '2px 10px',
    }}>
      {label}
    </Badge>
  )
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge variant="outline" style={{
      color: '#4caf7d', borderColor: 'rgba(76,175,125,.35)',
      background: 'rgba(76,175,125,.1)', borderRadius: 20, fontSize: '0.72rem',
    }}>
      Activo
    </Badge>
  ) : (
    <Badge variant="outline" style={{
      color: '#e05252', borderColor: 'rgba(224,82,82,.35)',
      background: 'rgba(224,82,82,.1)', borderRadius: 20, fontSize: '0.72rem',
    }}>
      Inactivo
    </Badge>
  )
}
