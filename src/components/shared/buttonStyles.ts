import type { CSSProperties } from 'react'

export const BTN = {
  excel:  { background: '#2e7d32', color: '#fff', border: 'none' } as CSSProperties,
  pdf:    { background: '#c62828', color: '#fff', border: 'none' } as CSSProperties,
  create: { background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none' } as CSSProperties,
  edit:   { background: '#1565c0', color: '#fff', border: 'none' } as CSSProperties,
  select: { background: '#00838f', color: '#fff', border: 'none' } as CSSProperties,
  refresh:{ background: '#5e35b1', color: '#fff', border: 'none' } as CSSProperties,
  danger: { background: '#c62828', color: '#fff', border: 'none' } as CSSProperties,
  ghost:  { background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' } as CSSProperties,
}
