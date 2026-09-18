'use client'
import Link from 'next/link'
import { Music, Tag, Layers, CreditCard, ReceiptText, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'

const SECTIONS = [
  { href: '/settings/modalities',        icon: Music,        label: 'Modalidades',           desc: 'Salsa Caleña, Jazz, Ballet, Contemporánea...' },
  { href: '/settings/categories',        icon: Tag,          label: 'Categorías',             desc: 'Infantil, Pre-juvenil, Juvenil, Adulto...' },
  { href: '/settings/levels',            icon: Layers,       label: 'Niveles',               desc: 'Iniciación, Segunda Línea, Primera Línea...' },
  { href: '/settings/payment-methods',   icon: CreditCard,   label: 'Métodos de Pago',        desc: 'Efectivo, Transferencia, Nequi, Daviplata...' },
  { href: '/settings/expense-categories',icon: ReceiptText,  label: 'Categorías de Gastos',  desc: 'Arriendo, Vestuario, Transporte, Nómina...' },
  { href: '/settings/users',             icon: Users,        label: 'Usuarios del Sistema',  desc: 'Admin, Administrativo, Instructor...' },
]

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1400px]">
      <PageHeader
        title="Configuración"
        description="Administra los catálogos y parámetros del sistema. Los cambios aplican a toda la aplicación."
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <Card
              className="transition-all duration-150 cursor-pointer"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,.5)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                  style={{ background: 'rgba(201,168,76,.12)' }}>
                  <Icon size={18} style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{label}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
