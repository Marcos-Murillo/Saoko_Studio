'use client'
import { useEffect, useState } from 'react'
import { getPaymentMethods, createPaymentMethod, updatePaymentMethod } from '@/lib/services/catalog.service'
import { CatalogManager } from '@/components/shared/CatalogManager'
import { PageHeader } from '@/components/shared/PageHeader'
import type { PaymentMethod } from '@/types'

export default function PaymentMethodsPage() {
  const [items, setItems] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => { setLoading(true); setItems(await getPaymentMethods(false)); setLoading(false) }
  useEffect(() => { load() }, [])
  return (
    <div className="max-w-2xl">
      <PageHeader title="Métodos de Pago" description="Define los métodos de pago disponibles al registrar cobros y gastos." />
      <CatalogManager title="Métodos de Pago" items={items as any} loading={loading}
        onCreate={async (n) => { await createPaymentMethod({ name: n, isActive: true }); load() }}
        onUpdate={async (id, n) => { await updatePaymentMethod(id, { name: n }); load() }}
        onToggle={async (id, v) => { await updatePaymentMethod(id, { isActive: v }); load() }} />
    </div>
  )
}
