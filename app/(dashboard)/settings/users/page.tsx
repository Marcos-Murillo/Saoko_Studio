'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Search, ShieldCheck, UserCog, GraduationCap, Shield, UserRound, X } from 'lucide-react'
import { ensureDancerClaims } from '@/lib/services/dancerClaim.service'
import {
  getAdminUsers, createAdminUser, updateAdminUserRole,
  toggleAdminUserActive, deleteAdminUser,
} from '@/lib/services/adminUser.service'
import { assignTeacherGroups, getGroups } from '@/lib/services/group.service'
import type { Group } from '@/types'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/components/shared/Toast'
import { ROLE_LABELS, ROLE_COLORS, assignableRoles, PERMISSIONS } from '@/lib/auth/roles'
import type { AppRole } from '@/lib/auth/roles'
import type { AdminUser } from '@/lib/auth/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PagedTable } from '@/components/shared/TablePagination'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const ROLE_ICONS: Record<AppRole, React.ElementType> = {
  super_admin: Shield,
  admin: ShieldCheck,
  staff: UserCog,
  teacher: GraduationCap,
  student: UserRound,
}

const schema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Correo inválido'),
  role: z.enum(['admin', 'staff', 'teacher'] as const),
  documentNumber: z.string().min(6, 'Cédula requerida (mínimo 6 dígitos)'),
})
type FormData = z.infer<typeof schema>

