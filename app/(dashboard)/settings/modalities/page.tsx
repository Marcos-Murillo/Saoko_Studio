'use client'
import { useEffect, useState } from 'react'
import { getModalities, createModality, updateModality } from '@/lib/services/catalog.service'
import { CatalogManager } from '@/components/shared/CatalogManager'
import { PageHeader } from '@/components/shared/PageHeader'
import type { Modality } from '@/types'

export default function ModalitiesPage() {
  const [items, setItems] = useState<Modality[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => { setLoading(true); setItems(await getModalities(false)); setLoading(false) }
  useEffect(() => { load() }, [])
  return (
    <div className="max-w-2xl">
      <PageHeader title="Modalidades" description="Define las disciplinas de danza que ofrece Saoko. Cada grupo pertenece a una modalidad." />
      <CatalogManager title="Modalidades de Danza" items={items as any} loading={loading}
        onCreate={async (n, d) => { await createModality({ name: n, description: d, isActive: true }); load() }}
        onUpdate={async (id, n, d) => { await updateModality(id, { name: n, description: d }); load() }}
        onToggle={async (id, v) => { await updateModality(id, { isActive: v }); load() }} />
    </div>
  )
}
