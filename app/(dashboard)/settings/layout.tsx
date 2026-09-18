'use client'
import { RequirePermission } from '@/components/auth/RequirePermission'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequirePermission permission="canManageSettings">
      {children}
    </RequirePermission>
  )
}
