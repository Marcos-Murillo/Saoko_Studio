import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/LandingPage'

export const metadata: Metadata = {
  title: 'Nexora — La gestión de tu academia',
  description: 'Panel de Saoko Estudio: bailarines, grupos, horarios, caja, vestuario y eventos.',
}

export default function Page() {
  return <LandingPage />
}
