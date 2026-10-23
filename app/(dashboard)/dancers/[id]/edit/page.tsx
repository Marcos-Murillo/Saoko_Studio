'use client'
import { useEffect, useState } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { getDancerById, updateDancer } from '@/lib/services/dancer.service'
import { getCategories } from '@/lib/services/catalog.service'
import { DancerForm, type DancerFormData } from '@/components/dancers/DancerForm'
import { useToast } from '@/components/shared/Toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { isoToTs } from '@/lib/utils/dates'
import { toDateInputValue } from '@/lib/utils/localDate'
import { packDancerCategories, readCategoryIds } from '@/lib/utils/dancerCategories'
import { persistSecondGroupChoice } from '@/lib/services/group.service'
import type { Dancer, BloodType, Gender } from '@/types'

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
      const categories = packDancerCategories(cats, data.categoryIds)
      await updateDancer(id, {
        fullName: data.fullName,
        documentNumber: data.documentNumber,
        birthDate: isoToTs(data.birthDate),
        address: data.address,
        neighborhood: data.neighborhood,
        commune: data.commune,
        city: data.city,
        gender: (data.gender || '') as Gender,
        eps: data.eps,
        epsLocation: data.epsLocation,
        bloodType: data.bloodType as BloodType,
        email: data.email,
        phone: data.phone,
        ...categories,
        notes: data.notes,
        photoUrl: data.photoUrl || null,
      })
      await persistSecondGroupChoice(id, data.fullName, cats, data.categoryIds, data.secondGroupId)
      toast('Bailarín actualizado correctamente')
      router.push(`/dancers/${id}`)
    } catch {
      toast('Error al actualizar', 'error')
    }
  }

  if (loading) return <PageLoader />
  if (!dancer) return <p style={{ color: 'var(--text-muted)' }}>No encontrado.</p>

  const birthDateStr = toDateInputValue(dancer.birthDate)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm shrink-0" style={{ color: 'var(--muted-foreground)' }}>
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
          city: dancer.city ?? '',
          gender: dancer.gender ?? '',
          categoryIds: readCategoryIds(dancer),
          secondGroupId: dancer.secondGroupId ?? '',
          notes: dancer.notes,
          photoUrl: dancer.photoUrl ?? '',
        }}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
      />
    </div>
  )
}
