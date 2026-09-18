'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Search, Users, Pencil, Trash2 } from 'lucide-react'
import { getGroups, updateGroup, deleteGroup } from '@/lib/services/group.service'
import { getModalities, getCategories, getLevels } from '@/lib/services/catalog.service'
import { ActiveBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/components/shared/Toast'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatCurrency } from '@/lib/utils/currency'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { BTN } from '@/components/shared/buttonStyles'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { GroupForm, type GroupFormData } from '@/components/groups/GroupForm'
import { useAuth } from '@/lib/auth/AuthContext'
import { PERMISSIONS } from '@/lib/auth/roles'
import type { Group } from '@/types'

import { LinkButton } from '@/components/shared/LinkButton'

export default function GroupsPage() {
  const toast = useToast()
  const { adminUser } = useAuth()
  const canWrite = !!adminUser && PERMISSIONS.canManageGroups(adminUser.role)
  const [groups,  setGroups]  = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState<'all'|'active'|'inactive'>('active')
  const [editing, setEditing] = useState<Group | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)

  const load = async () => {
    setLoading(true)
    setGroups(await getGroups(false))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => groups.filter(g => {
    const ok = filter === 'all' || (filter === 'active' ? g.isActive : !g.isActive)
    const q  = search.toLowerCase()
    return ok && (!q || g.name.toLowerCase().includes(q) || (g.modalityName ?? '').toLowerCase().includes(q))
  }), [groups, search, filter])

  const handleEditSubmit = async (data: GroupFormData) => {
    if (!editing) return
    const [mods, cats, lvls] = await Promise.all([getModalities(false), getCategories(false), getLevels()])
    const mod = mods.find(m => m.id === data.modalityId)
    const cat = cats.find(c => c.id === data.categoryId)
    const lvl = data.levelId ? lvls.find(l => l.id === data.levelId) : null
    await updateGroup(editing.id, {
      name: data.name, modalityId: data.modalityId, modalityName: mod?.name ?? '',
      categoryId: data.categoryId, categoryName: cat?.name ?? '',
      levelId: data.levelId || null, levelName: lvl?.name ?? null,
      monthlyFee: data.monthlyFee, description: data.description,
    })
    toast('Grupo actualizado')
    setEditing(null); load()
  }

  if (loading) return <PageLoader />

  const filterBtns = [
    { key: 'active' as const, label: 'Activos' },
    { key: 'inactive' as const, label: 'Inactivos' },
    { key: 'all' as const, label: 'Todos' },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      <PageHeader
        title="Grupos"
        description="Administra los grupos de baile, sus categorías y tarifas."
        action={canWrite ? (
          <LinkButton href="/groups/new" variant="primary" style={BTN.create}>
            <Plus size={15} />Nuevo Grupo
          </LinkButton>
        ) : undefined}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
          <Input className="pl-9" placeholder="Buscar por nombre o modalidad…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
        </div>
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {filterBtns.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-4 py-2 text-sm transition-colors"
              style={{
                background: filter === f.key ? 'rgba(201,168,76,.14)' : 'transparent',
                color:      filter === f.key ? 'var(--gold)' : 'var(--muted-foreground)',
                fontWeight: filter === f.key ? 600 : 400,
                border: 'none', cursor: 'pointer',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardContent className="flex flex-col items-center py-20 gap-3">
            <Users size={36} style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No se encontraron grupos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(g => (
            <Card key={g.id}
              className="flex flex-col transition-all duration-150"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,.5)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <CardContent className="pt-5 flex flex-col gap-4 h-full">
                {/* Top */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'rgba(201,168,76,.12)' }}>
                    <Users size={18} style={{ color: 'var(--gold)' }} />
                  </div>
                  <div className="flex items-center gap-2">
                    {canWrite && (
                      <>
                        <Button variant="ghost" size="icon-sm" onClick={e => { e.stopPropagation(); setEditing(g) }}
                          style={{ color: '#90caf9' }}>
                          <Pencil size={13} />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={e => { e.stopPropagation(); setDeleteTarget(g) }}
                          style={{ color: '#ef9a9a' }}>
                          <Trash2 size={13} />
                        </Button>
                        <Switch
                          checked={g.isActive}
                          onCheckedChange={async v => {
                            await updateGroup(g.id, { isActive: v })
                            toast(v ? 'Grupo activado' : 'Grupo desactivado')
                            load()
                          }}
                          className="data-checked:bg-[#4caf7d]"
                          size="sm"
                        />
                      </>
                    )}
                    {!canWrite && <ActiveBadge isActive={g.isActive} />}
                  </div>
                </div>

                {/* Info */}
                <div>
                  <Link href={`/groups/${g.id}`} style={{ textDecoration: 'none' }}>
                    <p className="font-bold text-[1rem] leading-snug" style={{ color: 'var(--foreground)' }}>{g.name}</p>
                  </Link>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    {[g.modalityName, g.categoryName, g.levelName].filter(Boolean).join(' · ')}
                  </p>
                </div>

                <Separator style={{ background: 'var(--border)' }} />

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Mensualidad</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--gold)' }}>{formatCurrency(g.monthlyFee)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.65rem] uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Integrantes</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{g.memberCount ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Drawer */}
      <Sheet open={!!editing} onOpenChange={v => { if (!v) setEditing(null) }}>
        <SheetContent side="right"
          style={{
            background: 'rgba(18,18,18,.92)',
            backdropFilter: 'blur(24px)',
            overflowY: 'auto',
            padding: 0,
          }}>
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle style={{ color: 'var(--foreground)' }}>Editar — {editing?.name}</SheetTitle>
            {editing?.monthlyFee !== undefined && (
              <p className="text-xs mt-1" style={{ color: '#e8a030' }}>
                ⚠ Cambiar la mensualidad solo afecta cuotas futuras, no las ya generadas.
              </p>
            )}
          </SheetHeader>
          <Separator style={{ background: 'var(--border)' }} />
          {editing && (
            <div className="px-6 py-5">
              <GroupForm
                compact
                defaultValues={{
                  name:        editing.name,
                  modalityId:  editing.modalityId,
                  categoryId:  editing.categoryId,
                  levelId:     editing.levelId ?? '',
                  monthlyFee:  editing.monthlyFee,
                  description: editing.description,
                }}
                onSubmit={handleEditSubmit}
                submitLabel="Guardar cambios"
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar grupo"
        description={`Se retirarán los integrantes actuales y se eliminará “${deleteTarget?.name}”. El historial de inscripciones queda cerrado.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={async () => {
          if (!deleteTarget) return
          await deleteGroup(deleteTarget.id)
          toast('Grupo eliminado')
          setDeleteTarget(null)
          load()
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
