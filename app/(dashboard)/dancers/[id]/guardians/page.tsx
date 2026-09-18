'use client'
import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react'
import {
  getDancerById,
  getDancerGuardians,
  getGuardians,
  createGuardian,
  linkGuardianToDancer,
  unlinkGuardianFromDancer,
} from '@/lib/services/dancer.service'
import { useToast } from '@/components/shared/Toast'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import type { Dancer, Guardian, DancerGuardian } from '@/types'

const schema = z.object({
  fullName: z.string().min(2, 'Nombre requerido'),
  documentNumber: z.string().min(3, 'Documento requerido'),
  phone: z.string().default(''),
  email: z.string().email('Correo inválido').or(z.literal('')).default(''),
  address: z.string().default(''),
  relationship: z.string().min(1, 'Relación requerida'),
  notes: z.string().default(''),
})
type FormData = z.infer<typeof schema>

export default function DancerGuardiansPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const toast = useToast()
  const [dancer, setDancer] = useState<Dancer | null>(null)
  const [links, setLinks] = useState<DancerGuardian[]>([])
  const [allGuardians, setAllGuardians] = useState<Guardian[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'list' | 'new' | 'link'>('list')
  const [searchGuardian, setSearchGuardian] = useState('')
  const [unlinkTarget, setUnlinkTarget] = useState<DancerGuardian | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  })

  const load = async () => {
    const [d, g, all] = await Promise.all([getDancerById(id), getDancerGuardians(id), getGuardians()])
    setDancer(d); setLinks(g); setAllGuardians(all); setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleCreateAndLink = async (data: FormData) => {
    try {
      const gId = await createGuardian({
        fullName: data.fullName,
        documentNumber: data.documentNumber,
        phone: data.phone,
        email: data.email,
        address: data.address,
        notes: data.notes,
      })
      await linkGuardianToDancer(id, gId, data.relationship, links.length === 0, dancer!.fullName, data.fullName)
      toast('Acudiente creado y vinculado')
      reset(); setMode('list'); load()
    } catch { toast('Error al crear acudiente', 'error') }
  }

  const handleLinkExisting = async (g: Guardian) => {
    try {
      await linkGuardianToDancer(id, g.id, 'Familiar', links.length === 0, dancer!.fullName, g.fullName)
      toast('Acudiente vinculado')
      setMode('list'); load()
    } catch { toast('Error al vincular', 'error') }
  }

  const handleUnlink = async () => {
    if (!unlinkTarget) return
    await unlinkGuardianFromDancer(unlinkTarget.id)
    toast('Acudiente desvinculado')
    setUnlinkTarget(null); load()
  }

  if (loading) return <PageLoader />

  const filtered = allGuardians.filter(g =>
    g.fullName.toLowerCase().includes(searchGuardian.toLowerCase()) ||
    g.documentNumber.includes(searchGuardian)
  )

  const F = ({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) => (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {err && <p style={{ color: 'var(--status-debt)', fontSize: '0.75rem', marginTop: 3 }}>{err}</p>}
    </div>
  )

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <Link href={`/dancers/${id}`} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Volver a {dancer?.fullName}
      </Link>

      {/* Current links */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Acudientes vinculados</h3>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs py-1.5 px-3" onClick={() => setMode(mode === 'link' ? 'list' : 'link')}>
              Vincular existente
            </button>
            <button className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1" onClick={() => setMode(mode === 'new' ? 'list' : 'new')}>
              <Plus size={12} /> Nuevo acudiente
            </button>
          </div>
        </div>

        {links.length === 0
          ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sin acudientes vinculados.</p>
          : links.map(l => (
            <div key={l.id} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{l.guardianName}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{l.relationship}</p>
              </div>
              <button onClick={() => setUnlinkTarget(l)} style={{ color: 'var(--status-debt)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))
        }
      </div>

      {/* New guardian form */}
      {mode === 'new' && (
        <div className="card p-6">
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 16 }}>Nuevo acudiente</h3>
          <form onSubmit={handleSubmit(handleCreateAndLink)} className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <F label="Nombre completo *" err={errors.fullName?.message}>
              <input className="field-input" {...register('fullName')} />
            </F>
            <F label="Documento *" err={errors.documentNumber?.message}>
              <input className="field-input" {...register('documentNumber')} />
            </F>
            <F label="Teléfono" err={errors.phone?.message}>
              <input className="field-input" {...register('phone')} />
            </F>
            <F label="Correo" err={errors.email?.message}>
              <input type="email" className="field-input" {...register('email')} />
            </F>
            <F label="Relación con el bailarín *" err={errors.relationship?.message}>
              <select className="field-input" {...register('relationship')}>
                <option value="">Seleccionar...</option>
                {['Madre', 'Padre', 'Abuelo/a', 'Tío/a', 'Hermano/a', 'Tutor legal', 'Otro'].map(r =>
                  <option key={r} value={r}>{r}</option>)}
              </select>
            </F>
            <F label="Dirección" err={errors.address?.message}>
              <input className="field-input" {...register('address')} />
            </F>
            <div style={{ gridColumn: '1 / -1' }}>
              <F label="Notas" err={errors.notes?.message}>
                <textarea className="field-input" rows={2} {...register('notes')} style={{ resize: 'vertical' }} />
              </F>
            </div>
            <div className="flex gap-3" style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn-primary text-sm" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Crear y vincular'}
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={() => { setMode('list'); reset() }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Link existing */}
      {mode === 'link' && (
        <div className="card p-6">
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 12 }}>Vincular acudiente existente</h3>
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input className="field-input pl-9" placeholder="Buscar por nombre o documento..."
              value={searchGuardian} onChange={e => setSearchGuardian(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {filtered.map(g => (
              <button key={g.id} onClick={() => handleLinkExisting(g)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors"
                style={{ background: 'transparent', border: '1px solid transparent', cursor: 'pointer', width: '100%' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500 }}>{g.fullName}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{g.documentNumber}</p>
                </div>
                <span style={{ color: 'var(--gold)', fontSize: '0.78rem' }}>Vincular →</span>
              </button>
            ))}
            {filtered.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>Sin resultados</p>}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!unlinkTarget}
        title="Desvincular acudiente"
        description={`¿Desvincular a ${unlinkTarget?.guardianName} de ${dancer?.fullName}?`}
        confirmLabel="Desvincular"
        variant="danger"
        onConfirm={handleUnlink}
        onCancel={() => setUnlinkTarget(null)}
      />
    </div>
  )
}
