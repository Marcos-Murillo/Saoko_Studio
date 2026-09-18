'use client'
import { useEffect, useState } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { getGroupById, updateGroup } from '@/lib/services/group.service'
import { getModalities, getCategories, getLevels } from '@/lib/services/catalog.service'
import { GroupForm, type GroupFormData } from '@/components/groups/GroupForm'
import { useToast } from '@/components/shared/Toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { RequirePermission } from '@/components/auth/RequirePermission'
import type { Group } from '@/types'

export default function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const toast = useToast()
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { getGroupById(id).then(g => { setGroup(g); setLoading(false) }) }, [id])

  const handleSubmit = async (data: GroupFormData) => {
    try {
      const [mods, cats, lvls] = await Promise.all([getModalities(false), getCategories(false), getLevels()])
      const mod = mods.find(m => m.id === data.modalityId)
      const cat = cats.find(c => c.id === data.categoryId)
      const lvl = data.levelId ? lvls.find(l => l.id === data.levelId) : null
      await updateGroup(id, {
        name: data.name,
        modalityId: data.modalityId,
        modalityName: mod?.name ?? '',
        categoryId: data.categoryId,
        categoryName: cat?.name ?? '',
        levelId: data.levelId || null,
        levelName: lvl?.name ?? null,
        monthlyFee: data.monthlyFee,
        description: data.description,
      })
      toast('Grupo actualizado')
      router.push(`/groups/${id}`)
    } catch { toast('Error al actualizar', 'error') }
  }

  if (loading) return <PageLoader />
  if (!group) return <p style={{ color: 'var(--text-muted)' }}>No encontrado.</p>

  return (
    <RequirePermission permission="canManageGroups">
    <div className="max-w-2xl">
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 24 }}>
        Editando: <strong style={{ color: 'var(--text-primary)' }}>{group.name}</strong>
        <br />
        <span style={{ color: 'var(--status-partial)', fontSize: '0.8rem' }}>
          ⚠ Cambiar la mensualidad no afecta las mensualidades ya generadas — solo las futuras.
        </span>
      </p>
      <GroupForm
        defaultValues={{
          name: group.name,
          modalityId: group.modalityId,
          categoryId: group.categoryId,
          levelId: group.levelId ?? '',
          monthlyFee: group.monthlyFee,
          description: group.description,
        }}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
      />
    </div>
    </RequirePermission>
  )
}
