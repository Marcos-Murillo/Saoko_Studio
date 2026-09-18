'use client'
import { Bell } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ROLE_COLORS } from '@/lib/auth/roles'

const SUBTITLES: Record<string, string> = {
  '/dashboard':    'Resumen operativo de la academia',
  '/dancers':      'Fichas, grupos y pagos de cada bailarín',
  '/groups':       'Modalidades, cupos y tarifas',
  '/schedules':    'Calendario semanal de ensayos',
  '/accounting':   'Mensualidades, gastos y reportes',
  '/events':       'Festivales, categorías, inscripciones y pagos',
  '/costumes':     'Préstamos de vestuario',
  '/settings':     'Catálogos y usuarios',
}

function greeting(name: string) {
  const h = new Date().getHours()
  const hello = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  const first = name.split(' ')[0] || name
  return `${hello}, ${first}`
}

function subtitle(path: string) {
  const hit = Object.keys(SUBTITLES).sort((a, b) => b.length - a.length).find(k => path === k || path.startsWith(k + '/'))
  return hit ? SUBTITLES[hit] : 'Sistema administrativo'
}

export function AppHeader() {
  const pathname   = usePathname()
  const { adminUser } = useAuth()

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-4 py-4 md:gap-4 md:px-8 md:py-5"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        background: 'color-mix(in srgb, var(--workspace) 82%, transparent)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xl leading-tight font-bold tracking-tight md:text-lg md:font-semibold" style={{ color: 'var(--foreground)' }}>
          {adminUser ? greeting(adminUser.name) : 'Saoko'}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-foreground)' }}>
          {subtitle(pathname)}
        </p>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <button
          type="button"
          className="flex h-10 w-10 md:h-9 md:w-9 items-center justify-center rounded-full md:rounded-xl"
          style={{ color: 'var(--muted-foreground)', background: 'var(--glass)', border: 'none', cursor: 'pointer' }}
        >
          <Bell size={16} />
        </button>

        {adminUser && (
          <Avatar size="sm">
            <AvatarFallback
              style={{
                background: `${ROLE_COLORS[adminUser.role]}20`,
                color: ROLE_COLORS[adminUser.role],
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {adminUser.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  )
}
