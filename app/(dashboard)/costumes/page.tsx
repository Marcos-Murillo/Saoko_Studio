'use client'
import { useEffect, useState } from 'react'
import { Plus, Shirt, RotateCcw } from 'lucide-react'
import { getCostumes, createCostume, getLoans, createLoan, returnLoan, isCostumeOnLoan, Timestamp } from '@/lib/services/costume.service'
import { getDancers } from '@/lib/services/dancer.service'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/components/shared/Toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { FormField } from '@/components/shared/FormField'
import { SaokoCombobox } from '@/components/shared/SaokoCombobox'
import { DatePicker } from '@/components/shared/DatePicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/dates'
import { StatMini } from '@/components/shared/KpiCard'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { Costume, CostumeLoan, Dancer } from '@/types'

export default function CostumesPage() {
  const { adminUser } = useAuth()
  const toast = useToast()
  const [costumes, setCostumes] = useState<Costume[]>([])
  const [loans, setLoans] = useState<CostumeLoan[]>([])
  const [dancers, setDancers] = useState<Dancer[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [size, setSize] = useState('')
  const [costumeId, setCostumeId] = useState('')
  const [dancerId, setDancerId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [c, l, d] = await Promise.all([getCostumes(false), getLoans(), getDancers(true)])
    setCostumes(c); setLoans(l); setDancers(d); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const open = loans.filter(l => l.status !== 'returned')
  const available = costumes.filter(c => c.isActive !== false && !isCostumeOnLoan(loans, c.id))

  const addCostume = async () => {
    if (!name.trim()) { toast('Nombre requerido', 'error'); return }
    setSaving(true)
    await createCostume({ name: name.trim(), code: code.trim(), size: size.trim(), notes: '', isActive: true })
    setName(''); setCode(''); setSize('')
    toast('Prenda registrada')
    await load()
    setSaving(false)
  }

  const loan = async () => {
    if (!adminUser || !costumeId || !dancerId) { toast('Elige prenda y bailarín', 'error'); return }
    const costume = costumes.find(c => c.id === costumeId)
    const dancer = dancers.find(d => d.id === dancerId)
    setSaving(true)
    await createLoan({
      costumeId,
      costumeName: costume?.name,
      dancerId,
      dancerName: dancer?.fullName,
      loanDate: Timestamp.now(),
      dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
      notes: '',
    }, { id: adminUser.id, name: adminUser.name })
    setCostumeId(''); setDancerId(''); setDueDate('')
    toast('Préstamo registrado')
    await load()
    setSaving(false)
  }

  const giveBack = async (id: string) => {
    if (!adminUser) return
    await returnLoan(id, { id: adminUser.id, name: adminUser.name })
    toast('Prenda marcada como devuelta')
    load()
  }

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-8 max-w-[1100px]">
      <PageHeader
        title="Vestuario"
        description="Inventario y préstamos. Aquí ves quién tiene una prenda y quién no la ha devuelto."
      />

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <StatMini label="Prendas" value={String(costumes.length)} />
        <StatMini label="Prestadas" value={String(open.length)} color="var(--gold)" />
        <StatMini label="Vencidas" value={String(open.filter(l => l.status === 'overdue').length)} color="#e05252" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardContent className="pt-5 flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Nueva prenda</p>
            <FormField label="Nombre"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Traje salsa rojo" /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Código"><Input value={code} onChange={e => setCode(e.target.value)} placeholder="V-014" /></FormField>
              <FormField label="Talla"><Input value={size} onChange={e => setSize(e.target.value)} placeholder="M" /></FormField>
            </div>
            <Button onClick={addCostume} disabled={saving}><Plus size={14} className="mr-1" />Guardar prenda</Button>
          </CardContent>
        </Card>
        <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardContent className="pt-5 flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Prestar</p>
            <FormField label="Prenda">
              <SaokoCombobox
                options={available.map(c => ({ value: c.id, label: `${c.name}${c.size ? ` · ${c.size}` : ''}` }))}
                value={costumeId} onValueChange={setCostumeId} placeholder="Disponibles..." />
            </FormField>
            <FormField label="Bailarín">
              <SaokoCombobox
                options={dancers.map(d => ({ value: d.id, label: d.fullName }))}
                value={dancerId} onValueChange={setDancerId} placeholder="Quién se lo lleva..." />
            </FormField>
            <FormField label="Devolver antes de (opcional)">
              <DatePicker value={dueDate} onChange={setDueDate} placeholder="Sin fecha límite" />
            </FormField>
            <Button onClick={loan} disabled={saving}><Shirt size={14} className="mr-1" />Registrar préstamo</Button>
          </CardContent>
        </Card>
      </div>

      <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <CardContent className="p-0">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="font-semibold">No devueltos</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prenda</TableHead>
                <TableHead className="max-md:hidden">Bailarín</TableHead>
                <TableHead className="max-md:hidden">Prestado</TableHead>
                <TableHead className="max-md:hidden">Límite</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="saoko-col-action" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {open.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium min-w-0"><span className="truncate block">{l.costumeName}</span></TableCell>
                  <TableCell className="max-md:hidden">{l.dancerName}</TableCell>
                  <TableCell className="max-md:hidden">{formatDate(l.loanDate)}</TableCell>
                  <TableCell className="max-md:hidden">{l.dueDate ? formatDate(l.dueDate) : '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" style={{
                      color: l.status === 'overdue' ? '#e05252' : 'var(--gold)',
                      borderColor: 'var(--border)',
                    }}>
                      {l.status === 'overdue' ? 'Vencido' : 'Prestado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="saoko-col-action">
                    <div className="hidden md:block">
                      <Button size="sm" variant="outline" onClick={() => giveBack(l.id)}>
                        <RotateCcw size={13} className="mr-1" />Devolver
                      </Button>
                    </div>
                    <div className="md:hidden">
                      <TableRowMenu details={[
                        { label: 'Bailarín', value: l.dancerName },
                        { label: 'Prestado', value: formatDate(l.loanDate) },
                        { label: 'Límite', value: l.dueDate ? formatDate(l.dueDate) : '—' },
                      ]}>
                        <DropdownMenuItem style={{ cursor: 'pointer' }} onClick={() => giveBack(l.id)}>Devolver</DropdownMenuItem>
                      </TableRowMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {open.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    No hay prendas pendientes de devolución
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
