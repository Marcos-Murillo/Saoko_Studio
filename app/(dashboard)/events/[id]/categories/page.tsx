'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import {
  getEventById,
  getEventCategories,
  createEventCategory,
  updateEventCategory,
} from '@/lib/services/event.service'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/components/shared/Toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EventHeader } from '@/components/events/EventHeader'
import { FormField } from '@/components/shared/FormField'
import { SaokoCombobox } from '@/components/shared/SaokoCombobox'
import { ActiveBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatCurrency } from '@/lib/utils/currency'
import { TableRowMenu } from '@/components/shared/TableRowMenu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { EventCategory, StudioEvent } from '@/types'

const inputStyle = { background: 'var(--accent)', borderColor: 'var(--border)', color: 'var(--foreground)' }

export default function EventCategoriesPage() {
  const { id } = useParams<{ id: string }>()
  const { adminUser } = useAuth()
  const toast = useToast()
  const [event, setEvent] = useState<StudioEvent | null>(null)
  const [categories, setCategories] = useState<EventCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const [ev, cats] = await Promise.all([getEventById(id), getEventCategories(id)])
    setEvent(ev)
    setCategories(cats)
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  if (loading) return <PageLoader />
  if (!event) return <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Evento no encontrado</p>

  const save = async () => {
    setError('')
    if (!adminUser) return
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    const value = Number(price)
    if (Number.isNaN(value) || value < 0) { setError('Precio inválido'); return }
    setSaving(true)
    try {
      await createEventCategory(id, { name, price: value, status }, { id: adminUser.id, name: adminUser.name })
      toast('Categoría creada')
      setOpen(false)
      setName(''); setPrice(''); setStatus('active')
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
    setSaving(false)
  }

  const toggle = async (cat: EventCategory) => {
    await updateEventCategory(cat.id, { status: cat.status === 'active' ? 'inactive' : 'active' })
    await load()
  }

  return (
    <div className="flex flex-col gap-6">
      <EventHeader event={event} />
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}
          style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none' }}>
          <Plus size={15} />Nueva categoría
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          {categories.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
              Aún no hay categorías. El Full Pass es independiente del precio de cada categoría.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead className="max-md:hidden">Estado</TableHead>
                  <TableHead className="saoko-col-action" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map(cat => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium min-w-0"><span className="truncate block">{cat.name}</span></TableCell>
                    <TableCell>{formatCurrency(cat.price)}</TableCell>
                    <TableCell className="max-md:hidden"><ActiveBadge isActive={cat.status === 'active'} /></TableCell>
                    <TableCell className="saoko-col-action">
                      <div className="hidden md:block text-right">
                        <Button type="button" variant="outline" size="sm" onClick={() => toggle(cat)}
                          style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                          {cat.status === 'active' ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
                      <div className="md:hidden">
                        <TableRowMenu>
                          <DropdownMenuItem style={{ cursor: 'pointer' }} onClick={() => toggle(cat)}>
                            {cat.status === 'active' ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                        </TableRowMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" style={{ background: 'rgba(18,18,18,.92)', backdropFilter: 'blur(24px)' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--foreground)' }}>Nueva categoría</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-8 flex flex-col gap-4">
            <FormField label="Nombre" required>
              <Input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Salsa Solista" />
            </FormField>
            <FormField label="Precio (COP)" required hint="Independiente del Full Pass">
              <Input type="number" min={0} style={inputStyle} value={price} onChange={e => setPrice(e.target.value)} placeholder="80000" />
            </FormField>
            <FormField label="Estado">
              <SaokoCombobox
                options={[{ value: 'active', label: 'Activo' }, { value: 'inactive', label: 'Inactivo' }]}
                value={status}
                onValueChange={v => setStatus(v as 'active' | 'inactive')}
              />
            </FormField>
            {error && <p className="text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}
                style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                Cancelar
              </Button>
              <Button type="button" onClick={save} disabled={saving}
                style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none' }}>
                {saving ? 'Guardando...' : 'Crear categoría'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
