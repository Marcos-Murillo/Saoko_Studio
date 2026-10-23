import type { ReactNode } from 'react'

declare function BellToggle(props: {
  offLabel?: string
  onLabel?: string
  icon?: ReactNode
  label?: string
  color?: string
  background?: string
  onColor?: string
  onBackground?: string
  size?: 'sm' | 'md' | 'lg'
  radius?: number
  badge?: boolean
  waves?: boolean
  pressed?: boolean
  onChange?: (next: boolean) => void
  disabled?: boolean
  className?: string
}): ReactNode

export default BellToggle
