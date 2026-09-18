'use client'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function TableRowMenu({
  details,
  children,
}: {
  details?: { label: string; value: React.ReactNode }[]
  children?: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            style={{ color: 'var(--muted-foreground)' }}
            aria-label="Más opciones"
          />
        }
        onClick={e => e.stopPropagation()}
      >
        <MoreHorizontal size={18} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        style={{ background: 'var(--popover)', border: '1px solid var(--border)', minWidth: 220 }}
      >
        {details && details.length > 0 && (
          <div className="px-3 py-2 flex flex-col gap-2 max-w-[260px]">
            {details.map(d => (
              <div key={d.label} className="min-w-0">
                <p className="text-[0.62rem] uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                  {d.label}
                </p>
                <div className="text-sm mt-0.5 break-words" style={{ color: 'var(--foreground)' }}>{d.value}</div>
              </div>
            ))}
          </div>
        )}
        {details && details.length > 0 && children ? (
          <DropdownMenuSeparator style={{ background: 'var(--border)' }} />
        ) : null}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
