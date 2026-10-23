'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const TABLE_PAGE_SIZE = 15

export function PagedTable<T>({
  items,
  resetKey = '',
  children,
}: {
  items: T[]
  resetKey?: string
  children: (rows: T[]) => React.ReactNode
}) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [resetKey])

  const pages = Math.max(1, Math.ceil(items.length / TABLE_PAGE_SIZE))
  const current = Math.min(page, pages)
  const start = (current - 1) * TABLE_PAGE_SIZE
  const rows = items.slice(start, start + TABLE_PAGE_SIZE)
  const from = items.length === 0 ? 0 : start + 1
  const to = Math.min(start + TABLE_PAGE_SIZE, items.length)

  return (
    <>
      {children(rows)}
      {items.length > 0 && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {from}–{to} de {items.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
              style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', cursor: current <= 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={14} />
              Anterior
            </button>
            <span className="min-w-12 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {current} / {pages}
            </span>
            <button
              type="button"
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
              className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
              style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', cursor: current >= pages ? 'not-allowed' : 'pointer' }}
            >
              Siguiente
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
