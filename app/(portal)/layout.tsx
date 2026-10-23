'use client'
import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { homeForRole } from '@/lib/auth/roles'

export default function PortalLayout({ children }: { children: ReactNode }) {
  const { user, adminUser, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const previous = meta?.getAttribute('content')
    meta?.setAttribute('content', '#0c0c0c')
    return () => {
      if (previous) meta?.setAttribute('content', previous)
    }
  }, [])

  useEffect(() => {
    if (loading) return
    const keepsPortal = adminUser?.role === 'student' || (adminUser?.role === 'teacher' && !!adminUser.dancerId)
    if (!user) router.replace('/login')
    else if (adminUser && !keepsPortal) router.replace(homeForRole(adminUser.role))
  }, [user, adminUser, loading, router])

  if (loading) return <PortalLoader />
  const keepsPortal = adminUser?.role === 'student' || (adminUser?.role === 'teacher' && !!adminUser.dancerId)
  if (!user) return null
  if (adminUser && !keepsPortal) return null
  if (!adminUser) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--background)] px-6 text-center text-[var(--foreground)]">
        <p className="text-lg font-bold">Tu cuenta todavía no está lista</p>
        <p className="max-w-sm text-sm text-[#a09070]">Cierra sesión y vuelve a entrar. Si sigue igual, pídele al estudio que revise tu usuario.</p>
        <button type="button" onClick={() => signOut()} className="h-11 rounded-full px-5 text-sm font-semibold" style={{ background: 'linear-gradient(180deg, var(--gold-light), var(--gold))', color: '#0c0c0c', border: 'none', cursor: 'pointer' }}>
          Cerrar sesión
        </button>
      </div>
    )
  }

  return <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">{children}</div>
}

function PortalLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)]" role="status" aria-label="Cargando">
      <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--gold)]" />
    </div>
  )
}