function RoleBadge({ role }: { role: AppRole }) {
  const color = ROLE_COLORS[role]
  return (
    <span style={{
      color, background: `${color}18`, border: `1px solid ${color}30`,
      borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {ROLE_LABELS[role]}
    </span>
  )
}

function canDeleteTarget(actorRole: AppRole, target: AdminUser, selfId?: string) {
  if (target.id === selfId) return false
  if (actorRole === 'super_admin') return true
  if (actorRole === 'admin') return target.role === 'staff' || target.role === 'teacher' || target.role === 'student'
  return false
}

function UserAvatar({ name, role }: { name: string; role: AppRole }) {
  const color = ROLE_COLORS[role]
  return (
    <div className="flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold flex-shrink-0"
      style={{ background: `${color}20`, color }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function TeacherGroupPicker({
  groups, selected, onChange,
}: {
  groups: Group[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id])
  }
  return (
    <div className="flex flex-col gap-2" style={{ gridColumn: '1 / -1' }}>
      <Label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Grupos que va a dictar *</Label>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Si también es bailarín, no paga ningún grupo en el que esté inscrito.
      </p>
      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-xl p-2" style={{ border: '1px solid var(--border)' }}>
        {groups.length === 0 && (
          <p className="px-2 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No hay grupos activos.</p>
        )}
        {groups.map(group => (
          <label key={group.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm" style={{ color: 'var(--foreground)' }}>
            <input
              type="checkbox"
              checked={selected.includes(group.id)}
              onChange={() => toggle(group.id)}
            />
            {group.name}
          </label>
        ))}
      </div>
    </div>
  )
}

// ─── Modal de crear usuario ────────────────────────────────────────────────────
function CreateUserModal({
  open, onClose, onCreated, myAssignable, groups,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  myAssignable: AppRole[]
  groups: Group[]
}) {
  const toast = useToast()
  const [createError, setCreateError] = useState('')
  const [teachIds, setTeachIds] = useState<string[]>([])

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { role: 'staff' },
  })
  const pickedRole = watch('role')

  const handleCreate = async (data: FormData) => {
    setCreateError('')
    if (data.role === 'teacher' && teachIds.length === 0) {
      setCreateError('Elige el grupo o los grupos que va a dictar.')
      return
    }
    try {
      const uid = await createAdminUser({
        name: data.name,
        email: data.email,
        role: data.role,
        documentNumber: data.documentNumber,
      })
      if (data.role === 'teacher') await assignTeacherGroups(uid, data.name, teachIds)
      toast(`Usuario ${data.name} creado. Deberá crear su contraseña en el primer ingreso.`)
      setTeachIds([])
      reset()
      onCreated()
      onClose()
    } catch (e: any) {
      const msg = e?.code === 'auth/email-already-in-use'
        ? 'Este correo ya está registrado.'
        : e?.message ?? 'Error al crear usuario'
      setCreateError(msg)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl flex flex-col gap-0"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            Nuevo usuario administrativo
          </h3>
          <button onClick={onClose}
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(handleCreate)} className="flex flex-col gap-4 px-6 py-5">
          {createError && (
            <Alert style={{ background: 'var(--status-debt-bg)', border: '1px solid rgba(224,82,82,0.3)' }}>
              <AlertDescription style={{ color: 'var(--status-debt)', fontSize: '0.8rem' }}>
                {createError}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {/* Name */}
            <div className="flex flex-col gap-1.5" style={{ gridColumn: '1 / -1' }}>
              <Label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Nombre completo *</Label>
              <Input placeholder="María González" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                {...register('name')} />
              {errors.name && <p className="text-xs" style={{ color: 'var(--status-debt)' }}>{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5" style={{ gridColumn: '1 / -1' }}>
              <Label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Correo electrónico *</Label>
              <Input type="email" placeholder="maria@saokostudio.com" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                {...register('email')} />
              {errors.email && <p className="text-xs" style={{ color: 'var(--status-debt)' }}>{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5" style={{ gridColumn: '1 / -1' }}>
              <Label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Cédula *</Label>
              <Input placeholder="1007261234" inputMode="numeric" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                {...register('documentNumber')} />
              {errors.documentNumber && <p className="text-xs" style={{ color: 'var(--status-debt)' }}>{errors.documentNumber.message}</p>}
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                El usuario creará su propia contraseña la primera vez que ingrese, con este correo y cédula.
              </p>
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1.5" style={{ gridColumn: '1 / -1' }}>
              <Label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Rol *</Label>
              <select className="field-input" value={pickedRole}
                onChange={e => setValue('role', e.target.value as FormData['role'])}>
                {myAssignable.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
            </select>
          </div>
          {pickedRole === 'teacher' && (
            <TeacherGroupPicker groups={groups} selected={teachIds} onChange={setTeachIds} />
          )}
        </div>

          <Separator style={{ background: 'var(--border)', margin: '0 -1.5rem', width: 'calc(100% + 3rem)' }} />

          <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--bg-surface)' }}>
            <p className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Permisos por rol:</p>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <span style={{ color: 'var(--gold)' }}>Administrador</span> — acceso completo.<br />
              <span style={{ color: 'var(--status-paid)' }}>Administrativo</span> — bailarines, grupos y contabilidad.<br />
              <span style={{ color: 'var(--text-secondary)' }}>Instructor</span> — ve los grupos que dicta y, si es bailarín, su espacio de usuario.
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}
              style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}
              style={{ background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', color: '#000', border: 'none' }}>
              {isSubmitting ? 'Creando...' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { adminUser: me } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null)
  const [viewing, setViewing] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [catalog, setCatalog] = useState<Group[]>([])
  const [teacherTarget, setTeacherTarget] = useState<AdminUser | null>(null)
  const [teacherGroups, setTeacherGroups] = useState<string[]>([])
  const [teacherSaving, setTeacherSaving] = useState(false)

  const load = async () => { setLoading(true); setUsers(await getAdminUsers()); setLoading(false) }
  useEffect(() => { load() }, [])
  useEffect(() => { getGroups(true).then(setCatalog).catch(() => {}) }, [])

  const canManage = me ? PERMISSIONS.canManageUsers(me.role) : false
  const myAssignable = me ? assignableRoles(me.role) : []

  const handleToggle = async (user: AdminUser) => {
    if (user.id === me?.id) { toast('No puedes desactivarte a ti mismo', 'error'); return }
    await toggleAdminUserActive(user.id, !user.isActive)
    toast(user.isActive ? 'Usuario desactivado' : 'Usuario activado')
    load()
  }

  const handleRoleChange = async (user: AdminUser, role: AppRole) => {
    if (!me || !PERMISSIONS.canAssignRole(me.role, role)) {
      toast('Sin permisos para asignar este rol', 'error'); return
    }
    if (role === 'teacher') {
      setTeacherTarget(user)
      setTeacherGroups(catalog.filter(group => group.instructorId === user.id).map(group => group.id))
      return
    }
    if (user.role === 'teacher') await assignTeacherGroups(user.id, user.name, [])
    await updateAdminUserRole(user.id, role, { id: me.id, name: me.name })
    toast('Rol actualizado')
    load()
  }

  const confirmTeacher = async () => {
    if (!teacherTarget || !me) return
    if (teacherGroups.length === 0) {
      toast('Elige al menos un grupo', 'error')
      return
    }
    setTeacherSaving(true)
    try {
      await updateAdminUserRole(teacherTarget.id, 'teacher', { id: me.id, name: me.name })
      await assignTeacherGroups(teacherTarget.id, teacherTarget.name, teacherGroups)
      toast(`${teacherTarget.name} queda como profesor de ${teacherGroups.length} grupo${teacherGroups.length === 1 ? '' : 's'}`)
      setTeacherTarget(null)
      await load()
      setCatalog(await getGroups(true))
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo vincular el profesor', 'error')
    } finally {
      setTeacherSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete || !me) return
    setDeleting(true)
    try {
      const result = await deleteAdminUser(pendingDelete, { id: me.id, name: me.name })
      toast(result.authRemoved
        ? `Se borraron todos los datos de ${pendingDelete.name}`
        : `Se borraron los datos de ${pendingDelete.name}. La cuenta de acceso sigue activa porque ya tenía contraseña.`)
      setPendingDelete(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo eliminar el usuario', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const needle = search.trim().toLowerCase()
  const visible = users.filter(user => {
    if (!needle) return true
    return [user.name, user.email, user.documentNumber, ROLE_LABELS[user.role]]
      .some(value => (value || '').toLowerCase().includes(needle))
  })

  if (loading) return <PageLoader />

  return (
    <div className="saoko-limit flex flex-col gap-6 max-w-[1400px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Los bailarines se registran solos y entran como estudiantes. Desde aquí les asignas el rol de profesor.
        </p>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={syncing}
              onClick={async () => {
                setSyncing(true)
                try {
                  const ready = await ensureDancerClaims()
                  toast(`${ready} bailarines pueden crear su contraseña`)
                } catch {
                  toast('No se pudo preparar el acceso de los bailarines', 'error')
                } finally {
                  setSyncing(false)
                }
              }}
              variant="outline"
              style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {syncing ? 'Activando...' : 'Activar accesos'}
            </Button>
            {myAssignable.some(role => role !== 'student') && (
              <Button onClick={() => setCreateOpen(true)}
                style={{ background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', color: '#000', border: 'none' }}>
                <Plus size={15} className="mr-2" /> Nuevo usuario
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Role legend */}
      <div className="flex gap-3 flex-wrap">
        {(Object.keys(ROLE_LABELS) as AppRole[]).map(r => {
          const Icon = ROLE_ICONS[r]
          return (
            <div key={r} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <Icon size={13} style={{ color: ROLE_COLORS[r] }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{ROLE_LABELS[r]}</span>
            </div>
          )
        })}
      </div>

      <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por nombre, correo, cédula o rol"
              aria-label="Buscar usuarios"
              className="pl-9"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <p className="shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
            {visible.length === users.length ? `${users.length} usuarios` : `${visible.length} de ${users.length}`}
          </p>
        </div>
        <CardContent className="p-0">
          <PagedTable items={visible} resetKey={search}>
          {rows => (
          <div className="overflow-x-auto">
          <table className="data-table" style={{ tableLayout: 'auto', minWidth: 980 }}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Cédula</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Contraseña</th>
                <th style={{ width: '1%' }}> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(u => {
                const isSelf = u.id === me?.id
                const isSuperAdmin = u.role === 'super_admin'
                const removable = me ? canDeleteTarget(me.role, u, me.id) : false
                return (
                  <tr key={u.id}>
                    <td className="min-w-[180px]">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar name={u.name} role={u.role} />
                        <p className="truncate" style={{ fontWeight: 500 }}>{u.name}{isSelf ? ' (tú)' : ''}</p>
                      </div>
                    </td>
                    <td className="min-w-[200px]" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <span className="block truncate">{u.email || '—'}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.documentNumber || '—'}</td>
                    <td>
                      {canManage && !isSelf && !isSuperAdmin && myAssignable.length > 0 ? (
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u, e.target.value as AppRole)}
                          style={{
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                            borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.8rem',
                            padding: '4px 8px', cursor: 'pointer', outline: 'none',
                          }}>
                          {!myAssignable.includes(u.role) && <option value={u.role}>{ROLE_LABELS[u.role]}</option>}
                          {myAssignable.map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      ) : (
                        <RoleBadge role={u.role} />
                      )}
                    </td>
                    <td>
                      {u.isActive
                        ? <span className="badge-paid">Activo</span>
                        : <span className="badge-debt">Inactivo</span>}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: u.mustSetPassword ? 'var(--gold)' : 'var(--text-muted)' }}>
                      {u.mustSetPassword ? 'Pendiente' : 'Creada'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <TableRowMenu>
                        <DropdownMenuItem style={{ cursor: 'pointer' }} onClick={() => setViewing(u)}>
                          Ver usuario
                        </DropdownMenuItem>
                        {canManage && !isSuperAdmin && !isSelf && (
                          <DropdownMenuItem style={{ cursor: 'pointer' }} onClick={() => handleToggle(u)}>
                            {u.isActive ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                        )}
                        {removable && (
                          <DropdownMenuItem style={{ cursor: 'pointer', color: 'var(--status-debt)' }} onClick={() => setPendingDelete(u)}>
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </TableRowMenu>
                    </td>
                  </tr>
                )
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    {users.length === 0 ? 'Sin usuarios registrados' : 'Ningún usuario coincide con la búsqueda'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          )}
          </PagedTable>
        </CardContent>
      </Card>

      <Dialog open={viewing !== null} onOpenChange={open => { if (!open) setViewing(null) }}>
        <DialogContent style={{ background: 'var(--popover)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--foreground)' }}>{viewing?.name}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="flex flex-col gap-3 text-sm">
              <p style={{ color: 'var(--muted-foreground)' }}>Correo <span style={{ color: 'var(--foreground)' }}>{viewing.email || '—'}</span></p>
              <p style={{ color: 'var(--muted-foreground)' }}>Cédula <span style={{ color: 'var(--foreground)' }}>{viewing.documentNumber || '—'}</span></p>
              <p style={{ color: 'var(--muted-foreground)' }}>Rol <span style={{ color: 'var(--foreground)' }}>{ROLE_LABELS[viewing.role]}</span></p>
              <p style={{ color: 'var(--muted-foreground)' }}>Estado <span style={{ color: 'var(--foreground)' }}>{viewing.isActive ? 'Activo' : 'Inactivo'}</span></p>
              <p style={{ color: 'var(--muted-foreground)' }}>Contraseña <span style={{ color: 'var(--foreground)' }}>{viewing.mustSetPassword ? 'Pendiente' : 'Creada'}</span></p>
              {viewing.dancerId && (
                <Link href={`/dancers/${viewing.dancerId}`} style={{ color: 'var(--gold)', fontWeight: 600 }}>
                  Ver ficha de bailarín
                </Link>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar usuario"
        description={pendingDelete
          ? `Se borran todos los datos de ${pendingDelete.name}: cuenta, ficha, grupos, pagos y acudiente. No se puede deshacer.`
          : ''}
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => { if (!deleting) setPendingDelete(null) }}
      />

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
        myAssignable={myAssignable.filter(role => role !== 'student')}
        groups={catalog}
      />

      <Dialog open={teacherTarget !== null} onOpenChange={open => { if (!open && !teacherSaving) setTeacherTarget(null) }}>
        <DialogContent style={{ background: 'var(--popover)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--foreground)' }}>Grupos de {teacherTarget?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Elige los grupos que va a dictar. Si es bailarín, queda exento de la mensualidad de todos los grupos en los que esté inscrito.
          </p>
          <TeacherGroupPicker groups={catalog} selected={teacherGroups} onChange={setTeacherGroups} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={teacherSaving} onClick={() => setTeacherTarget(null)}
              style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
              Cancelar
            </Button>
            <Button disabled={teacherSaving} onClick={confirmTeacher}
              style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none' }}>
              {teacherSaving ? 'Guardando...' : 'Vincular'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
