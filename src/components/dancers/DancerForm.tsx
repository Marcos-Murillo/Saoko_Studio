'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getCategories } from '@/lib/services/catalog.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { FormField } from '@/components/shared/FormField'
import { SaokoCombobox } from '@/components/shared/SaokoCombobox'
import { DatePicker } from '@/components/shared/DatePicker'
import type { Category, BloodType } from '@/types'

const schema = z.object({
  fullName:       z.string().min(2, 'Nombre requerido'),
  documentNumber: z.string().min(3, 'Documento requerido'),
  birthDate:      z.string().min(1, 'Fecha requerida'),
  address:        z.string().optional().default(''),
  neighborhood:   z.string().optional().default(''),
  commune:        z.string().optional().default(''),
  eps:            z.string().optional().default(''),
  epsLocation:    z.string().optional().default(''),
  bloodType:      z.string().optional().default(''),
  email:          z.string().optional().default(''),
  phone:          z.string().optional().default(''),
  categoryId:     z.string().min(1, 'Categoría requerida'),
  notes:          z.string().optional().default(''),
})
export type DancerFormData = z.infer<typeof schema>

/* ─── Opciones estáticas (no se gestionan en catálogo de Firestore) ──────── */
const BLOOD_TYPES: BloodType[] = ['A+','A-','B+','B-','AB+','AB-','O+','O-']
const COMMUNES = Array.from({ length: 22 }, (_, i) => ({
  value: String(i + 1),
  label: `Comuna ${i + 1}`,
}))
// EPS y barrios son datos de libre entrada — mostramos sugerencias pero el usuario
// puede escribir cualquier valor.

const sectionTitle = (text: string) => (
  <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--gold)' }}>
    {text}
  </p>
)

const inputStyle = {
  background: 'var(--accent)',
  borderColor: 'var(--border)',
  color: 'var(--foreground)',
}

export function DancerForm({
  defaultValues, onSubmit, submitLabel = 'Guardar', compact = false,
}: {
  defaultValues?: Partial<DancerFormData>
  onSubmit: (data: DancerFormData) => Promise<void>
  submitLabel?: string
  compact?: boolean
}) {
  const [categories,    setCategories]    = useState<Category[]>([])
  const [loadingCats,   setLoadingCats]   = useState(true)
  const [catsError,     setCatsError]     = useState(false)

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<DancerFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      fullName: '', documentNumber: '', birthDate: '', address: '',
      neighborhood: '', commune: '', eps: '', epsLocation: '', bloodType: '',
      email: '', phone: '', categoryId: '', notes: '', ...defaultValues,
    },
  })

  useEffect(() => {
    setLoadingCats(true)
    setCatsError(false)
    getCategories()
      .then(cats => { setCategories(cats); setLoadingCats(false) })
      .catch(() => { setCatsError(true); setLoadingCats(false) })
  }, [])

  const watchedCategory = watch('categoryId')
  const watchedBlood    = watch('bloodType')
  const watchedCommune  = watch('commune')

  const grid = `grid gap-4${compact ? '' : ' sm:grid-cols-2'}`

  const bloodOptions = BLOOD_TYPES.map(b => ({ value: b, label: b }))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

      {/* ── Personal ─────────────────────────────────────────────────────── */}
      <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <CardContent className="pt-5">
          {sectionTitle('Información Personal')}
          <div className={grid}>
            <FormField label="Nombre completo" required error={errors.fullName?.message}>
              <Input style={inputStyle} {...register('fullName')} placeholder="Juan David Pérez García" />
            </FormField>

            <FormField label="Número de documento" required error={errors.documentNumber?.message}>
              <Input style={inputStyle} {...register('documentNumber')} placeholder="10001234567" />
            </FormField>

            <FormField label="Fecha de nacimiento" required error={errors.birthDate?.message}>
              <DatePicker value={watch('birthDate')} onChange={v => setValue('birthDate', v, { shouldValidate: true })} />
            </FormField>

            {/* Categoría — viene de Firestore */}
            <FormField label="Categoría" required error={errors.categoryId?.message}
              hint={catsError ? '⚠ Error al cargar categorías. Revisa la conexión a Firebase.' : undefined}>
              {loadingCats ? (
                <Skeleton className="h-8 w-full rounded-lg" style={{ background: 'var(--accent)' }} />
              ) : categories.length === 0 ? (
                <div className="flex items-center gap-2 h-8 px-3 rounded-lg text-xs"
                  style={{ background: 'var(--accent)', border: '1px solid var(--border)', color: '#e8a030' }}>
                  ⚠ Sin categorías. Ve a Configuración → Categorías para crearlas.
                </div>
              ) : (
                <SaokoCombobox
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  value={watchedCategory}
                  onValueChange={v => setValue('categoryId', v)}
                  placeholder="Seleccionar categoría..."
                />
              )}
            </FormField>

            <FormField label="Teléfono">
              <Input style={inputStyle} {...register('phone')} placeholder="3001234567" />
            </FormField>

            <FormField label="Correo electrónico" error={errors.email?.message}>
              <Input type="email" style={inputStyle} {...register('email')} placeholder="correo@email.com" />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* ── Dirección ────────────────────────────────────────────────────── */}
      <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <CardContent className="pt-5">
          {sectionTitle('Dirección')}
          <div className={grid}>
            <div className="sm:col-span-2">
              <FormField label="Dirección">
                <Input style={inputStyle} {...register('address')} placeholder="Calle 15 # 25-40 Apto 301" />
              </FormField>
            </div>

            {/* Barrio — texto libre */}
            <FormField label="Barrio">
              <Input style={inputStyle} {...register('neighborhood')} placeholder="Ej: El Limonar, Versalles..." />
            </FormField>

            {/* Comuna — combobox con opciones fijas (1–22, Cali) */}
            <FormField label="Comuna">
              <SaokoCombobox
                options={COMMUNES}
                value={watchedCommune}
                onValueChange={v => setValue('commune', v)}
                placeholder="Seleccionar comuna..."
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* ── Datos médicos ─────────────────────────────────────────────────── */}
      <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <CardContent className="pt-5">
          {sectionTitle('Datos Médicos')}
          <div className={grid}>
            {/* EPS — texto libre (no está en catálogo de Firestore) */}
            <FormField label="EPS" hint="Escribe el nombre de la EPS">
              <Input style={inputStyle} {...register('eps')} placeholder="Ej: Nueva EPS, Sura, Sanitas..." />
            </FormField>

            <FormField label="Lugar de atención EPS">
              <Input style={inputStyle} {...register('epsLocation')} placeholder="Clínica Valle del Lili" />
            </FormField>

            {/* Grupo sanguíneo — opciones fijas */}
            <FormField label="Grupo sanguíneo (RH)">
              <SaokoCombobox
                options={bloodOptions}
                value={watchedBlood}
                onValueChange={v => setValue('bloodType', v)}
                placeholder="Seleccionar..."
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* ── Observaciones ─────────────────────────────────────────────────── */}
      <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <CardContent className="pt-5">
          <FormField label="Observaciones">
            <textarea
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
              style={{ background: 'var(--accent)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              {...register('notes')}
              placeholder="Información adicional relevante..."
            />
          </FormField>
        </CardContent>
      </Card>

      <Separator style={{ background: 'var(--border)' }} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => history.back()}
          style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || loadingCats}
          style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none', minWidth: 140 }}>
          {isSubmitting ? 'Guardando...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
