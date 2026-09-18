'use client'
import { RequirePermission } from '@/components/auth/RequirePermission'

export default function DancersLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequirePermission permission="canManageDancers">
      {children}
    </RequirePermission>
  )
}
