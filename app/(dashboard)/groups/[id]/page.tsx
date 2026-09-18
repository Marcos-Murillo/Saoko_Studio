'use client'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, UserPlus, UserMinus, DollarSign, CalendarDays, Trash2 } from 'lucide-react'
import { getGroupById, getGroupMembers, enrollDancer, unenrollDancer, updateGroup, deleteGroup } from '@/lib/services/group.service'
import { getDancers } from '@/lib/services/dancer.service'
import { getSchedulesByGroup } from '@/lib/services/schedule.service'
import { useAuth } from '@/lib/auth/AuthContext'
import { PERMISSIONS } from '@/lib/auth/roles'
import { useToast } from '@/components/shared/Toast'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ActiveBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/dates'
import { StatMini } from '@/components/shared/KpiCard'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { BTN } from '@/components/shared/buttonStyles'
import type { Group, GroupMembership, Dancer, Schedule } from '@/types'

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const toast = useToast()
  const { adminUser } = useAuth()
  const canWrite = !!adminUser && PERMISSIONS.canManageGroups(adminUser.role)
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMembership[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [allDancers, setAllDancers] = useState<Dancer[]>([])
  const [loading, setLoading] = useState(true)
  const [showEnroll, setShowEnroll] = useState(false)
  const [search, setSearch] = useState('')
  const [unenrollTarget, setUnenrollTarget] = useState<GroupMembership | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = async () => {
    const [g, m, s, d] = await Promise.all([
      getGroupById(id), getGroupMembers(id), getSchedulesByGroup(id),
      canWrite ? getDancers(true) : Promise.resolve([] as Dancer[]),
    ])
    setGroup(g); setMembers(m); setSchedules(s); setAllDancers(d); setLoading(false)
  }

  useEffect(() => { load() }, [id, canWrite])

  const handleEnroll = async (dancer: Dancer) => {
    if (!group) return
    try {
      await enrollDancer(dancer.id, dancer.fullName, id, group.name, group.monthlyFee)
      toast(`${dancer.fullName} inscrito en ${group.name}`)
      setShowEnroll(false); setSearch(''); load()
    } catch { toast('Error al inscribir', 'error') }
  }

  const handleUnenroll = async () => {
    if (!unenrollTarget) return
    await unenrollDancer(unenrollTarget.id, unenrollTarget.dancerId, id)
    toast('Bailarín retirado del grupo')
    setUnenrollTarget(null); load()
  }

  const toggleActive = async (v: boolean) => {
    if (!group) return
    await updateGroup(id, { isActive: v })
    toast(v ? 'Grupo activado' : 'Grupo desactivado')
    load()
  }

  if (loading) return <PageLoader />
  if (!group) return <p style={{ color: 'var(--text-muted)' }}>Grupo no encontrado.</p>

  const enrolledIds = new Set(members.map(m => m.dancerId))
  const available = allDancers.filter(d =>
    !enrolledIds.has(d.id) && d.fullName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.35rem', fontWeight: 700 }}>{group.name}</h2>
              {canWrite ? (
                <Switch checked={group.isActive} onCheckedChange={toggleActive} className="data-checked:bg-[#4caf7d]" />
              ) : (
                <ActiveBadge isActive={group.isActive} />
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {[group.modalityName, group.categoryName, group.levelName].filter(Boolean).join(' · ')}
            </p>
            {group.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8 }}>{group.description}</p>
            )}
          </div>
          {canWrite && (
          <div className="flex gap-2 flex-shrink-0">
            <Link href={`/groups/${id}/edit`}>
              <Button size="sm" style={BTN.edit}><Pencil size={14} />Editar</Button>
            </Link>
            <Button size="sm" style={BTN.danger} onClick={() => setDeleteOpen(true)}>
              <Trash2 size={14} />Eliminar
            </Button>
          </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5">
          {[
            { label: 'MENSUALIDAD', value: formatCurrency(group.monthlyFee), color: 'var(--gold)' },
            { label: 'INTEGRANTES', value: String(members.length), color: 'var(--foreground)' },
            { label: 'HORARIOS', value: String(schedules.length), color: 'var(--foreground)' },
          ].map(s => (
            <StatMini key={s.label} label={s.label} value={s.value} color={s.color} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Members */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <p style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Integrantes ({members.length})
            </p>
            {canWrite && (
            <button className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1" onClick={() => setShowEnroll(!showEnroll)}>
              <UserPlus size={12} />Inscribir
            </button>
            )}
          </div>

          {showEnroll && (
            <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <input className="field-input mb-2 text-sm" placeholder="Buscar bailarín activo..."
                value={search} onChange={e => setSearch(e.target.value)} autoFocus />
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {available.slice(0, 8).map(d => (
                  <button key={d.id} onClick={() => handleEnroll(d)}
                    className="flex items-center justify-between px-2 py-1.5 rounded text-left"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', width: '100%' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{d.fullName}</span>
                    <span style={{ color: 'var(--gold)', fontSize: '0.75rem' }}>+ Inscribir</span>
                  </button>
                ))}
                {available.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '0.5rem' }}>Sin resultados</p>}
              </div>
            </div>
          )}

          {members.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin integrantes</p>
            : members.map(m => (
              <div key={m.id} className="flex items-center justify-between py-2.5"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500 }}>{m.dancerName}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Desde {formatDate(m.startDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canWrite && (
                    <>
                  <Link href={`/dancers/${m.dancerId}/financial`}>
                    <button style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }} title="Ver finanzas">
                      <DollarSign size={14} />
                    </button>
                  </Link>
                  <button onClick={() => setUnenrollTarget(m)}
                    style={{ color: 'var(--status-debt)', background: 'none', border: 'none', cursor: 'pointer' }} title="Retirar">
                    <UserMinus size={14} />
                  </button>
                    </>
                  )}
                </div>
              </div>
            ))
          }
        </div>

        {/* Schedules */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <p style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Horarios
            </p>
            {canWrite && (
            <Link href={`/schedules?groupId=${id}`}>
              <button className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                <CalendarDays size={12} />Gestionar
              </button>
            </Link>
            )}
          </div>
          {schedules.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin horarios registrados</p>
            : schedules.map(s => (
              <div key={s.id} className="py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500 }}>
                  {s.dayOfWeek}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  {s.startTime} – {s.endTime}
                  {s.location && ` · ${s.location}`}
                </p>
              </div>
            ))
          }
        </div>
      </div>

      <ConfirmDialog
        open={!!unenrollTarget}
        title="Retirar del grupo"
        description={`¿Retirar a ${unenrollTarget?.dancerName} de ${group.name}? El historial se conservará.`}
        confirmLabel="Retirar"
        variant="danger"
        onConfirm={handleUnenroll}
        onCancel={() => setUnenrollTarget(null)}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar grupo"
        description={`Se retirarán los integrantes y se eliminará “${group.name}”.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={async () => {
          await deleteGroup(id)
          toast('Grupo eliminado')
          router.push('/groups')
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
