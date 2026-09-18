/**
 * LinkButton — renders an <a> tag with Button visual styles.
 * Use instead of <Button asChild> since @base-ui/react/button doesn't support asChild.
 */
import Link from 'next/link'
import { cn } from 'cn'

interface LinkButtonProps {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon-sm'
  className?: string
  style?: React.CSSProperties
}

export function LinkButton({ href, children, variant = 'primary', size = 'default', className, style }: LinkButtonProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium text-sm rounded-lg transition-all whitespace-nowrap'

  const sizes = {
    'default': 'h-11 md:h-8 px-4 md:px-3',
    'sm':      'h-10 md:h-7 px-3 md:px-2.5 text-xs',
    'icon-sm': 'h-6 w-6 p-0',
  }

  const variants = {
    primary: {
      background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))',
      color: '#000',
      border: 'none',
    },
    outline: {
      background: 'transparent',
      color: 'var(--muted-foreground)',
      border: '1px solid var(--border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--muted-foreground)',
      border: 'none',
    },
  }

  return (
    <Link
      href={href}
      className={cn(base, sizes[size], className)}
      style={{ textDecoration: 'none', ...variants[variant], ...style }}
    >
      {children}
    </Link>
  )
}
