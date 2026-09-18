'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, ShieldCheck, UserCog, GraduationCap, Shield, ToggleLeft, ToggleRight, X } from 'lucide-react'
import {
  getAdminUsers, createAdminUser, updateAdminUserRole,
  toggleAdminUserActive,
} from '@/lib/services/adminUser.service'
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
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

const ROLE_ICONS: Record<AppRole, React.ElementType> = {
  super_admin: Shield,
  admin: ShieldCheck,
  staff: UserCog,
  teacher: GraduationCap,
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

function UserAvatar({ name, role }: { name: string; role: AppRole }) {
  const color = ROLE_COLORS[role]
  return (
    <div className="flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold flex-shrink-0"
      style={{ background: `${color}20`, color }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Modal de crear usuario ────────────────────────────────────────────────────
function CreateUserModal({
  open, onClose, onCreated, myAssignable,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  myAssignable: AppRole[]
}) {
  const toast = useToast()
  const [createError, setCreateError] = useState('')

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { role: 'staff' },
  })

  const handleCreate = async (data: FormData) => {
    setCreateError('')
    try {
      await createAdminUser({
        name: data.name,
        email: data.email,
        role: data.role,
        documentNumber: data.documentNumber,
      })
      toast(`Usuario ${data.name} creado. Deberá crear su contraseña en el primer ingreso.`)
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
              <select className="field-input" defaultValue="staff"
                onChange={e => setValue('role', e.target.value as any)}>
                {myAssignable.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>

          <Separator style={{ background: 'var(--border)', margin: '0 -1.5rem', width: 'calc(100% + 3rem)' }} />

          <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--bg-surface)' }}>
            <p className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Permisos por rol:</p>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <span style={{ color: 'var(--gold)' }}>Administrador</span> — acceso completo.<br />
              <span style={{ color: 'var(--status-paid)' }}>Administrativo</span> — bailarines, grupos y contabilidad.<br />
              <span style={{ color: 'var(--text-secondary)' }}>Instructor</span> — solo consulta de grupos y horarios.
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

  const load = async () => { setLoading(true); setUsers(await getAdminUsers()); setLoading(false) }
  useEffect(() => { load() }, [])

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
    await updateAdminUserRole(user.id, role, me ? { id: me.id, name: me.name } : undefined)
    toast('Rol actualizado')
    load()
  }

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Usuarios con acceso al sistema administrativo.
        </p>
        {canManage && myAssignable.length > 0 && (
          <Button onClick={() => setCreateOpen(true)}
            style={{ background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', color: '#000', border: 'none' }}>
            <Plus size={15} className="mr-2" /> Nuevo usuario
          </Button>
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
        <CardContent className="p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th className="max-md:hidden">Acceso</th>
                <th className="max-md:hidden">Rol</th>
                <th>Estado</th>
                {canManage && <th className="saoko-col-action"> </th>}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isSelf = u.id === me?.id
                const isSuperAdmin = u.role === 'super_admin'
                return (
                  <tr key={u.id}>
                    <td className="min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="max-md:hidden"><UserAvatar name={u.name} role={u.role} /></div>
                        <p className="truncate" style={{ fontWeight: 500 }}>{u.name}{isSelf ? ' (tú)' : ''}</p>
                      </div>
                    </td>
                    <td className="max-md:hidden" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {isSuperAdmin
                        ? <span style={{ color: 'var(--text-muted)' }}>Cédula: {u.documentNumber ?? '—'}</span>
                        : (
                          <span className="flex flex-col gap-0.5 min-w-0">
                            <span className="truncate">{u.email}</span>
                            {u.mustSetPassword && (
                              <span style={{ color: 'var(--gold)', fontSize: '0.72rem' }}>Pendiente de contraseña</span>
                            )}
                          </span>
                        )}
                    </td>
                    <td className="max-md:hidden">
                      {canManage && !isSelf && !isSuperAdmin && myAssignable.length > 0 ? (
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u, e.target.value as AppRole)}
                          style={{
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                            borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.8rem',
                            padding: '4px 8px', cursor: 'pointer', outline: 'none',
                          }}>
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
                    {canManage && (
                      <td className="saoko-col-action">
                        <div className="hidden md:block">
                          {!isSuperAdmin && !isSelf && (
                            <Button variant="ghost" size="sm" onClick={() => handleToggle(u)}
                              style={{ color: u.isActive ? 'var(--status-debt)' : 'var(--status-paid)', fontSize: '0.8rem' }}>
                              {u.isActive
                                ? <><ToggleRight size={15} className="mr-1" />Desactivar</>
                                : <><ToggleLeft size={15} className="mr-1" />Activar</>}
                            </Button>
                          )}
                        </div>
                        <div className="md:hidden">
                          <TableRowMenu details={[
                            { label: 'Acceso', value: isSuperAdmin ? `Cédula: ${u.documentNumber ?? '—'}` : (u.email || '—') },
                            { label: 'Rol', value: ROLE_LABELS[u.role] },
                          ]}>
                            {!isSuperAdmin && !isSelf && (
                              <DropdownMenuItem style={{ cursor: 'pointer' }} onClick={() => handleToggle(u)}>
                                {u.isActive ? 'Desactivar' : 'Activar'}
                              </DropdownMenuItem>
                            )}
                          </TableRowMenu>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    Sin usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
        myAssignable={myAssignable}
      />
    </div>
  )
}
