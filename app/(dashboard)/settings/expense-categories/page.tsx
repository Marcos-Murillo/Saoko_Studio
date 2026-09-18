'use client'
import { useEffect, useState } from 'react'
import { getExpenseCategories, createExpenseCategory, updateExpenseCategory } from '@/lib/services/catalog.service'
import { CatalogManager } from '@/components/shared/CatalogManager'
import { PageHeader } from '@/components/shared/PageHeader'
import type { ExpenseCategory } from '@/types'

export default function ExpenseCategoriesPage() {
  const [items, setItems] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => { setLoading(true); setItems(await getExpenseCategories(false)); setLoading(false) }
  useEffect(() => { load() }, [])
  return (
    <div className="max-w-2xl">
      <PageHeader title="Categorías de Gastos" description="Clasifica los gastos de la academia para mejores reportes financieros." />
      <CatalogManager title="Categorías de Gastos" items={items as any} loading={loading}
        onCreate={async (n, d) => { await createExpenseCategory({ name: n, description: d, isActive: true }); load() }}
        onUpdate={async (id, n, d) => { await updateExpenseCategory(id, { name: n, description: d }); load() }}
        onToggle={async (id, v) => { await updateExpenseCategory(id, { isActive: v }); load() }} />
    </div>
  )
}
