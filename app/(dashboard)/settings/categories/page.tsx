'use client'
import { useEffect, useState } from 'react'
import { getCategories, createCategory, updateCategory } from '@/lib/services/catalog.service'
import { CatalogManager } from '@/components/shared/CatalogManager'
import { PageHeader } from '@/components/shared/PageHeader'
import type { Category } from '@/types'

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => { setLoading(true); setItems(await getCategories(false)); setLoading(false) }
  useEffect(() => { load() }, [])
  return (
    <div className="max-w-2xl">
      <PageHeader title="Categorías" description="Clasifican bailarines y grupos. Un bailarín puede tener varias, por ejemplo Adulto y Doble Proceso." />
      <CatalogManager title="Categorías de Bailarines" items={items as any} loading={loading}
        onCreate={async (n, d) => { await createCategory({ name: n, description: d, isActive: true, minAge: null, maxAge: null, sortOrder: items.length }); load() }}
        onUpdate={async (id, n, d) => { await updateCategory(id, { name: n, description: d }); load() }}
        onToggle={async (id, v) => { await updateCategory(id, { isActive: v }); load() }} />
    </div>
  )
}
