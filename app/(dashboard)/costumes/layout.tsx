'use client'
import { RequirePermission } from '@/components/auth/RequirePermission'

export default function CostumesLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequirePermission permission="canManageCostumes">
      {children}
    </RequirePermission>
  )
}
