'use client'
import { useEffect, useState, useMemo } from 'react'
import { Plus, Clock, RefreshCw, Pencil, Trash2, CalendarDays, LayoutGrid, List } from 'lucide-react'
import { getSchedules, createSchedule, createSchedulesBatch, updateSchedule } from '@/lib/services/schedule.service'
import { getGroups } from '@/lib/services/group.service'
import { useToast } from '@/components/shared/Toast'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormField } from '@/components/shared/FormField'
import { SaokoCombobox } from '@/components/shared/SaokoCombobox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { BTN } from '@/components/shared/buttonStyles'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth/AuthContext'
import { PERMISSIONS } from '@/lib/auth/roles'
import type { Schedule, Group, DayOfWeek } from '@/types'

const DAYS: DayOfWeek[] = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
const DAY_COLORS = ['#4a90d9','#c9a84c','#4caf7d','#e8a030','#a78bfa','#e05252','#6b7280']

/* ─── Tipo para un slot de día/hora dentro del formulario ────────────────── */
interface TimeSlot {
  id: string       // local id (no Firestore)
  dayOfWeek: DayOfWeek | ''
  startTime: string
  endTime: string
}

function newSlot(): TimeSlot {
  return { id: crypto.randomUUID(), dayOfWeek: '', startTime: '', endTime: '' }
}

