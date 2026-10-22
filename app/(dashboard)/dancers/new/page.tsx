'use client'
import { useRouter } from 'next/navigation'
import { getCategories } from '@/lib/services/catalog.service'
import { createDancer } from '@/lib/services/dancer.service'
import { persistSecondGroupChoice } from '@/lib/services/group.service'
import { DancerForm, type DancerFormData } from '@/components/dancers/DancerForm'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/components/shared/Toast'
import { isoToTs } from '@/lib/utils/dates'
import { packDancerCategories } from '@/lib/utils/dancerCategories'
import type { BloodType, Gender } from '@/types'

export default function NewDancerPage() {
  const router = useRouter()
  const toast  = useToast()

  const handleSubmit = async (data: DancerFormData) => {
    const cats = await getCategories(false)
    const categories = packDancerCategories(cats, data.categoryIds)
    const id   = await createDancer({
      fullName: data.fullName, documentNumber: data.documentNumber,
      birthDate: isoToTs(data.birthDate), address: data.address,
      neighborhood: data.neighborhood, commune: data.commune,
      city: data.city, gender: (data.gender || '') as Gender,
      eps: data.eps, epsLocation: data.epsLocation,
      bloodType: data.bloodType as BloodType, email: data.email,
      phone: data.phone, ...categories, isActive: true,
      inactiveDate: null, notes: data.notes,
      currentGroupId: null, currentGroupName: null, photoUrl: data.photoUrl || null,
    })
    await persistSecondGroupChoice(id, data.fullName, cats, data.categoryIds, data.secondGroupId)
    toast('Bailarín creado correctamente')
    router.push(`/dancers/${id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Nuevo Bailarín"
        description="Los campos marcados con * son obligatorios. La foto no lo es."
      />
      <DancerForm onSubmit={handleSubmit} submitLabel="Crear Bailarín" />
    </div>
  )
}
