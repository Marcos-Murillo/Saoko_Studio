import { Skeleton } from '@/components/ui/skeleton'

const NEXORA_MARK = '/LOGOS/N%20SIN%20FONDO.png'

export function BrandLoader() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center"
      style={{ background: '#0c0c0c' }}
      role="status"
      aria-label="Cargando"
    >
      <div className="flex flex-col items-center gap-5">
        <img src={NEXORA_MARK} alt="" className="h-[72px] w-auto" />
        <div
          className="h-px w-14 animate-pulse"
          style={{ background: '#d4af37' }}
        />
      </div>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex flex-col gap-5 p-6 w-full animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48 rounded-lg" style={{ background: 'var(--accent)' }} />
        <Skeleton className="h-9 w-32 rounded-lg" style={{ background: 'var(--accent)' }} />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" style={{ background: 'var(--accent)' }} />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl w-full" style={{ background: 'var(--accent)' }} />
    </div>
  )
}

export function TableLoader() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" style={{ background: 'var(--accent)' }} />
      ))}
    </div>
  )
}
