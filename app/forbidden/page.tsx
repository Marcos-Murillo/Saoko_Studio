'use client'
import Link from 'next/link'
import { ShieldOff } from 'lucide-react'

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8" style={{ background: 'var(--background)' }}>
      <ShieldOff size={36} style={{ color: 'var(--gold)' }} />
      <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Sin permiso</h1>
      <p className="text-sm text-center max-w-sm" style={{ color: 'var(--muted-foreground)' }}>
        Tu rol no puede acceder a esta sección. Si crees que es un error, pide a un administrador que revise tu usuario.
      </p>
      <Link
        href="/dashboard"
        className="text-sm font-semibold px-4 py-2 rounded-lg"
        style={{ background: 'var(--gold)', color: '#000', textDecoration: 'none' }}
      >
        Volver al dashboard
      </Link>
    </div>
  )
}
