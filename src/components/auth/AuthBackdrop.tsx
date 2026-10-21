import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

export const pillClass =
  'h-11 w-full rounded-full border bg-transparent px-5 text-center text-sm outline-none transition-[border-color,box-shadow] placeholder:text-[#a09070] focus-visible:border-[var(--gold)] focus-visible:ring-3 focus-visible:ring-[rgba(201,168,76,0.28)]'

export const pillStyle = {
  borderColor: 'rgba(240, 234, 214, 0.28)',
  color: 'var(--foreground)',
  background: 'transparent',
} as const

export function LoginArcs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            'radial-gradient(circle, rgba(201,168,76,0.16) 0%, rgba(160,120,48,0.05) 38%, transparent 68%)',
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="saokoArc" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0ead6" />
            <stop offset="32%" stopColor="#e8c97a" />
            <stop offset="68%" stopColor="#c9a84c" />
            <stop offset="100%" stopColor="#a07830" />
          </linearGradient>
          <filter id="saokoGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="1880" cy="700" r="900" fill="none" stroke="#e8c97a" strokeWidth="42" opacity="0.34" filter="url(#saokoGlow)" />
        <circle cx="1880" cy="700" r="900" fill="none" stroke="url(#saokoArc)" strokeWidth="20" />
        <circle cx="1880" cy="700" r="830" fill="none" stroke="#e8c97a" strokeWidth="1.5" opacity="0.4" />
        <line x1="-60" y1="70" x2="760" y2="820" stroke="#c9a84c" strokeWidth="1.5" opacity="0.4" />
        <circle cx="260" cy="1560" r="760" fill="none" stroke="#e8c97a" strokeWidth="30" opacity="0.22" filter="url(#saokoGlow)" />
        <circle cx="260" cy="1560" r="760" fill="none" stroke="url(#saokoArc)" strokeWidth="14" />
      </svg>
    </div>
  )
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null
  return (
    <div
      className="flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm"
      style={{
        background: 'rgba(224,82,82,.12)',
        border: '1px solid rgba(224,82,82,.32)',
        color: '#e05252',
      }}
    >
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function AuthPrimaryButton({
  children,
  disabled,
}: {
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-1 h-11 w-full cursor-pointer rounded-full text-sm font-semibold transition-opacity"
      style={{
        background: 'linear-gradient(180deg, var(--gold-light), var(--gold))',
        color: '#0c0c0c',
        border: 'none',
        opacity: disabled ? 0.75 : 1,
      }}
    >
      {children}
    </button>
  )
}
