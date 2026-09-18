'use client'
import { RequirePermission } from '@/components/auth/RequirePermission'

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequirePermission permission="canManageEvents">
      {children}
    </RequirePermission>
  )
}
