'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Timestamp } from 'firebase/firestore'
import { createExpense } from '@/lib/services/expense.service'
import { getExpenseCategories, getPaymentMethods } from '@/lib/services/catalog.service'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/components/shared/Toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormField } from '@/components/shared/FormField'
import { SaokoCombobox } from '@/components/shared/SaokoCombobox'
import { DatePicker } from '@/components/shared/DatePicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { uploadReceipt } from '@/lib/firebase/storage'
import type { ExpenseCategory, PaymentMethod } from '@/types'

const schema = z.object({
  concept:         z.string().min(2, 'Concepto requerido'),
  categoryId:      z.string().min(1, 'Categoría requerida'),
  amount:          z.coerce.number().min(1, 'Monto inválido'),
  expenseDate:     z.string().min(1, 'Fecha requerida'),
  paymentMethodId: z.string().min(1, 'Método requerido'),
  description:     z.string().default(''),
})
type FormData = z.infer<typeof schema>

export default function NewExpensePage() {
  const router = useRouter()
  const { adminUser } = useAuth()
  const toast  = useToast()
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [methods,    setMethods]    = useState<PaymentMethod[]>([])
  const [receipt,    setReceipt]    = useState<File | null>(null)

  useEffect(() => {
    Promise.all([getExpenseCategories(), getPaymentMethods()]).then(([c, m]) => {
      setCategories(c); setMethods(m)
    })
  }, [])

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { expenseDate: new Date().toISOString().split('T')[0] },
  })

  const watchCategory = watch('categoryId')
  const watchMethod   = watch('paymentMethodId')

  const onSubmit = async (data: FormData) => {
    if (!adminUser) return
    const cat    = categories.find(c => c.id === data.categoryId)
    const method = methods.find(m => m.id === data.paymentMethodId)
    let receiptUrl: string | null = null
    if (receipt) receiptUrl = await uploadReceipt(receipt)
    await createExpense({
      concept: data.concept, categoryId: data.categoryId, categoryName: cat?.name ?? '',
      amount: data.amount, expenseDate: Timestamp.fromDate(new Date(data.expenseDate)),
      paymentMethodId: data.paymentMethodId, paymentMethodName: method?.name ?? '',
      description: data.description, receiptUrl,
      registeredById: adminUser.id, registeredByName: adminUser.name,
    })
    toast('Gasto registrado correctamente')
    router.push('/accounting/expenses')
  }

  const inputStyle = { background: 'var(--accent)', borderColor: 'var(--border)', color: 'var(--foreground)' }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Registrar Gasto"
        description="Registra un gasto de la academia. Mantén categorías actualizadas para mejores reportes."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardContent className="pt-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--gold)' }}>Detalles del Gasto</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField label="Concepto" required error={errors.concept?.message}>
                  <Input style={inputStyle} {...register('concept')} placeholder="Ej: Pago de arriendo salón de ensayo" />
                </FormField>
              </div>
              <FormField label="Categoría" required error={errors.categoryId?.message}>
                <SaokoCombobox
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  value={watchCategory} onValueChange={v => setValue('categoryId', v)}
                  placeholder="Seleccionar categoría..." />
              </FormField>
              <FormField label="Monto (COP)" required error={errors.amount?.message}>
                <Input type="number" min={1} style={inputStyle} {...register('amount')} placeholder="50000" />
              </FormField>
              <FormField label="Fecha" required error={errors.expenseDate?.message}>
                <DatePicker value={watch('expenseDate')} onChange={v => setValue('expenseDate', v, { shouldValidate: true })} />
              </FormField>
              <FormField label="Método de pago" required error={errors.paymentMethodId?.message}>
                <SaokoCombobox
                  options={methods.map(m => ({ value: m.id, label: m.name }))}
                  value={watchMethod} onValueChange={v => setValue('paymentMethodId', v)}
                  placeholder="Seleccionar método..." />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Recibo (PDF o imagen)">
                  <Input type="file" accept="image/*,.pdf" onChange={e => setReceipt(e.target.files?.[0] ?? null)} />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField label="Descripción / Observación">
                  <textarea rows={3}
                    className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                    style={{ background: 'var(--accent)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    {...register('description')} placeholder="Detalles adicionales del gasto..." />
                </FormField>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator style={{ background: 'var(--border)' }} />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}
            style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}
            style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none', minWidth: 160 }}>
            {isSubmitting ? 'Guardando...' : 'Registrar gasto'}
          </Button>
        </div>
      </form>
    </div>
  )
}
