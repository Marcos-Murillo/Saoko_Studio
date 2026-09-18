'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, UsersRound,
  CalendarDays, DollarSign, Settings, LogOut, Music,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { PERMISSIONS } from '@/lib/auth/roles'
import type { AppRole } from '@/lib/auth/roles'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/auth/roles'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  check?: (role: AppRole) => boolean
}

const NAV: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard, check: PERMISSIONS.canViewDashboard },
  { href: '/dancers',    label: 'Bailarines',    icon: Users,           check: PERMISSIONS.canManageDancers },
  { href: '/groups',     label: 'Grupos',        icon: UsersRound,      check: PERMISSIONS.canManageGroups },
  { href: '/schedules',  label: 'Horarios',      icon: CalendarDays,    check: PERMISSIONS.canViewSchedules },
  { href: '/accounting', label: 'Contabilidad',  icon: DollarSign,      check: PERMISSIONS.canManageAccounting },
  { href: '/settings',   label: 'Configuración', icon: Settings,        check: PERMISSIONS.canManageSettings },
]

export function Sidebar() {
  const pathname  = usePathname()
  const { adminUser, signOut } = useAuth()
  const role = adminUser?.role

  const visibleNav = role
    ? NAV.filter(item => !item.check || item.check(role))
    : []

  return (
    <aside
      className="flex flex-col h-screen fixed left-0 top-0 z-40"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--sidebar-bg, #101010)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))' }}>
          <Music size={18} color="#000" />
        </div>
        <div>
          <p className="font-bold text-[0.95rem] leading-tight" style={{ color: 'var(--gold)' }}>Saoko</p>
          <p className="text-[0.65rem] tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Estudio & Dance</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5 overflow-y-auto">
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
                style={{
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--gold)' : 'var(--text-secondary)',
                  background: active ? 'var(--gold-muted)' : 'transparent',
                  border: active ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      {adminUser && (
        <>
          <Separator style={{ background: 'var(--border-subtle)' }} />
          <div className="px-4 py-4 flex flex-col gap-2">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg"
              style={{ background: 'var(--bg-elevated)' }}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0"
                style={{
                  background: `${ROLE_COLORS[adminUser.role]}20`,
                  color: ROLE_COLORS[adminUser.role],
                }}>
                {adminUser.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="text-[0.8rem] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {adminUser.name}
                </p>
                <p className="text-[0.68rem]" style={{ color: 'var(--text-muted)' }}>
                  {ROLE_LABELS[adminUser.role]}
                </p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--status-debt)'; e.currentTarget.style.background = 'var(--status-debt-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
            >
              <LogOut size={14} />
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
