'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, DollarSign, AlertTriangle, CreditCard, ReceiptText, BarChart3 } from 'lucide-react'
import { cn } from 'cn'

const ITEMS = [
  { href: '/accounting/fees',      label: 'Mensualidades', icon: Calendar },
  { href: '/accounting/payments',  label: 'Pagos',         icon: DollarSign },
  { href: '/accounting/debts',     label: 'Deudas',        icon: AlertTriangle },
  { href: '/accounting/credits',   label: 'Saldos',        icon: CreditCard },
  { href: '/accounting/expenses',  label: 'Gastos',        icon: ReceiptText },
  { href: '/accounting/reports',   label: 'Reportes',      icon: BarChart3 },
]

export function AccountingNav() {
  const pathname = usePathname()

  return (
    <nav
      className="saoko-chip-nav flex flex-wrap items-center gap-1 p-1 rounded-xl"
      style={{
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors no-underline',
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
