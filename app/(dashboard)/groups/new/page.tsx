'use client'
import { useRouter } from 'next/navigation'
import { GroupForm, type GroupFormData } from '@/components/groups/GroupForm'
import { createGroup } from '@/lib/services/group.service'
import { getModalities, getCategories, getLevels } from '@/lib/services/catalog.service'
import { useToast } from '@/components/shared/Toast'
import { RequirePermission } from '@/components/auth/RequirePermission'

export default function NewGroupPage() {
  const router = useRouter()
  const toast = useToast()

  const handleSubmit = async (data: GroupFormData) => {
    try {
      const [mods, cats, lvls] = await Promise.all([getModalities(false), getCategories(false), getLevels()])
      const mod = mods.find(m => m.id === data.modalityId)
      const cat = cats.find(c => c.id === data.categoryId)
      const lvl = data.levelId ? lvls.find(l => l.id === data.levelId) : null

      const id = await createGroup({
        name: data.name,
        modalityId: data.modalityId,
        modalityName: mod?.name ?? '',
        categoryId: data.categoryId,
        categoryName: cat?.name ?? '',
        levelId: data.levelId || null,
        levelName: lvl?.name ?? null,
        monthlyFee: data.monthlyFee,
        description: data.description,
        isActive: true,
        instructorId: null,
        instructorName: null,
      })
      toast('Grupo creado correctamente')
      router.push(`/groups/${id}`)
    } catch {
      toast('Error al crear el grupo', 'error')
    }
  }

  return (
    <RequirePermission permission="canManageGroups">
    <div className="max-w-2xl">
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 24 }}>
        Define la modalidad, categoría, nivel y mensualidad del nuevo grupo.
      </p>
      <GroupForm onSubmit={handleSubmit} submitLabel="Crear Grupo" />
    </div>
    </RequirePermission>
  )
}
