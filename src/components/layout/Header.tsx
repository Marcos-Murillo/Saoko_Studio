'use client'
import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':          'Dashboard',
  '/dancers':            'Bailarines',
  '/dancers/new':        'Nuevo Bailarín',
  '/groups':             'Grupos',
  '/groups/new':         'Nuevo Grupo',
  '/schedules':          'Horarios',
  '/accounting':         'Contabilidad',
  '/accounting/fees':    'Mensualidades',
  '/accounting/payments':'Pagos',
  '/accounting/debts':   'Deudas',
  '/accounting/credits': 'Saldos a Favor',
  '/accounting/expenses':'Gastos',
  '/accounting/reports': 'Reportes',
  '/settings':           'Configuración',
}

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  // Dynamic routes
  if (pathname.startsWith('/dancers/') && pathname.endsWith('/edit')) return 'Editar Bailarín'
  if (pathname.startsWith('/dancers/') && pathname.endsWith('/financial')) return 'Historial Financiero'
  if (pathname.startsWith('/dancers/') && pathname.endsWith('/history')) return 'Historial de Grupos'
  if (pathname.startsWith('/dancers/')) return 'Detalle Bailarín'
  if (pathname.startsWith('/groups/') && pathname.endsWith('/edit')) return 'Editar Grupo'
  if (pathname.startsWith('/groups/')) return 'Detalle Grupo'
  return 'Saoko Admin'
}

export function Header() {
  const pathname = usePathname()
  const { adminUser } = useAuth()
  const title = getTitle(pathname)

  return (
    <header
      className="flex items-center justify-between px-8 py-4 sticky top-0 z-30"
      style={{
        background: 'rgba(12,12,12,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        height: 64,
      }}
    >
      <h1 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600 }}>
        {title}
      </h1>
      <div className="flex items-center gap-4">
        <button
          className="flex items-center justify-center w-9 h-9 rounded-full"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          title="Notificaciones"
        >
          <Bell size={15} />
        </button>
        {adminUser && (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
              style={{ background: 'var(--gold-muted-strong)', color: 'var(--gold)' }}
            >
              {adminUser.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{adminUser.name}</span>
          </div>
        )}
      </div>
    </header>
  )
}
