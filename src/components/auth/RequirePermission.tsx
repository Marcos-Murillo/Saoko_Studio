'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { PERMISSIONS, type AppRole } from '@/lib/auth/roles'
import { PageLoader } from '@/components/shared/LoadingSpinner'

type PermissionKey = {
  [K in keyof typeof PERMISSIONS]: (typeof PERMISSIONS)[K] extends (role: AppRole) => boolean ? K : never
}[keyof typeof PERMISSIONS]

export function RequirePermission({
  permission,
  children,
}: {
  permission: PermissionKey
  children: React.ReactNode
}) {
  const { adminUser, loading } = useAuth()
  const router = useRouter()
  const allowed = adminUser ? PERMISSIONS[permission](adminUser.role) : false

  useEffect(() => {
    if (!loading && adminUser && !allowed) {
      router.replace('/forbidden')
    }
  }, [loading, adminUser, allowed, router])

  if (loading || !adminUser) return <PageLoader />
  if (!allowed) return <PageLoader />
  return <>{children}</>
}
