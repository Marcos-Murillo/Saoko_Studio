'use client'
import { useRouter } from 'next/navigation'
import { getCategories } from '@/lib/services/catalog.service'
import { createDancer } from '@/lib/services/dancer.service'
import { DancerForm, type DancerFormData } from '@/components/dancers/DancerForm'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/components/shared/Toast'
import { isoToTs } from '@/lib/utils/dates'
import type { BloodType } from '@/types'

export default function NewDancerPage() {
  const router = useRouter()
  const toast  = useToast()

  const handleSubmit = async (data: DancerFormData) => {
    const cats = await getCategories(false)
    const cat  = cats.find(c => c.id === data.categoryId)
    const id   = await createDancer({
      fullName: data.fullName, documentNumber: data.documentNumber,
      birthDate: isoToTs(data.birthDate), address: data.address,
      neighborhood: data.neighborhood, commune: data.commune,
      eps: data.eps, epsLocation: data.epsLocation,
      bloodType: data.bloodType as BloodType, email: data.email,
      phone: data.phone, categoryId: data.categoryId,
      categoryName: cat?.name ?? '', isActive: true,
      inactiveDate: null, notes: data.notes,
      currentGroupId: null, currentGroupName: null, photoUrl: null,
    })
    toast('Bailarín creado correctamente')
    router.push(`/dancers/${id}`)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Nuevo Bailarín"
        description="Completa la información del bailarín. Los campos marcados con * son obligatorios."
      />
      <DancerForm onSubmit={handleSubmit} submitLabel="Crear Bailarín" />
    </div>
  )
}
