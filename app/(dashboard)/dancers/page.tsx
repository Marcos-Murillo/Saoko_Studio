'use client'
import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, UserX, MoreHorizontal, UserMinus, DollarSign, UserPlus, Download, Pencil, ChevronLeft, MousePointerClick } from 'lucide-react'
import { getDancers, updateDancer, deactivateDancer, reactivateDancer } from '@/lib/services/dancer.service'
import { getDancerCurrentMemberships, getGroups, enrollDancer } from '@/lib/services/group.service'
import { getCategories } from '@/lib/services/catalog.service'
import { registerPayment } from '@/lib/services/payment.service'
import { getPaymentMethods } from '@/lib/services/catalog.service'
import { useAuth } from '@/lib/auth/AuthContext'
import { PERMISSIONS } from '@/lib/auth/roles'
import { getMonthlyFeesByPeriod, monthPayStatus, type MonthPayStatus, ensureCurrentMonthFees } from '@/lib/services/fee.service'
import { MonthPaidBadge } from '@/components/shared/StatusBadge'
import { DatePicker } from '@/components/shared/DatePicker'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { BTN } from '@/components/shared/buttonStyles'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LinkButton } from '@/components/shared/LinkButton'
import { useToast } from '@/components/shared/Toast'
import { FormField } from '@/components/shared/FormField'
import { SaokoCombobox } from '@/components/shared/SaokoCombobox'
import { formatDate, getAge, currentYearMonth, MONTHS_ES } from '@/lib/utils/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { StatMini } from '@/components/shared/KpiCard'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DancerForm, type DancerFormData } from '@/components/dancers/DancerForm'
import { DancerProfilePanel } from '@/components/dancers/DancerProfilePanel'
import { DancerFinancialPanel } from '@/components/dancers/DancerFinancialPanel'
import { isoToTs } from '@/lib/utils/dates'
import { downloadXlsx } from '@/lib/utils/exportExcel'
import type { Dancer, BloodType, Group, GroupMembership, PaymentMethod, MonthlyFee } from '@/types'

const { month: CURRENT_MONTH } = currentYearMonth()

/* ─── Mini modal de registro de pago rápido ─────────────────────────────── */
interface QuickPayProps {
  dancer: Dancer
  memberships: GroupMembership[]
  methods: PaymentMethod[]
  onClose: () => void
  onDone: () => void
}

