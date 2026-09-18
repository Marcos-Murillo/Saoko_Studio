'use client'
import { useEffect, useState } from 'react'
import { getLevels, createLevel, updateLevel, getModalities } from '@/lib/services/catalog.service'
import { CatalogManager } from '@/components/shared/CatalogManager'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import type { Level, Modality } from '@/types'

export default function LevelsPage() {
  const [items,      setItems]      = useState<Level[]>([])
  const [modalities, setModalities] = useState<Modality[]>([])
  const [loading,    setLoading]    = useState(true)
  const load = async () => {
    setLoading(true)
    const [l, m] = await Promise.all([getLevels(undefined, false), getModalities(false)])
    setItems(l); setModalities(m); setLoading(false)
  }
  useEffect(() => { load() }, [])
  return (
    <div className="max-w-2xl">
      <PageHeader title="Niveles" description="Niveles de habilidad dentro de cada modalidad (Iniciación, Segunda Línea, etc.)." />
      <CatalogManager title="Niveles de Danza" items={items as any} loading={loading}
        onCreate={async (n, d) => { await createLevel({ name: n, description: d, isActive: true, modalityId: null, sortOrder: items.length }); load() }}
        onUpdate={async (id, n, d) => { await updateLevel(id, { name: n, description: d }); load() }}
        onToggle={async (id, v) => { await updateLevel(id, { isActive: v }); load() }}
        extraFields={(item) => {
          const level = item as unknown as Level
          const mod = modalities.find(m => m.id === level.modalityId)
          return mod ? (
            <Badge variant="outline" style={{ color: 'var(--gold)', borderColor: 'rgba(201,168,76,.3)', background: 'rgba(201,168,76,.1)', fontSize: '0.68rem' }}>
              {mod.name}
            </Badge>
          ) : null
        }} />
    </div>
  )
}
