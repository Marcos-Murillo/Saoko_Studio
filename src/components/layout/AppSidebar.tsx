'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LogOut, Music, ChevronLeft,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/auth/roles'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { NAV_ITEMS } from '@/components/layout/navItems'
import { cn } from 'cn'

export function AppSidebar() {
  const pathname  = usePathname()
  const { adminUser, signOut } = useAuth()
  const role = adminUser?.role
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    document.documentElement.toggleAttribute('data-sidebar-collapsed', collapsed)
    document.documentElement.style.removeProperty('--sidebar-width')
    return () => document.documentElement.removeAttribute('data-sidebar-collapsed')
  }, [collapsed])

  const visible = role ? NAV_ITEMS.filter(n => !n.check || n.check(role)) : []

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 hidden md:flex flex-col"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--sidebar)',
        transition: 'width 200ms ease',
      }}
    >
      <div className={cn('flex items-center gap-3 px-4 py-6', collapsed && 'justify-center px-2')}>
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))' }}
        >
          <Music size={17} color="#000" />
        </div>
        {!collapsed && (
          <div className="leading-none min-w-0">
            <p className="font-bold text-[0.95rem] truncate" style={{ color: 'var(--gold)' }}>Saoko</p>
            <p className="text-[0.62rem] tracking-widest uppercase mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Estudio
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 flex flex-col gap-1">
        {visible.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} title={label} style={{ textDecoration: 'none' }}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-xl text-sm transition-colors duration-150',
                  collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5',
                  active ? 'font-semibold' : 'font-normal',
                )}
                style={{
                  color:      active ? 'var(--gold)' : 'var(--sidebar-foreground)',
                  background: active ? 'var(--gold-muted)' : 'transparent',
                }}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{label}</span>}
              </div>
            </Link>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed(v => !v)}
        className="absolute top-1/2 -right-3 z-50 flex h-6 w-6 items-center justify-center rounded-full"
        style={{ background: 'var(--sidebar)', color: 'var(--muted-foreground)', border: '1px solid var(--glass-border)', transform: 'translateY(-50%)', cursor: 'pointer' }}
        aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
      >
        <ChevronLeft size={14} style={{ transform: collapsed ? 'rotate(180deg)' : undefined }} />
      </button>

      {adminUser && (
        <div className={cn('p-3 flex flex-col gap-2', collapsed && 'items-center')}>
          <div className={cn('flex items-center gap-3 rounded-xl px-2 py-2', collapsed && 'px-0 justify-center')} style={{ background: 'rgba(255,255,255,.04)' }}>
            <Avatar size="sm">
              <AvatarFallback
                style={{
                  background: `${ROLE_COLORS[adminUser.role]}20`,
                  color: ROLE_COLORS[adminUser.role],
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {adminUser.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>
                  {adminUser.name}
                </p>
                <p className="text-[0.67rem] truncate" style={{ color: 'var(--muted-foreground)' }}>
                  {ROLE_LABELS[adminUser.role]}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={signOut}
            className={cn('flex items-center gap-2 text-xs rounded-xl py-2', collapsed ? 'justify-center px-0 w-full' : 'px-3')}
            style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <LogOut size={13} />
            {!collapsed && 'Cerrar sesión'}
          </button>
        </div>
      )}
    </aside>
  )
}
