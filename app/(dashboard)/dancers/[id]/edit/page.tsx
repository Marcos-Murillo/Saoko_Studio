'use client'
import { useEffect, useState } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { getDancerById, updateDancer } from '@/lib/services/dancer.service'
import { getCategories } from '@/lib/services/catalog.service'
import { DancerForm, type DancerFormData } from '@/components/dancers/DancerForm'
import { useToast } from '@/components/shared/Toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { isoToTs, tsToDate } from '@/lib/utils/dates'
import { format } from 'date-fns'
import type { Dancer, BloodType } from '@/types'

export default function EditDancerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const toast = useToast()
  const [dancer, setDancer] = useState<Dancer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDancerById(id).then(d => { setDancer(d); setLoading(false) })
  }, [id])

  const handleSubmit = async (data: DancerFormData) => {
    try {
      const cats = await getCategories(false)
      const cat = cats.find(c => c.id === data.categoryId)
      await updateDancer(id, {
        fullName: data.fullName,
        documentNumber: data.documentNumber,
        birthDate: isoToTs(data.birthDate),
        address: data.address,
        neighborhood: data.neighborhood,
        commune: data.commune,
        eps: data.eps,
        epsLocation: data.epsLocation,
        bloodType: data.bloodType as BloodType,
        email: data.email,
        phone: data.phone,
        categoryId: data.categoryId,
        categoryName: cat?.name ?? '',
        notes: data.notes,
      })
      toast('Bailarín actualizado correctamente')
      router.push(`/dancers/${id}`)
    } catch {
      toast('Error al actualizar', 'error')
    }
  }

  if (loading) return <PageLoader />
  if (!dancer) return <p style={{ color: 'var(--text-muted)' }}>No encontrado.</p>

  const birthDateStr = dancer.birthDate
    ? format(dancer.birthDate.toDate(), 'yyyy-MM-dd')
    : ''

  return (
    <div className="max-w-3xl">
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 24 }}>
        Editando información de <strong style={{ color: 'var(--text-primary)' }}>{dancer.fullName}</strong>
      </p>
      <DancerForm
        defaultValues={{
          fullName: dancer.fullName,
          documentNumber: dancer.documentNumber,
          birthDate: birthDateStr,
          address: dancer.address,
          neighborhood: dancer.neighborhood,
          commune: dancer.commune,
          eps: dancer.eps,
          epsLocation: dancer.epsLocation,
          bloodType: dancer.bloodType,
          email: dancer.email,
          phone: dancer.phone,
          categoryId: dancer.categoryId,
          notes: dancer.notes,
        }}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
      />
    </div>
  )
}
