'use client'
import { useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

export function PhotoLightbox({
  src,
  alt,
  children,
}: {
  src?: string | null
  alt: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  if (!src) return <>{children}</>

  return (
    <>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        title="Ver foto completa"
        className="inline-flex cursor-pointer border-none bg-transparent p-0"
        style={{ color: 'inherit' }}
      >
        {children}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-4xl"
          style={{ background: 'rgba(12,12,12,.96)', maxWidth: 'min(920px, calc(100vw - 2rem))' }}
        >
          <DialogTitle className="pr-8" style={{ color: 'var(--foreground)' }}>{alt}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-[78dvh] w-full rounded-lg object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}
