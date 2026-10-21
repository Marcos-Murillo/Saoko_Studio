'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { getStudentPortal, type StudentPortalData } from '@/lib/services/portal.service'
import { StudentHome } from '@/components/portal/StudentHome'

export default function StudentSpacePage() {
  const { adminUser, signOut } = useAuth()
  const [data, setData] = useState<StudentPortalData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!adminUser?.dancerId) return
    let active = true
    getStudentPortal(adminUser.dancerId)
      .then(result => { if (active) setData(result) })
      .catch(() => { if (active) setError('No pudimos cargar tus grupos y pagos. Intenta de nuevo en un momento.') })
    return () => { active = false }
  }, [adminUser?.dancerId])

  if (!adminUser?.dancerId) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center">
        <p className="max-w-sm text-sm text-[#a09070]">Tu usuario no está vinculado a una ficha de bailarín. Pídele al estudio que lo revise.</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center">
        <p className="max-w-sm text-sm text-[#a09070]">{error}</p>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)]" role="status" aria-label="Cargando tu espacio">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--gold)]" />
      </div>
    )
  }

  return <StudentHome data={data} onSignOut={() => signOut()} />
}
