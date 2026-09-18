'use client'
import { RequirePermission } from '@/components/auth/RequirePermission'

export default function GroupsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequirePermission permission="canViewGroups">
      {children}
    </RequirePermission>
  )
}
