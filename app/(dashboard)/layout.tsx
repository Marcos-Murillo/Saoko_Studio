'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { PERMISSIONS } from '@/lib/auth/roles'
import { ensureDancerClaims } from '@/lib/services/dancerClaim.service'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppHeader } from '@/components/layout/AppHeader'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { ToastProvider } from '@/components/shared/Toast'
import { BrandLoader } from '@/components/shared/LoadingSpinner'
import { SetPasswordForm } from '@/components/auth/SetPasswordForm'
import { ensureCurrentMonthFees } from '@/lib/services/fee.service'

let claimsReady = false
let claimsRunning = false

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, adminUser, loading, signOut, completePasswordSetup } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
    else if (adminUser?.role === 'student') router.replace('/mi-espacio')
  }, [user, adminUser, loading, router])

  useEffect(() => {
    if (!adminUser || adminUser.mustSetPassword) return
    if (adminUser.role === 'student' || adminUser.role === 'teacher') return
    if (claimsReady || claimsRunning) return
    claimsRunning = true
    ensureDancerClaims()
      .then(() => { claimsReady = true })
      .catch(() => { claimsRunning = false })
  }, [adminUser])

  useEffect(() => {
    if (!adminUser || adminUser.mustSetPassword) return
    if (!PERMISSIONS.canManageAccounting(adminUser.role)) return
    ensureCurrentMonthFees({ id: adminUser.id, name: adminUser.name }).catch(() => {})
  }, [adminUser])

  if (loading) return <BrandLoader />
  if (!user || adminUser?.role === 'student') return null
  if (adminUser?.mustSetPassword) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5 py-8" style={{ background: 'var(--background)' }}>
        <div className="w-full max-w-[400px] flex flex-col gap-4">
          <h1 className="text-xl font-bold text-center" style={{ color: 'var(--foreground)' }}>
            Crea tu contraseña
          </h1>
          <p className="text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
            Tu cuenta fue creada por un administrador. Elige la contraseña que usarás de ahora en adelante.
          </p>
          <SetPasswordForm onSubmit={completePasswordSetup} />
          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs"
            style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }
  if (!adminUser) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: 'var(--background)' }}>
        <p className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
          Tu espacio todavía no está listo
        </p>
        <p className="max-w-sm text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Recarga la página. Si ya habías entrado, se abre solo.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-11 rounded-full px-5 text-sm font-semibold"
          style={{ background: 'var(--gold)', color: '#000', border: 'none', cursor: 'pointer' }}
        >
          Recargar
        </button>
        <button
          type="button"
          onClick={() => signOut()}
          className="text-xs"
          style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className="relative min-h-dvh w-full max-w-[100vw] overflow-x-hidden" style={{ background: 'var(--background)' }}>
        <AppSidebar />
        <div
          className="flex min-h-dvh w-full min-w-0 flex-col md:rounded-tl-[28px]"
          style={{
            paddingLeft: 'var(--sidebar-width)',
            background: 'var(--workspace)',
            transition: 'padding-left 200ms ease',
          }}
        >
          <AppHeader />
          <main className={`saoko-app-main flex-1 overflow-x-hidden overflow-y-auto px-4 pb-28 md:px-8 md:pb-10${adminUser && (adminUser.role === 'super_admin' || adminUser.role === 'admin' || adminUser.role === 'teacher') ? ' saoko-wide' : ''}`}>
            {children}
          </main>
        </div>
        <MobileTabBar />
      </div>
    </ToastProvider>
  )
}
