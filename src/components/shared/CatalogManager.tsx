'use client'
import { useState } from 'react'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from './Toast'

export interface CatalogItem {
  id: string
  name: string
  description?: string
  isActive: boolean
  [key: string]: unknown
}

interface Props {
  title: string
  items: CatalogItem[]
  onCreate: (name: string, description: string) => Promise<void>
  onUpdate: (id: string, name: string, description: string) => Promise<void>
  onToggle: (id: string, isActive: boolean) => Promise<void>
  extraFields?: (item: CatalogItem) => React.ReactNode
  loading?: boolean
}

const inputStyle = { background: 'var(--accent)', borderColor: 'var(--border)', color: 'var(--foreground)' }

export function CatalogManager({ title, items, onCreate, onUpdate, onToggle, extraFields, loading }: Props) {
  const toast   = useToast()
  const [creating,  setCreating]  = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName,   setNewName]   = useState('')
  const [newDesc,   setNewDesc]   = useState('')
  const [editName,  setEditName]  = useState('')
  const [editDesc,  setEditDesc]  = useState('')
  const [saving,    setSaving]    = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await onCreate(newName.trim(), newDesc.trim())
      setNewName(''); setNewDesc(''); setCreating(false)
      toast(`"${newName}" creado`)
    } catch { toast('Error al crear', 'error') }
    setSaving(false)
  }

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      await onUpdate(id, editName.trim(), editDesc.trim())
      setEditingId(null)
      toast('Actualizado')
    } catch { toast('Error', 'error') }
    setSaving(false)
  }

  const handleToggle = async (item: CatalogItem) => {
    try {
      await onToggle(item.id, !item.isActive)
    } catch { toast('Error', 'error') }
  }

  const startEdit = (item: CatalogItem) => {
    setEditingId(item.id); setEditName(item.name); setEditDesc(item.description ?? '')
  }

  return (
    <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
          {title}
        </CardTitle>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}
            style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none' }}>
            <Plus size={13} className="mr-1.5" /> Nuevo
          </Button>
        )}
      </CardHeader>
      <Separator style={{ background: 'var(--border)' }} />

      <CardContent className="pt-4">
        {/* New row */}
        {creating && (
          <div className="flex gap-2 mb-4 p-3 rounded-xl"
            style={{ background: 'var(--accent)', border: '1px dashed rgba(201,168,76,.5)' }}>
            <Input placeholder="Nombre *" value={newName} onChange={e => setNewName(e.target.value)}
              autoFocus style={inputStyle} className="flex-1" />
            <Input placeholder="Descripción" value={newDesc} onChange={e => setNewDesc(e.target.value)}
              style={inputStyle} className="flex-1" />
            <Button size="icon-sm" disabled={saving} onClick={handleCreate}
              style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none', flexShrink: 0 }}>
              <Check size={13} />
            </Button>
            <Button size="icon-sm" variant="outline" onClick={() => { setCreating(false); setNewName(''); setNewDesc('') }}
              style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)', flexShrink: 0 }}>
              <X size={13} />
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg" style={{ background: 'var(--accent)' }} />)}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--muted-foreground)' }}>Sin registros. Crea el primero.</p>
        ) : (
          <div className="flex flex-col">
            {items.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <Separator style={{ background: 'var(--border)' }} />}
                <div className="flex items-center gap-3 py-3 px-1 rounded-lg transition-colors"
                  style={{ background: editingId === item.id ? 'var(--accent)' : 'transparent' }}>
                  {editingId === item.id ? (
                    /* Edit mode */
                    <>
                      <Input value={editName} onChange={e => setEditName(e.target.value)}
                        autoFocus className="flex-1 h-8 text-sm" style={inputStyle} />
                      <Input value={editDesc} placeholder="Descripción" onChange={e => setEditDesc(e.target.value)}
                        className="flex-1 h-8 text-sm" style={inputStyle} />
                      <Button size="icon-sm" disabled={saving} onClick={() => handleEdit(item.id)}
                        style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none', flexShrink: 0 }}>
                        <Check size={12} />
                      </Button>
                      <Button size="icon-sm" variant="outline" onClick={() => setEditingId(null)}
                        style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)', flexShrink: 0 }}>
                        <X size={12} />
                      </Button>
                    </>
                  ) : (
                    /* View mode */
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate"
                          style={{ color: item.isActive ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                            {item.description as string}
                          </p>
                        )}
                      </div>
                      {extraFields?.(item)}
                      <Badge variant="outline"
                        style={item.isActive
                          ? { color: '#4caf7d', borderColor: 'rgba(76,175,125,.3)', background: 'rgba(76,175,125,.1)', fontSize: '0.68rem' }
                          : { color: 'var(--muted-foreground)', borderColor: 'var(--border)', background: 'transparent', fontSize: '0.68rem' }}>
                        {item.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Button size="icon-sm" variant="ghost" onClick={() => startEdit(item)}
                        style={{ color: 'var(--muted-foreground)', flexShrink: 0 }}>
                        <Pencil size={13} />
                      </Button>
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => handleToggle(item)}
                        size="sm"
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
