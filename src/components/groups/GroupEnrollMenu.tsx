'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import BellToggle from '@/components/BellToggle'
import './group-enroll.css'

export type EnrollGroupOption = {
  id: string
  name: string
  feeLabel?: string
}

export function GroupEnrollMenu({
  groups,
  selected,
  onToggle,
  title,
  buttonLabel = 'Elegir grupos',
  buttonAlign = 'stretch',
  note,
  error,
  loading = false,
  emptyText = 'No hay grupos disponibles.',
  disabled = false,
  footer,
  open: openProp,
  onOpenChange,
}: {
  groups: EnrollGroupOption[]
  selected: string[]
  onToggle: (id: string) => void
  title?: ReactNode
  buttonLabel?: string
  buttonAlign?: 'stretch' | 'end'
  note?: string
  error?: string
  loading?: boolean
  emptyText?: string
  disabled?: boolean
  footer?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [innerOpen, setInnerOpen] = useState(false)
  const open = openProp ?? innerOpen
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInnerOpen(next)
    onOpenChange?.(next)
  }

  const count = selected.length
  const label = count === 0
    ? buttonLabel
    : count === 1
      ? '1 grupo elegido'
      : `${count} grupos elegidos`
  const chosen = groups.filter(group => selected.includes(group.id))
  const row = Boolean(title) && buttonAlign === 'end'

  return (
    <div className="flex flex-col gap-2">
      <div className={row ? 'flex items-center justify-between gap-3' : 'flex flex-col gap-2'}>
        {title}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={buttonAlign === 'end'
            ? 'shrink-0 rounded-full px-4 py-2 text-xs font-bold'
            : 'flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold'}
          style={buttonAlign === 'end'
            ? { background: 'linear-gradient(180deg, var(--gold-light), var(--gold))', color: '#0c0c0c', border: 'none', cursor: 'pointer' }
            : { color: 'var(--foreground)', border: '1px solid rgba(240, 234, 214, 0.28)', background: 'transparent', cursor: 'pointer' }}
        >
          {label}
          <ChevronDown size={buttonAlign === 'end' ? 14 : 16} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 160ms ease' }} />
        </button>
      </div>

      {!open && chosen.length > 0 && (
        <div className="nexora-group-menu">
          {chosen.map(group => (
            <GroupToggle key={group.id} group={group} on={true} disabled={disabled} onToggle={onToggle} />
          ))}
        </div>
      )}

      {!open && error && <p className="text-center text-xs" style={{ color: '#e05252' }}>{error}</p>}

      {open && (
        <div className="nexora-group-menu">
          {note && <p className="text-center text-xs" style={{ color: '#a09070' }}>{note}</p>}
          {error && <p className="text-center text-xs" style={{ color: '#e05252' }}>{error}</p>}
          {loading && <p className="text-center text-xs" style={{ color: '#a09070' }}>Cargando grupos...</p>}
          {!loading && groups.length === 0 && !error && (
            <p className="text-center text-xs" style={{ color: '#a09070' }}>{emptyText}</p>
          )}
          {!loading && groups.map(group => (
            <GroupToggle
              key={group.id}
              group={group}
              on={selected.includes(group.id)}
              disabled={disabled}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}

      {(open || count > 0) && footer}
    </div>
  )
}

function GroupToggle({
  group, on, disabled, onToggle,
}: {
  group: EnrollGroupOption
  on: boolean
  disabled: boolean
  onToggle: (id: string) => void
}) {
  const ready = group.feeLabel ? `${group.name} · ${group.feeLabel}` : `${group.name} · listo`
  return (
    <BellToggle
      className="nexora-bell"
      pressed={on}
      disabled={disabled}
      onChange={() => onToggle(group.id)}
      offLabel={group.name}
      onLabel={ready}
      label={on ? ready : group.name}
      size="sm"
      radius={999}
      badge={false}
      color="#f0ead6"
      background="#161616"
      onColor="#0c0c0c"
      onBackground="#c9a84c"
    />
  )
}
