'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal, LogOut, X } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { NAV_ITEMS, MOBILE_TAB_HREFS } from '@/components/layout/navItems'
import { cn } from 'cn'

export function MobileTabBar() {
  const pathname = usePathname()
  const { adminUser, signOut } = useAuth()
  const [more, setMore] = useState(false)
  const role = adminUser?.role
  const visible = role ? NAV_ITEMS.filter(n => !n.check || n.check(role)) : []
  const tabs = visible.filter(n => (MOBILE_TAB_HREFS as readonly string[]).includes(n.href))
  const extra = visible.filter(n => !(MOBILE_TAB_HREFS as readonly string[]).includes(n.href))
  const extraActive = extra.some(n => pathname === n.href || pathname.startsWith(n.href + '/'))

  return (
    <>
      {more && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,.55)', border: 'none' }}
          onClick={() => setMore(false)}
          aria-label="Cerrar menú"
        />
      )}
      {more && (
        <div
          className="md:hidden fixed inset-x-0 z-50 mx-3 rounded-[28px] p-4"
          style={{
            bottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
            background: 'rgba(22,22,22,.94)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Más opciones</p>
            <button type="button" onClick={() => setMore(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--accent)', border: 'none', color: 'var(--muted-foreground)' }}>
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {extra.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link key={href} href={href} onClick={() => setMore(false)}
                  className="flex flex-col items-center gap-2 rounded-2xl py-3 no-underline"
                  style={{
                    background: active ? 'var(--gold-muted)' : 'rgba(255,255,255,.04)',
                    color: active ? 'var(--gold)' : 'var(--foreground)',
                    textDecoration: 'none',
                  }}>
                  <Icon size={20} />
                  <span className="text-[0.7rem] font-medium">{label}</span>
                </Link>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => { setMore(false); signOut() }}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm"
            style={{ background: 'rgba(224,82,82,.12)', color: '#e05252', border: 'none' }}
          >
            <LogOut size={16} />Cerrar sesión
          </button>
        </div>
      )}

      <nav
        className="md:hidden pointer-events-none fixed z-[60] px-3"
        style={{
          left: 0,
          right: 0,
          width: '100%',
          bottom: 'calc(0.6rem + env(safe-area-inset-bottom))',
        }}
      >
        <div
          className="pointer-events-auto flex items-stretch justify-around rounded-[28px] px-1 py-1.5"
          style={{
            background: 'rgba(18,18,18,.92)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            boxShadow: '0 12px 40px rgba(0,0,0,.45)',
          }}
        >
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center gap-0.5 py-2 no-underline min-h-[52px] justify-center"
                style={{ textDecoration: 'none', color: active ? 'var(--gold)' : 'var(--muted-foreground)' }}
              >
                <span
                  className={cn('flex h-8 w-8 items-center justify-center rounded-full')}
                  style={{ background: active ? 'var(--gold-muted)' : 'transparent' }}
                >
                  <Icon size={20} />
                </span>
                <span className="text-[0.62rem] font-medium leading-none">{label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMore(v => !v)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 min-h-[52px] justify-center"
            style={{
              background: 'none',
              border: 'none',
              color: extraActive || more ? 'var(--gold)' : 'var(--muted-foreground)',
            }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: extraActive || more ? 'var(--gold-muted)' : 'transparent' }}
            >
              <MoreHorizontal size={20} />
            </span>
            <span className="text-[0.62rem] font-medium leading-none">Más</span>
          </button>
        </div>
      </nav>
    </>
  )
}