/* ─── Calendario semanal ─────────────────────────────────────────────────── */
function WeekCalendar({ schedules, groups }: { schedules: Schedule[]; groups: Group[] }) {
  const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 06:00 – 21:00

  const byDay = useMemo(() => {
    const map: Record<string, Schedule[]> = {}
    DAYS.forEach(d => { map[d] = [] })
    schedules.forEach(s => { if (s.isActive !== false) map[s.dayOfWeek]?.push(s) })
    return map
  }, [schedules])

  const groupIdx = (id: string) => {
    const i = groups.findIndex(g => g.id === id)
    return i >= 0 ? i : 0
  }

  const hourOf = (t: string) => {
    const n = Number(t.slice(0, 2))
    return Number.isFinite(n) ? n : 6
  }

  const inHour = (s: Schedule, hour: number) => {
    const start = hourOf(s.startTime)
    const end = hourOf(s.endTime)
    return hour >= start && hour < Math.max(end, start + 1)
  }

  return (
    <Card style={{ background: 'var(--card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div className="overflow-x-auto">
        <div style={{ display: 'grid', gridTemplateColumns: '72px repeat(7, minmax(120px, 1fr))', minWidth: 920 }}>
          <div className="px-2 py-3 text-center text-[0.65rem] uppercase tracking-widest"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--accent)', color: 'var(--muted-foreground)' }}>
            Hora
          </div>
          {DAYS.map((day, di) => (
            <div key={day} className="px-3 py-3 text-center"
              style={{ borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)', background: 'var(--accent)' }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: DAY_COLORS[di] }}>
                {day.slice(0, 3)}
              </p>
            </div>
          ))}
          {HOURS.map(hour => (
            <div key={`row-${hour}`} style={{ display: 'contents' }}>
              <div className="px-2 py-2 text-[0.7rem] tabular-nums"
                style={{
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--muted-foreground)',
                  background: hour % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent',
                }}>
                {String(hour).padStart(2, '0')}:00
              </div>
              {DAYS.map((day, di) => {
                const items = (byDay[day] ?? []).filter(s => inHour(s, hour))
                return (
                  <div key={`${day}-${hour}`} className="p-1 min-h-[52px] flex flex-col gap-1"
                    style={{
                      borderBottom: '1px solid var(--border)',
                      borderLeft: '1px solid var(--border)',
                      background: hour % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent',
                    }}>
                    {items.map(s => {
                      const color = DAY_COLORS[groupIdx(s.groupId) % DAY_COLORS.length]
                      const isStart = hourOf(s.startTime) === hour
                      if (!isStart) return null
                      return (
                        <div key={s.id} className="rounded-md px-1.5 py-1"
                          style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
                          <p className="text-[0.68rem] font-semibold leading-tight" style={{ color }}>{s.groupName}</p>
                          <p className="text-[0.62rem]" style={{ color: 'var(--muted-foreground)' }}>
                            {s.startTime}–{s.endTime}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

/* ─── Formulario del drawer ──────────────────────────────────────────────── */
interface DrawerFormProps {
  groups: Group[]
  editingSchedule: Schedule | null   // null = crear nuevos
  onClose: () => void
  onSaved: () => void
}

function ScheduleDrawerForm({ groups, editingSchedule, onClose, onSaved }: DrawerFormProps) {
  const toast = useToast()
  const inputStyle = { background: 'var(--accent)', borderColor: 'var(--border)', color: 'var(--foreground)' }

  /* Estado del formulario */
  const [groupId, setGroupId] = useState(editingSchedule?.groupId ?? '')
  const [slots,   setSlots]   = useState<TimeSlot[]>(
    editingSchedule
      ? [{ id: 'edit', dayOfWeek: editingSchedule.dayOfWeek, startTime: editingSchedule.startTime, endTime: editingSchedule.endTime }]
      : [newSlot()],
  )
  const [notes,   setNotes]   = useState(editingSchedule?.notes ?? '')
  const [saving,  setSaving]  = useState(false)
  const [errors,  setErrors]  = useState<Record<string, string>>({})

  const selectedGroup = groups.find(g => g.id === groupId)

  const updateSlot = (id: string, field: keyof TimeSlot, value: string) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const addSlot = () => setSlots(prev => [...prev, newSlot()])

  const removeSlot = (id: string) => {
    if (slots.length === 1) return   // mínimo 1 slot
    setSlots(prev => prev.filter(s => s.id !== id))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!groupId) errs.groupId = 'Selecciona un grupo'
    slots.forEach((s, i) => {
      if (!s.dayOfWeek) errs[`day-${i}`] = 'Selecciona un día'
      if (!s.startTime) errs[`start-${i}`] = 'Hora inicio requerida'
      if (!s.endTime)   errs[`end-${i}`]   = 'Hora fin requerida'
      if (s.startTime && s.endTime && s.startTime >= s.endTime)
        errs[`end-${i}`] = 'Hora fin debe ser mayor que inicio'
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editingSchedule) {
        // Editar un horario existente (un solo slot)
        const slot = slots[0]
        await updateSchedule(editingSchedule.id, {
          groupId,
          groupName: selectedGroup?.name ?? '',
          dayOfWeek: slot.dayOfWeek as DayOfWeek,
          startTime: slot.startTime,
          endTime:   slot.endTime,
          notes,
          isActive:  true,
        })
        toast('Horario actualizado')
      } else {
        // Crear uno o varios horarios nuevos
        const payload = slots.map(s => ({
          groupId,
          groupName:      selectedGroup?.name ?? '',
          dayOfWeek:      s.dayOfWeek as DayOfWeek,
          startTime:      s.startTime,
          endTime:        s.endTime,
          location:       '',
          notes,
          instructorId:   null as null,
          instructorName: null as null,
          isActive:       true,
        }))
        await createSchedulesBatch(payload)
        toast(`${payload.length} horario${payload.length > 1 ? 's' : ''} creado${payload.length > 1 ? 's' : ''}`)
      }
      onSaved()
    } catch (e: any) {
      toast(e.message ?? 'Error al guardar', 'error')
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      {/* Grupo */}
      <FormField label="Grupo" required error={errors.groupId}>
        {groups.length === 0 ? (
          <div className="flex items-center gap-2 h-8 px-3 rounded-lg text-xs"
            style={{ background: 'var(--accent)', border: '1px solid rgba(232,160,48,.5)', color: '#e8a030' }}>
            ⚠ Sin grupos creados.{' '}
            <a href="/groups/new" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>
              Crear grupo →
            </a>
          </div>
        ) : (
          <SaokoCombobox
            options={groups.map(g => ({
              value:       g.id,
              label:       g.name,
              description: [g.modalityName, g.categoryName, g.levelName].filter(Boolean).join(' · '),
            }))}
            value={groupId}
            onValueChange={setGroupId}
            placeholder="Seleccionar grupo..."
          />
        )}
      </FormField>

      {/* Slots de días/horarios */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
            Días y horarios
          </p>
          {!editingSchedule && (
            <Button type="button" variant="outline" size="sm" onClick={addSlot}
              style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)', fontSize: '0.78rem' }}>
              <Plus size={13} className="mr-1" /> Añadir día
            </Button>
          )}
        </div>

        {slots.map((slot, i) => (
          <div key={slot.id} className="rounded-xl p-3 flex flex-col gap-3"
            style={{ background: 'var(--accent)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                Horario {slots.length > 1 ? `#${i + 1}` : ''}
              </p>
              {slots.length > 1 && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeSlot(slot.id)}
                  style={{ color: '#e05252' }}>
                  <Trash2 size={13} />
                </Button>
              )}
            </div>

            {/* Día */}
            <FormField label="Día de la semana" required error={errors[`day-${i}`]}>
              <SaokoCombobox
                options={DAYS.map(d => ({ value: d, label: d }))}
                value={slot.dayOfWeek}
                onValueChange={v => updateSlot(slot.id, 'dayOfWeek', v)}
                placeholder="Seleccionar día..."
              />
            </FormField>

            {/* Hora inicio / fin */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Hora inicio" required error={errors[`start-${i}`]}>
                <Input type="time" style={inputStyle}
                  value={slot.startTime}
                  onChange={e => updateSlot(slot.id, 'startTime', e.target.value)} />
              </FormField>
              <FormField label="Hora fin" required error={errors[`end-${i}`]}>
                <Input type="time" style={inputStyle}
                  value={slot.endTime}
                  onChange={e => updateSlot(slot.id, 'endTime', e.target.value)} />
              </FormField>
            </div>
          </div>
        ))}
      </div>

      {/* Notas */}
      <FormField label="Notas (opcional)">
        <textarea rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
          style={{ background: 'var(--accent)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Ej: Clase de repaso, horario temporal..." />
      </FormField>

      <Separator style={{ background: 'var(--border)' }} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}
          style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
          Cancelar
        </Button>
        <Button type="button" disabled={saving || groups.length === 0} onClick={handleSave}
          style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none', minWidth: 120 }}>
          {saving ? 'Guardando...' : editingSchedule ? 'Guardar cambios' : `Crear ${slots.length > 1 ? `${slots.length} horarios` : 'horario'}`}
        </Button>
      </div>
    </div>
  )
}

/* ─── Página principal ───────────────────────────────────────────────────── */
export default function SchedulesPage() {
  const toast = useToast()
  const { adminUser } = useAuth()
  const canWrite = !!adminUser && PERMISSIONS.canManageSchedules(adminUser.role)
  const [schedules,    setSchedules]    = useState<Schedule[]>([])
  const [groups,       setGroups]       = useState<Group[]>([])
  const [loading,      setLoading]      = useState(true)
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null)
  const [toggleTarget, setToggleTarget] = useState<Schedule | null>(null)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')

  const load = async () => {
    setLoading(true)
    try {
      // Cargar de forma independiente — si schedules falla, grupos igual se carga
      const [s, g] = await Promise.allSettled([
        getSchedules(false),
        getGroups(true),
      ])
      if (s.status === 'fulfilled') setSchedules(s.value)
      if (g.status === 'fulfilled') setGroups(g.value)
      if (s.status === 'rejected')  console.error('schedules error:', s.reason)
      if (g.status === 'rejected')  console.error('groups error:', g.reason)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditSchedule(null); setDrawerOpen(true) }
  const openEdit   = (s: Schedule) => { setEditSchedule(s); setDrawerOpen(true) }

  const handleToggle = async () => {
    if (!toggleTarget) return
    await updateSchedule(toggleTarget.id, { isActive: !toggleTarget.isActive })
    toast(toggleTarget.isActive ? 'Horario desactivado' : 'Horario activado')
    setToggleTarget(null); load()
  }

  const active = schedules.filter(s => s.isActive !== false)

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      <PageHeader
        title="Horarios"
        description="Visualiza y administra los horarios semanales. Puedes crear varios días para el mismo grupo a la vez."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}
              style={BTN.refresh}>
              <RefreshCw size={13} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            {canWrite && (
            <Button size="sm" onClick={openCreate} style={BTN.create}>
              <Plus size={14} className="mr-1.5" />Nuevo Horario
            </Button>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="flex items-center gap-5">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="flex items-baseline gap-1.5">
              <Skeleton className="w-8 h-6 rounded" style={{ background: 'var(--accent)' }} />
              <Skeleton className="w-24 h-3 rounded" style={{ background: 'var(--accent)' }} />
            </div>
          ))
        ) : [
          { label: 'Horarios activos',   n: active.length,                            c: '#4caf7d' },
          { label: 'Grupos con horario', n: new Set(active.map(s => s.groupId)).size, c: 'var(--gold)' },
          { label: 'Total registros',    n: schedules.length,                         c: 'var(--muted-foreground)' },
        ].map(s => (
          <div key={s.label} className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold" style={{ color: s.c }}>{s.n}</span>
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => setView('calendar')}
          style={view === 'calendar' ? BTN.edit : BTN.ghost}>
          <LayoutGrid size={14} />Calendario semanal
        </Button>
        <Button type="button" size="sm" onClick={() => setView('list')}
          style={view === 'list' ? BTN.select : BTN.ghost}>
          <List size={14} />Lista completa
        </Button>
      </div>

      {view === 'calendar' && (
        loading ? (
          <Skeleton className="h-64 w-full rounded-xl" style={{ background: 'var(--accent)' }} />
        ) : (
          <WeekCalendar schedules={schedules} groups={groups} />
        )
      )}

      {view === 'list' && (
          <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: 'var(--border)' }}>
                    {['Día','Grupo','Horario','Estado','Acciones'].map(h => (
                      <TableHead key={h} className={`text-xs uppercase tracking-widest ${h === 'Día' || h === 'Estado' ? 'max-md:hidden' : ''} ${h === 'Acciones' ? 'saoko-col-action' : ''}`}
                        style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && [...Array(3)].map((_, i) => (
                    <TableRow key={i} style={{ borderColor: 'var(--border)' }}>
                      {[...Array(5)].map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 rounded" style={{ background: 'var(--accent)', width: 60 }} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {!loading && schedules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="flex flex-col items-center py-14 gap-3">
                          <div className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center"
                            style={{ borderColor: 'var(--border)' }}>
                            <CalendarDays size={20} style={{ color: 'var(--muted-foreground)' }} />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Sin horarios</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                              Crea el primero con el botón "Nuevo Horario"
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && DAYS.flatMap(day =>
                    schedules.filter(s => s.dayOfWeek === day).map(s => (
                      <TableRow key={s.id} style={{ borderColor: 'var(--border)', opacity: s.isActive !== false ? 1 : 0.5 }}>
                        <TableCell className="max-md:hidden">
                          <Badge variant="outline"
                            style={{
                              color:      DAY_COLORS[DAYS.indexOf(day) % 7],
                              borderColor:`${DAY_COLORS[DAYS.indexOf(day) % 7]}40`,
                              background: `${DAY_COLORS[DAYS.indexOf(day) % 7]}10`,
                              fontSize:   '0.72rem',
                            }}>
                            {s.dayOfWeek}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm min-w-0" style={{ color: 'var(--foreground)' }}>
                          <span className="truncate block">{s.groupName}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} style={{ color: 'var(--muted-foreground)' }} />
                            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                              {s.startTime} – {s.endTime}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-md:hidden">
                          {s.isActive !== false
                            ? <Badge variant="outline" style={{ color: '#4caf7d', borderColor: 'rgba(76,175,125,.35)', background: 'rgba(76,175,125,.1)', fontSize: '0.72rem' }}>Activo</Badge>
                            : <Badge variant="outline" style={{ color: '#e05252', borderColor: 'rgba(224,82,82,.35)', background: 'rgba(224,82,82,.1)', fontSize: '0.72rem' }}>Inactivo</Badge>}
                        </TableCell>
                        <TableCell className="saoko-col-action">
                          <div className="hidden md:flex gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)}
                              style={{ color: 'var(--muted-foreground)' }} title="Editar">
                              <Pencil size={13} />
                            </Button>
                            <Switch
                              checked={s.isActive !== false}
                              onCheckedChange={async v => {
                                await updateSchedule(s.id, { isActive: v })
                                toast(v ? 'Horario activado' : 'Horario desactivado')
                                load()
                              }}
                              className="data-checked:bg-[#4caf7d]"
                              size="sm"
                            />
                          </div>
                          <div className="md:hidden">
                            <TableRowMenu details={[{ label: 'Día', value: s.dayOfWeek }]}>
                              <DropdownMenuItem style={{ cursor: 'pointer' }} onClick={() => openEdit(s)}>Editar</DropdownMenuItem>
                              <DropdownMenuItem style={{ cursor: 'pointer' }} onClick={async () => {
                                const v = s.isActive === false
                                await updateSchedule(s.id, { isActive: v })
                                toast(v ? 'Horario activado' : 'Horario desactivado')
                                load()
                              }}>
                                {s.isActive !== false ? 'Desactivar' : 'Activar'}
                              </DropdownMenuItem>
                            </TableRowMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      )}

      {/* Drawer crear / editar */}
      <Sheet open={drawerOpen} onOpenChange={v => { if (!v) setDrawerOpen(false) }}>
        <SheetContent side="right"
          style={{
            background:   'rgba(18,18,18,.92)',
            backdropFilter: 'blur(24px)',
            overflowY:    'auto',
            padding:      0,
          }}>
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle style={{ color: 'var(--foreground)' }}>
              {editSchedule ? 'Editar horario' : 'Nuevo horario'}
            </SheetTitle>
            {!editSchedule && (
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Puedes añadir varios días para el mismo grupo antes de guardar.
              </p>
            )}
          </SheetHeader>
          <Separator style={{ background: 'var(--border)' }} />

          {drawerOpen && (
            <ScheduleDrawerForm
              groups={groups}
              editingSchedule={editSchedule}
              onClose={() => setDrawerOpen(false)}
              onSaved={() => { setDrawerOpen(false); load() }}
            />
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.isActive !== false ? 'Desactivar horario' : 'Activar horario'}
        description={`¿${toggleTarget?.isActive !== false ? 'Desactivar' : 'Activar'} el horario de ${toggleTarget?.groupName} los ${toggleTarget?.dayOfWeek}?`}
        confirmLabel={toggleTarget?.isActive !== false ? 'Desactivar' : 'Activar'}
        variant={toggleTarget?.isActive !== false ? 'danger' : 'default'}
        onConfirm={handleToggle}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  )
}