function QuickPayBody({ dancer, memberships, methods, onClose, onDone }: QuickPayProps) {
  const { adminUser } = useAuth()
  const toast = useToast()
  const [amount,   setAmount]   = useState('')
  const [date,     setDate]     = useState(new Date().toISOString().split('T')[0])
  const [methodId, setMethodId] = useState('')
  const [groupId,  setGroupId]  = useState(memberships.length === 1 ? memberships[0].groupId : '')
  const [saving,   setSaving]   = useState(false)

  const handleSubmit = async () => {
    if (!amount || !methodId || !adminUser) return
    // Si tiene varios grupos, groupId es obligatorio
    if (memberships.length > 1 && !groupId) {
      toast('Selecciona el grupo al que pertenece el pago', 'error'); return
    }
    setSaving(true)
    try {
      const method = methods.find(m => m.id === methodId)
      const group  = memberships.find(m => m.groupId === groupId)
      await registerPayment({
        dancerId:          dancer.id,
        dancerName:        dancer.fullName,
        amount:            Number(amount),
        paymentDate:       new Date(date),
        paymentMethodId:   methodId,
        paymentMethodName: method?.name ?? '',
        concept:           group ? `Mensualidad — ${group.groupName}` : 'Mensualidad',
        notes:             '',
        registeredById:    adminUser.id,
        registeredByName:  adminUser.name,
        groupId:           groupId || (memberships.length === 1 ? memberships[0].groupId : undefined),
      })
      toast(`Pago registrado para ${dancer.fullName}`)
      onDone()
    } catch (e: any) { toast(e.message ?? 'Error al registrar', 'error') }
    setSaving(false)
  }

  const inputStyle = { background: 'var(--accent)', borderColor: 'var(--border)', color: 'var(--foreground)' }

  return (
    <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {dancer.fullName}
          </p>

          {/* Si tiene más de un grupo, pedir a cuál va el pago */}
          {memberships.length > 1 && (
            <FormField label="¿A qué grupo corresponde el pago?" required>
              <SaokoCombobox
                options={memberships.map(m => ({ value: m.groupId, label: m.groupName ?? m.groupId }))}
                value={groupId}
                onValueChange={setGroupId}
                placeholder="Seleccionar grupo..."
              />
            </FormField>
          )}

          {memberships.length === 1 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'var(--accent)', border: '1px solid var(--border)' }}>
              <Badge variant="outline" style={{ color: 'var(--gold)', borderColor: 'rgba(201,168,76,.35)', background: 'rgba(201,168,76,.1)', fontSize: '0.72rem' }}>
                {memberships[0].groupName}
              </Badge>
            </div>
          )}

          <FormField label="Monto (COP)" required>
            <Input type="number" min={1} style={inputStyle} value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="100000" />
          </FormField>

          <FormField label="Fecha" required>
            <DatePicker value={date} onChange={setDate} />
          </FormField>

          <FormField label="Método de pago" required>
            <SaokoCombobox
              options={methods.map(m => ({ value: m.id, label: m.name }))}
              value={methodId}
              onValueChange={setMethodId}
              placeholder="Seleccionar método..."
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose}
              style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !amount || !methodId || (memberships.length > 1 && !groupId)}
              style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none' }}>
              {saving ? 'Registrando...' : 'Registrar pago'}
            </Button>
          </div>
    </div>
  )
}

/* ─── Mini modal de añadir a grupo ─────────────────────────────────────── */
interface AddGroupProps {
  dancer: Dancer
  allGroups: Group[]
  onClose: () => void
  onDone: () => void
}

