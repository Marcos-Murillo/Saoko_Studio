'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { motion } from 'motion/react'
import { useAuth } from '@/lib/auth/AuthContext'
import { ROLE_LABELS } from '@/lib/auth/roles'
import { NAV_ITEMS } from '@/components/layout/navItems'
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from '@/components/ui/sidebar'

const MARK = '/LOGOS/N%20SIN%20FONDO.png'

function WidthSync() {
  const { open } = useSidebar()
  useLayoutEffect(() => {
    document.documentElement.toggleAttribute('data-sidebar-open', open)
    return () => document.documentElement.removeAttribute('data-sidebar-open')
  }, [open])
  return null
}

function Brand() {
  const { open, animate } = useSidebar()
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <img src={MARK} alt="" className="h-8 w-auto shrink-0" />
      <motion.div
        animate={{
          display: animate ? (open ? 'block' : 'none') : 'block',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="min-w-0 leading-none"
      >
        <p className="truncate text-[0.95rem] font-bold text-[#c9a84c]">Nexora</p>
        <p className="mt-1 text-[0.62rem] uppercase tracking-widest text-[#5c5045]">Saoko</p>
      </motion.div>
    </div>
  )
}

function SignOut() {
  const { open, animate } = useSidebar()
  const { signOut, adminUser } = useAuth()
  if (!adminUser) return null
  return (
    <button
      type="button"
      onClick={signOut}
      className="mt-2 flex items-center gap-2 rounded-xl px-1 py-2 text-sm text-[#a09070]"
    >
      <LogOut size={18} className="shrink-0" />
      <motion.span
        animate={{
          display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="whitespace-pre text-left"
      >
        <span className="block text-xs text-[#f0ead6]">{adminUser.name}</span>
        <span className="block text-[0.67rem] text-[#5c5045]">{ROLE_LABELS[adminUser.role]}</span>
        <span className="mt-1 block text-xs">Cerrar sesión</span>
      </motion.span>
    </button>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { adminUser } = useAuth()
  const role = adminUser?.role
  const visible = role ? NAV_ITEMS.filter((item) => !item.check || item.check(role)) : []

  return (
    <Sidebar>
      <SidebarBody
        showMobile={false}
        className="fixed inset-y-0 left-0 z-40 h-dvh justify-between border-r border-[#1e1e1e] bg-[#101010] px-3"
      >
        <WidthSync />
        <div className="flex min-h-0 flex-1 flex-col">
          <Brand />
          <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto">
            {visible.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <SidebarLink
                  key={item.href}
                  className={active ? 'rounded-xl bg-[rgba(201,168,76,0.14)] px-2 text-[#c9a84c]' : 'rounded-xl px-2 text-[#a09070]'}
                  link={{
                    label: item.label,
                    href: item.href,
                    icon: <Icon size={18} className="shrink-0" />,
                  }}
                />
              )
            })}
          </nav>
        </div>
        <SignOut />
      </SidebarBody>
    </Sidebar>
  )
}
