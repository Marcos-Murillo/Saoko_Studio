'use client'
import { RequirePermission } from '@/components/auth/RequirePermission'

export default function CorreosLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequirePermission permission="canManageDancers">
      {children}
    </RequirePermission>
  )
}
