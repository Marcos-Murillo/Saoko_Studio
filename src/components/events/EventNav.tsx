'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Eye, Layers, UserPlus, Wallet, BarChart3, Pencil } from 'lucide-react'
import { cn } from 'cn'

export function EventNav({ eventId }: { eventId: string }) {
  const pathname = usePathname()
  const items = [
    { href: `/events/${eventId}`,              label: 'Ver evento',     icon: Eye, end: true },
    { href: `/events/${eventId}/categories`,   label: 'Categorías',     icon: Layers },
    { href: `/events/${eventId}/registrations`,label: 'Inscripciones',  icon: UserPlus },
    { href: `/events/${eventId}/payments`,     label: 'Pagos',          icon: Wallet },
    { href: `/events/${eventId}/stats`,        label: 'Estadísticas',   icon: BarChart3 },
    { href: `/events/${eventId}/edit`,         label: 'Editar',         icon: Pencil },
  ]

  return (
    <nav
      className="saoko-chip-nav flex flex-wrap items-center gap-1 p-1 rounded-xl"
      style={{
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {items.map(({ href, label, icon: Icon, end }) => {
        const active = end ? pathname === href : pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm no-underline whitespace-nowrap',
              active ? 'font-semibold' : 'font-medium',
            )}
            style={{
              color: active ? 'var(--gold)' : 'var(--muted-foreground)',
              background: active ? 'var(--gold-muted)' : 'transparent',
              textDecoration: 'none',
            }}
          >
            <Icon size={14} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
