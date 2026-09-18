'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { PERMISSIONS } from '@/lib/auth/roles'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppHeader } from '@/components/layout/AppHeader'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { ToastProvider } from '@/components/shared/Toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { SetPasswordForm } from '@/components/auth/SetPasswordForm'
import { ensureCurrentMonthFees } from '@/lib/services/fee.service'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, adminUser, loading, signOut, completePasswordSetup } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!adminUser || adminUser.mustSetPassword) return
    if (!PERMISSIONS.canManageAccounting(adminUser.role)) return
    ensureCurrentMonthFees({ id: adminUser.id, name: adminUser.name }).catch(() => {})
  }, [adminUser])

  if (loading) return <PageLoader />
  if (!user) return null
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 max-w-lg mx-auto" style={{ background: 'var(--background)' }}>
        <p className="text-sm font-semibold text-center" style={{ color: 'var(--foreground)' }}>
          Auth funcionó, pero falta tu perfil en Firestore.
        </p>
        <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
          Firestore → colección adminUsers → Añadir documento. El ID debe ser este UID:
        </p>
        <code
          className="text-xs break-all p-3 rounded-lg w-full text-center"
          style={{ background: 'var(--accent)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
        >
          {user.uid}
        </code>
        <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
          Correo: <strong style={{ color: 'var(--foreground)' }}>{user.email}</strong>
        </p>
        <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
          Campos: uid (el mismo), name, email, role = super_admin, isActive = true.
          Publica también las reglas nuevas de adminUsers y recarga.
        </p>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(user.uid)}
          className="text-xs px-3 py-2 rounded-lg"
          style={{ background: 'var(--gold)', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          Copiar UID
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
          <main className="saoko-app-main flex-1 overflow-x-hidden overflow-y-auto px-4 pb-28 md:px-8 md:pb-10">
            {children}
          </main>
        </div>
        <MobileTabBar />
      </div>
    </ToastProvider>
  )
}
