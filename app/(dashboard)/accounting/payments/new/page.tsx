'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, Search } from 'lucide-react'
import { registerPayment, type AllocationResult } from '@/lib/services/payment.service'
import { getDancers } from '@/lib/services/dancer.service'
import { getPaymentMethods } from '@/lib/services/catalog.service'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/components/shared/Toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { FormField } from '@/components/shared/FormField'
import { SaokoCombobox } from '@/components/shared/SaokoCombobox'
import { DatePicker } from '@/components/shared/DatePicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatCurrency } from '@/lib/utils/currency'
import { formatCurrency as fmtC } from '@/lib/utils/currency'
import { getDancerCurrentMemberships } from '@/lib/services/group.service'
import type { Dancer, PaymentMethod, GroupMembership } from '@/types'

const schema = z.object({
  dancerId:        z.string().min(1, 'Selecciona un bailarín'),
  amount:          z.coerce.number().min(1, 'Monto debe ser mayor a 0'),
  paymentDate:     z.string().min(1, 'Fecha requerida'),
  paymentMethodId: z.string().min(1, 'Método requerido'),
  concept:         z.string().min(1, 'Concepto requerido'),
  notes:           z.string().default(''),
})
type FormData = z.infer<typeof schema>

const CONCEPTS = [
  { value: 'mensualidad',   label: 'Mensualidad' },
  { value: 'inscripcion',   label: 'Inscripción' },
  { value: 'vestuario',     label: 'Vestuario' },
  { value: 'competencia',   label: 'Competencia' },
  { value: 'otro',          label: 'Otro' },
]

