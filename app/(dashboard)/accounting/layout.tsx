'use client'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { AccountingNav } from '@/components/accounting/AccountingNav'

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequirePermission permission="canManageAccounting">
      <div className="flex flex-col gap-6 max-w-[1400px]">
        <AccountingNav />
        {children}
      </div>
    </RequirePermission>
  )
}