function AddGroupBody({ dancer, allGroups, onClose, onDone }: AddGroupProps) {
  const toast  = useToast()
  const [groupId, setGroupId] = useState('')
  const [saving,  setSaving]  = useState(false)

  const handleSubmit = async () => {
    if (!groupId) { toast('Selecciona un grupo', 'error'); return }
    const group = allGroups.find(g => g.id === groupId)
    if (!group) return
    setSaving(true)
    try {
      await enrollDancer(dancer.id, dancer.fullName, group.id, group.name, group.monthlyFee)
      toast(`${dancer.fullName} añadido a ${group.name}`)
      onDone()
    } catch (e: any) { toast(e.message ?? 'Error', 'error') }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {dancer.fullName}
          </p>
          <FormField label="Grupo" required>
            <SaokoCombobox
              options={allGroups.map(g => ({
                value: g.id,
                label: g.name,
                description: [g.modalityName, g.categoryName, g.levelName].filter(Boolean).join(' · '),
              }))}
              value={groupId}
              onValueChange={setGroupId}
              placeholder="Seleccionar grupo..."
            />
          </FormField>
          {allGroups.length === 0 && (
            <p className="text-xs" style={{ color: '#e8a030' }}>
              No hay grupos disponibles. Crea uno en Grupos.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}
              style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !groupId}
              style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none' }}>
              {saving ? 'Añadiendo...' : 'Añadir al grupo'}
            </Button>
          </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function DancersPage() {
  const toast = useToast()
  const { adminUser } = useAuth()
  const [dancers,     setDancers]     = useState<Dancer[]>([])
  const [allGroups,   setAllGroups]   = useState<Group[]>([])
  const [methods,     setMethods]     = useState<PaymentMethod[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState<'active'|'inactive'|'all'>('active')
  const [editing,     setEditing]     = useState<Dancer | null>(null)
  const [deactivateTarget,  setDeactivateTarget]  = useState<Dancer | null>(null)
  const [payTarget,         setPayTarget]         = useState<{ dancer: Dancer; memberships: GroupMembership[] } | null>(null)
  const [addGroupTarget,    setAddGroupTarget]     = useState<Dancer | null>(null)
  const [monthFees, setMonthFees] = useState<MonthlyFee[]>([])
  const [profileDancer,     setProfileDancer]      = useState<Dancer | null>(null)
  const [financialOpen,     setFinancialOpen]      = useState(false)
  const [selectMode,        setSelectMode]         = useState(false)
  const [selected,          setSelected]           = useState<Set<string>>(new Set())

  const load = async () => {
    setLoading(true)
    const { year, month } = currentYearMonth()
    if (adminUser && PERMISSIONS.canManageAccounting(adminUser.role)) {
      await ensureCurrentMonthFees({ id: adminUser.id, name: adminUser.name })
    }
    const [d, g, m, fees] = await Promise.all([
      getDancers(false),
      getGroups(true),
      getPaymentMethods(),
      getMonthlyFeesByPeriod(year, month),
    ])
    setDancers(d); setAllGroups(g); setMethods(m); setMonthFees(fees)
    setLoading(false)
  }

  useEffect(() => { if (adminUser) load() }, [adminUser])

  const filtered = useMemo(() => dancers.filter(d => {
    const ok = filter === 'all' || (filter === 'active' ? d.isActive : !d.isActive)
    const q  = search.toLowerCase()
    return ok && (!q || d.fullName.toLowerCase().includes(q) ||
      d.documentNumber.includes(q) || (d.currentGroupName ?? '').toLowerCase().includes(q))
  }), [dancers, search, filter])

  const payStatusByDancer = useMemo(() => {
    const byId: Record<string, MonthlyFee[]> = {}
    for (const f of monthFees) {
      (byId[f.dancerId] ??= []).push(f)
    }
    const status: Record<string, MonthPayStatus> = {}
    for (const d of dancers) {
      status[d.id] = !d.isActive ? 'na' : monthPayStatus(byId[d.id] ?? [])
    }
    return status
  }, [dancers, monthFees])

  const handleEditSubmit = async (data: DancerFormData) => {
    if (!editing) return
    const cats = await getCategories(false)
    const cat  = cats.find(c => c.id === data.categoryId)
    await updateDancer(editing.id, {
      fullName: data.fullName, documentNumber: data.documentNumber,
      birthDate: isoToTs(data.birthDate), address: data.address,
      neighborhood: data.neighborhood, commune: data.commune,
      eps: data.eps, epsLocation: data.epsLocation,
      bloodType: data.bloodType as BloodType, email: data.email,
      phone: data.phone, categoryId: data.categoryId,
      categoryName: cat?.name ?? '', notes: data.notes,
    })
    toast('Bailarín actualizado')
    setEditing(null); load()
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    deactivateTarget.isActive
      ? await deactivateDancer(deactivateTarget.id, adminUser ? { id: adminUser.id, name: adminUser.name } : undefined)
      : await reactivateDancer(deactivateTarget.id)
    toast(deactivateTarget.isActive ? 'Bailarín desactivado' : 'Bailarín reactivado')
    setDeactivateTarget(null); load()
  }

  /* Abre el modal de pago rápido cargando las membresías actuales */
  const openQuickPay = async (dancer: Dancer) => {
    const memberships = await getDancerCurrentMemberships(dancer.id)
    setPayTarget({ dancer, memberships })
  }

  const excelRows = (list: Dancer[]) => list.map(d => ({
    Nombre: d.fullName,
    Documento: d.documentNumber,
    Edad: d.birthDate ? getAge(d.birthDate) : '',
    Categoria: d.categoryName ?? '',
    Grupos: d.currentGroupName ?? '',
    MesPagado: payStatusByDancer[d.id] === 'paid' ? 'Si' : payStatusByDancer[d.id] === 'partial' ? 'Parcial' : payStatusByDancer[d.id] === 'pending' ? 'No' : '',
    Estado: d.isActive ? 'Activo' : 'Inactivo',
    Telefono: d.phone,
    Correo: d.email,
  }))

  const exportExcel = () => {
    const list = selectMode
      ? filtered.filter(d => selected.has(d.id))
      : filtered
    if (selectMode && list.length === 0) {
      toast('Selecciona al menos un bailarín', 'error')
      return
    }
    downloadXlsx('bailarines', excelRows(list))
  }

  const toggleSelected = (id: string, on: boolean) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  if (loading) return <PageLoader />

  const filterBtns = [
    { key: 'active'   as const, label: 'Activos' },
    { key: 'inactive' as const, label: 'Inactivos' },
    { key: 'all'      as const, label: 'Todos' },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      <PageHeader
        title="Bailarines"
        description="Administra la información de todos los bailarines de Saoko."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm"
              onClick={() => { setSelectMode(v => !v); setSelected(new Set()) }}
              style={selectMode ? BTN.select : BTN.ghost}>
              <MousePointerClick size={14} className="mr-1.5" />
              {selectMode ? `Seleccionados (${selected.size})` : 'Seleccionar'}
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} style={BTN.excel}>
              <Download size={14} className="mr-1.5" />Excel
            </Button>
            <LinkButton href="/dancers/new" variant="primary">
              <Plus size={15} />Nuevo Bailarín
            </LinkButton>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--muted-foreground)' }} />
          <Input className="pl-9" placeholder="Buscar por nombre, cédula o grupo…"
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

      <div className="grid grid-cols-4 gap-2 md:gap-4">
        {[
          { label: 'Total',     n: dancers.length,                          c: 'var(--gold)' },
          { label: 'Activos',   n: dancers.filter(d => d.isActive).length,  c: '#4caf7d' },
          { label: 'Inactivos', n: dancers.filter(d => !d.isActive).length, c: '#e05252' },
          { label: 'Resultados', n: filtered.length,                        c: 'var(--foreground)' },
        ].map(s => (
          <StatMini key={s.label} label={s.label} value={String(s.n)} color={s.c} />
        ))}
      </div>

      {/* Table */}
      <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <UserX size={36} style={{ color: 'var(--muted-foreground)' }} />
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No se encontraron bailarines</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: 'var(--border)' }}>
                  <TableHead className={selectMode ? '' : 'max-md:hidden'} />
                  <TableHead className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Bailarín</TableHead>
                  <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Documento</TableHead>
                  <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Edad</TableHead>
                  <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Categoría</TableHead>
                  <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Grupo</TableHead>
                  <TableHead className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Mes {MONTHS_ES[CURRENT_MONTH - 1]}</TableHead>
                  <TableHead className="max-md:hidden text-xs uppercase tracking-widest" style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Estado</TableHead>
                  <TableHead className="saoko-col-action" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(d => (
                  <TableRow key={d.id} style={{ borderColor: 'var(--border)' }}>
                    <TableCell className={selectMode ? '' : 'max-md:hidden'}>
                      {selectMode && (
                        <Checkbox
                          checked={selected.has(d.id)}
                          onCheckedChange={v => toggleSelected(d.id, v === true)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="min-w-0">
                      <div className="hidden md:flex items-center gap-3 min-w-0">
                        <Avatar size="sm">
                          <AvatarFallback style={{ background: 'rgba(201,168,76,.14)', color: 'var(--gold)', fontSize: '0.75rem', fontWeight: 700 }}>
                            {d.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{d.fullName}</p>
                      </div>
                      <p className="text-sm font-medium truncate md:hidden" style={{ color: 'var(--foreground)' }}>{d.fullName}</p>
                    </TableCell>
                    <TableCell className="max-md:hidden text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      {d.documentNumber || '—'}
                    </TableCell>
                    <TableCell className="max-md:hidden text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      {d.birthDate ? `${getAge(d.birthDate)} años` : '—'}
                    </TableCell>
                    <TableCell className="max-md:hidden">
                      {d.categoryName
                        ? <Badge variant="outline" style={{ fontSize: '0.72rem', color: 'var(--foreground)', borderColor: 'var(--border)' }}>{d.categoryName}</Badge>
                        : <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>—</span>}
                    </TableCell>
                    <TableCell className="max-md:hidden">
                      {d.currentGroupName
                        ? <Badge variant="outline" style={{ fontSize: '0.72rem', color: 'var(--gold)', borderColor: 'rgba(201,168,76,.35)', background: 'rgba(201,168,76,.1)' }}>
                            {d.currentGroupName}
                          </Badge>
                        : <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Sin grupo</span>}
                    </TableCell>
                    <TableCell>
                      <MonthPaidBadge status={payStatusByDancer[d.id] ?? 'na'} />
                    </TableCell>
                    <TableCell className="max-md:hidden">
                      <Switch
                        checked={d.isActive}
                        onCheckedChange={() => setDeactivateTarget(d)}
                        className="data-checked:bg-[#4caf7d]"
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="saoko-col-action">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" className="h-10 w-10" style={{ color: 'var(--muted-foreground)' }}>
                              <MoreHorizontal size={18} />
                            </Button>
                          }
                        />
                        <DropdownMenuContent
                          align="end"
                          style={{ background: 'var(--popover)', border: '1px solid var(--border)', minWidth: 200 }}>
                          <div className="px-3 py-2 md:hidden flex flex-col gap-1">
                            <p className="text-[0.62rem] uppercase" style={{ color: 'var(--muted-foreground)' }}>Grupo</p>
                            <p className="text-sm">{d.currentGroupName || 'Sin grupo'}</p>
                          </div>
                          <DropdownMenuSeparator className="md:hidden" style={{ background: 'var(--border)' }} />
                          <DropdownMenuItem
                            style={{ color: 'var(--foreground)', cursor: 'pointer' }}
                            onClick={() => { setProfileDancer(d); setFinancialOpen(false) }}>
                            Ver perfil completo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            style={{ color: 'var(--foreground)', cursor: 'pointer' }}
                            onClick={() => setEditing(d)}>
                            <Pencil size={14} className="mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator style={{ background: 'var(--border)' }} />
                          <DropdownMenuItem
                            style={{ color: '#4caf7d', cursor: 'pointer' }}
                            onClick={() => openQuickPay(d)}>
                            <DollarSign size={14} className="mr-2" />
                            Registrar pago mensualidad
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            style={{ color: 'var(--foreground)', cursor: 'pointer' }}
                            onClick={() => setAddGroupTarget(d)}>
                            <UserPlus size={14} className="mr-2" />
                            Añadir a otro grupo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator style={{ background: 'var(--border)' }} />
                          <DropdownMenuItem
                            style={{ color: d.isActive ? '#e05252' : '#4caf7d', cursor: 'pointer' }}
                            onClick={() => setDeactivateTarget(d)}>
                            <UserMinus size={14} className="mr-2" />
                            {d.isActive ? 'Desactivar bailarín' : 'Reactivar bailarín'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Drawer de edición */}
      <Sheet open={!!editing} onOpenChange={v => { if (!v) setEditing(null) }}>
        <SheetContent side="right"
          style={{ background: 'rgba(18,18,18,.92)', backdropFilter: 'blur(24px)', overflowY: 'auto', padding: 0 }}>
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle style={{ color: 'var(--foreground)' }}>Editar — {editing?.fullName}</SheetTitle>
          </SheetHeader>
          <Separator style={{ background: 'var(--border)' }} />
          {editing && (
            <div className="px-6 py-5">
              <DancerForm
                compact
                defaultValues={{
                  fullName:       editing.fullName,
                  documentNumber: editing.documentNumber,
                  birthDate:      editing.birthDate ? new Date(editing.birthDate.toDate()).toISOString().split('T')[0] : '',
                  address:        editing.address,
                  neighborhood:   editing.neighborhood,
                  commune:        editing.commune,
                  eps:            editing.eps,
                  epsLocation:    editing.epsLocation,
                  bloodType:      editing.bloodType,
                  email:          editing.email,
                  phone:          editing.phone,
                  categoryId:     editing.categoryId,
                  notes:          editing.notes,
                }}
                onSubmit={handleEditSubmit}
                submitLabel="Guardar cambios"
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!profileDancer} onOpenChange={v => { if (!v) { setProfileDancer(null); setFinancialOpen(false) } }}>
        <SheetContent side="right" className="p-0"
          style={{ background: 'rgba(18,18,18,.88)', backdropFilter: 'blur(24px)' }}>
          <div className="h-full overflow-y-auto">
            <SheetHeader className="pr-12">
              <SheetTitle style={{ color: 'var(--foreground)' }}>Perfil</SheetTitle>
            </SheetHeader>
            {profileDancer && (
              <div className="px-4 pb-8">
                <DancerProfilePanel
                  dancerId={profileDancer.id}
                  onOpenFinancial={() => setFinancialOpen(true)}
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {financialOpen && profileDancer && typeof document !== 'undefined' && createPortal(
        <div
          className="saoko-nested-drawer flex flex-col"
          style={{
            background: 'rgba(12,12,12,.96)',
            backdropFilter: 'blur(24px)',
            borderLeft: '1px solid var(--glass-border)',
          }}
        >
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setFinancialOpen(false)}
              style={{ color: 'var(--gold)' }}
            >
              <ChevronLeft size={16} />
            </Button>
            <p className="text-base font-medium" style={{ color: 'var(--foreground)' }}>
              Historial financiero
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            <DancerFinancialPanel dancerId={profileDancer.id} />
          </div>
        </div>,
        document.body,
      )}

      <Sheet open={!!payTarget} onOpenChange={v => { if (!v) setPayTarget(null) }}>
        <SheetContent side="right"
          style={{ background: 'rgba(18,18,18,.92)', backdropFilter: 'blur(24px)' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--foreground)' }}>Registrar pago</SheetTitle>
          </SheetHeader>
          {payTarget && (
            <div className="px-4 pb-6">
              <QuickPayBody
                dancer={payTarget.dancer}
                memberships={payTarget.memberships}
                methods={methods}
                onClose={() => setPayTarget(null)}
                onDone={() => { setPayTarget(null); load() }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!addGroupTarget} onOpenChange={v => { if (!v) setAddGroupTarget(null) }}>
        <SheetContent side="right"
          style={{ background: 'rgba(18,18,18,.92)', backdropFilter: 'blur(24px)' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--foreground)' }}>Añadir a grupo</SheetTitle>
          </SheetHeader>
          {addGroupTarget && (
            <div className="px-4 pb-6">
              <AddGroupBody
                dancer={addGroupTarget}
                allGroups={allGroups}
                onClose={() => setAddGroupTarget(null)}
                onDone={() => { setAddGroupTarget(null); load() }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm desactivar */}
      <ConfirmDialog
        open={!!deactivateTarget}
        title={deactivateTarget?.isActive ? 'Desactivar bailarín' : 'Reactivar bailarín'}
        description={
          deactivateTarget?.isActive
            ? `¿Desactivar a ${deactivateTarget?.fullName}? No generará nuevas mensualidades, pero su historial se conserva.`
            : `¿Reactivar a ${deactivateTarget?.fullName}? Volverá a generar mensualidades automáticamente.`
        }
        confirmLabel={deactivateTarget?.isActive ? 'Desactivar' : 'Reactivar'}
        variant={deactivateTarget?.isActive ? 'danger' : 'default'}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  )
}
