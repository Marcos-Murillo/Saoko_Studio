'use client'

export default function EventDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="saoko-limit flex flex-col gap-6 max-w-[1400px]">
      {children}
    </div>
  )
}