export default function NewPaymentPage() {
  const router = useRouter()
  const { adminUser } = useAuth()
  const toast   = useToast()
  const [dancers,  setDancers]  = useState<Dancer[]>([])
  const [methods,  setMethods]  = useState<PaymentMethod[]>([])
  const [search,   setSearch]   = useState('')
  const [memberships, setMemberships] = useState<GroupMembership[]>([])
  const [groupId, setGroupId] = useState('')
  const [result, setResult] = useState<AllocationResult | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      paymentDate: new Date().toISOString().split('T')[0],
      concept: 'mensualidad',
    },
  })

  useEffect(() => {
    Promise.all([getDancers(true), getPaymentMethods()]).then(([d, m]) => {
      setDancers(d); setMethods(m)
    })
  }, [])

  const selectedDancerId = watch('dancerId')
  const watchConcept     = watch('concept')
  const watchMethod      = watch('paymentMethodId')
  const selectedDancer   = dancers.find(d => d.id === selectedDancerId)

  useEffect(() => {
    if (!selectedDancerId) { setMemberships([]); setGroupId(''); return }
    getDancerCurrentMemberships(selectedDancerId).then(m => {
      setMemberships(m)
      setGroupId(m.length === 1 ? m[0].groupId : '')
    })
  }, [selectedDancerId])

  const filteredDancers = dancers.filter(d =>
    !search || d.fullName.toLowerCase().includes(search.toLowerCase()) || d.documentNumber.includes(search)
  )

  const onSubmit = async (data: FormData) => {
    if (!adminUser || !selectedDancer) return
    const method = methods.find(m => m.id === data.paymentMethodId)
    const res = await registerPayment({
      dancerId: data.dancerId, dancerName: selectedDancer.fullName,
      amount: data.amount, paymentDate: new Date(data.paymentDate),
      paymentMethodId: data.paymentMethodId, paymentMethodName: method?.name ?? '',
      concept: data.concept, notes: data.notes,
      registeredById: adminUser.id, registeredByName: adminUser.name,
      groupId: groupId || undefined,
    })
    setResult(res)
  }

  const inputStyle = { background: 'var(--accent)', borderColor: 'var(--border)', color: 'var(--foreground)' }

  /* ─── Success screen ─── */
  if (result) return (
    <div className="flex flex-col items-center gap-6 py-16 max-w-sm mx-auto">
      <div className="flex items-center justify-center w-16 h-16 rounded-full" style={{ background: 'rgba(76,175,125,.15)' }}>
        <CheckCircle size={34} style={{ color: '#4caf7d' }} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>Pago registrado</h2>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>El pago fue aplicado correctamente</p>
      </div>
      <Card className="w-full" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <CardContent className="pt-5 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--muted-foreground)' }}>Aplicaciones</p>
          {result.allocations.map((a, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Mensualidad #{i + 1}</span>
              <span className="text-sm font-semibold" style={{ color: '#4caf7d' }}>{fmtC(a.applied)}</span>
            </div>
          ))}
          {result.creditGenerated > 0 && (
            <>
              <Separator style={{ background: 'var(--border)' }} />
              <div className="flex justify-between">
                <span className="text-sm font-medium" style={{ color: '#4a90d9' }}>Saldo a favor generado</span>
                <span className="text-sm font-bold" style={{ color: '#4a90d9' }}>{fmtC(result.creditGenerated)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setResult(null)}
          style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
          Registrar otro
        </Button>
        <Button onClick={() => router.push('/accounting/payments')}
          style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none' }}>
          Ver todos los pagos
        </Button>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Registrar Pago"
        description="Si eliges un grupo, el pago cubre primero las cuotas de ese grupo y luego el resto de deudas más antiguas."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {/* Dancer selector */}
        <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardContent className="pt-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--gold)' }}>Bailarín</p>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
              <Input className="pl-9" placeholder="Buscar bailarín activo…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={inputStyle} />
            </div>
            {errors.dancerId && <p className="text-xs mb-2" style={{ color: 'var(--destructive)' }}>{errors.dancerId.message}</p>}
            <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
              {filteredDancers.slice(0, 10).map(d => (
                <button key={d.id} type="button"
                  onClick={() => { setValue('dancerId', d.id); setSearch(d.fullName) }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left w-full transition-colors"
                  style={{
                    background:  selectedDancerId === d.id ? 'rgba(201,168,76,.12)' : 'transparent',
                    border:      selectedDancerId === d.id ? '1px solid rgba(201,168,76,.3)' : '1px solid transparent',
                    cursor:      'pointer',
                  }}>
                  <Avatar size="sm">
                    <AvatarFallback style={{ background: 'rgba(201,168,76,.14)', color: 'var(--gold)', fontSize: '0.72rem', fontWeight: 700 }}>
                      {d.fullName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: selectedDancerId === d.id ? 'var(--gold)' : 'var(--foreground)' }}>
                      {d.fullName}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                      {d.currentGroupName ?? 'Sin grupo'}
                    </p>
                  </div>
                  {selectedDancerId === d.id && <CheckCircle size={15} style={{ color: 'var(--gold)', flexShrink: 0 }} />}
                </button>
              ))}
              {filteredDancers.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--muted-foreground)' }}>Sin resultados</p>
              )}
            </div>
            <input type="hidden" {...register('dancerId')} />
          </CardContent>
        </Card>

        {/* Payment details */}
        <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardContent className="pt-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--gold)' }}>Detalles del Pago</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Monto (COP)" required error={errors.amount?.message}>
                <Input type="number" min={1} style={inputStyle} {...register('amount')} placeholder="100000" />
              </FormField>
              <FormField label="Fecha del pago" required error={errors.paymentDate?.message}>
                <DatePicker value={watch('paymentDate')} onChange={v => setValue('paymentDate', v, { shouldValidate: true })} />
              </FormField>
              <FormField label="Método de pago" required error={errors.paymentMethodId?.message}>
                <SaokoCombobox
                  options={methods.map(m => ({ value: m.id, label: m.name }))}
                  value={watchMethod} onValueChange={v => setValue('paymentMethodId', v)}
                  placeholder="Seleccionar método..." />
              </FormField>
              <FormField label="Grupo a abonar" hint="Prioridad de aplicación. El excedente pasa a otras deudas o a saldo a favor.">
                <SaokoCombobox
                  options={memberships.map(m => ({ value: m.groupId, label: m.groupName ?? m.groupId }))}
                  value={groupId} onValueChange={setGroupId}
                  placeholder={memberships.length ? 'Seleccionar grupo...' : 'Sin grupos actuales'} />
              </FormField>
              <FormField label="Concepto" required error={errors.concept?.message}>
                <SaokoCombobox
                  options={CONCEPTS}
                  value={watchConcept} onValueChange={v => setValue('concept', v)}
                  placeholder="Seleccionar concepto..." />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Observaciones">
                  <textarea rows={2}
                    className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                    style={{ background: 'var(--accent)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    {...register('notes')} placeholder="Nota adicional..." />
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
          <Button type="submit" disabled={isSubmitting || !selectedDancerId}
            style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none', minWidth: 160 }}>
            {isSubmitting ? 'Registrando...' : 'Registrar pago'}
          </Button>
        </div>
      </form>
    </div>
  )
}
