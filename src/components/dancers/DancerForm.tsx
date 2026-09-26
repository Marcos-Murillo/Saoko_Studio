'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getCategories } from '@/lib/services/catalog.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FormField } from '@/components/shared/FormField'
import { SaokoCombobox } from '@/components/shared/SaokoCombobox'
import { DatePicker } from '@/components/shared/DatePicker'
import { FileUpload } from '@/components/ui/file-upload'
import { uploadToImgbb } from '@/lib/imgbb'
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
  photoUrl:       z.string().optional().default(''),
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
  <p className="text-[0.65rem] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--gold)' }}>
    {text}
  </p>
)

const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)' }

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
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError,    setPhotoError]    = useState('')

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<DancerFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      fullName: '', documentNumber: '', birthDate: '', address: '',
      neighborhood: '', commune: '', eps: '', epsLocation: '', bloodType: '',
      email: '', phone: '', categoryId: '', notes: '', photoUrl: '', ...defaultValues,
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
  const photoUrl        = watch('photoUrl')

  const handlePhoto = async (files: File[]) => {
    const file = files[0]
    if (!file) {
      setPhotoError('Elige una imagen (JPG, PNG o WebP)')
      return
    }
    setUploadingPhoto(true)
    setPhotoError('')
    try {
      const url = await uploadToImgbb(file)
      setValue('photoUrl', url, { shouldDirty: true })
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'No se pudo subir la foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const fieldCols = 'grid grid-cols-1 gap-y-2'
  const bloodOptions = BLOOD_TYPES.map(b => ({ value: b, label: b }))

  const photoCard = (
    <Card size="sm" className="self-start" style={cardStyle}>
      <CardContent className="py-0">
        <div className="flex items-center justify-between gap-2">
          {sectionTitle('Foto')}
          {photoUrl && (
            <button
              type="button"
              className="mb-2 text-xs"
              style={{ color: '#e05252', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => setValue('photoUrl', '', { shouldDirty: true })}
            >
              Quitar foto
            </button>
          )}
        </div>
        <FileUpload onChange={handlePhoto} previewUrl={photoUrl || null} />
        {uploadingPhoto && <p className="text-xs mt-2" style={{ color: 'var(--gold)' }}>Subiendo foto…</p>}
        {photoError && <p className="text-xs mt-2" style={{ color: 'var(--destructive)' }}>{photoError}</p>}
      </CardContent>
    </Card>
  )

  const personalCard = (
    <Card size="sm" className="shrink-0" style={cardStyle}>
      <CardContent className="py-0">
        {sectionTitle('Información personal')}
        <div className={fieldCols}>
          <FormField label="Nombre completo" required error={errors.fullName?.message}>
            <Input style={inputStyle} {...register('fullName')} placeholder="Juan David Pérez García" />
          </FormField>
          <FormField label="Número de documento" required error={errors.documentNumber?.message}>
            <Input style={inputStyle} {...register('documentNumber')} placeholder="10001234567" />
          </FormField>
          <FormField label="Fecha de nacimiento" required error={errors.birthDate?.message}>
            <DatePicker value={watch('birthDate')} onChange={v => setValue('birthDate', v, { shouldValidate: true })} />
          </FormField>
          <FormField label="Categoría" required error={errors.categoryId?.message}
            hint={catsError ? 'No se pudieron cargar las categorías.' : undefined}>
            {loadingCats ? (
              <Skeleton className="h-8 w-full rounded-lg" style={{ background: 'var(--accent)' }} />
            ) : categories.length === 0 ? (
              <div className="flex items-center h-8 px-3 rounded-lg text-xs"
                style={{ background: 'var(--accent)', border: '1px solid var(--border)', color: '#e8a030' }}>
                Sin categorías. Créalas en Ajustes.
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
  )

  const addressCard = (
    <Card size="sm" style={cardStyle}>
      <CardContent className="py-0">
        {sectionTitle('Dirección')}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <div className="col-span-2">
            <FormField label="Dirección">
              <Input style={inputStyle} {...register('address')} placeholder="Calle 15 # 25-40" />
            </FormField>
          </div>
          <FormField label="Barrio">
            <Input style={inputStyle} {...register('neighborhood')} placeholder="El Limonar" />
          </FormField>
          <FormField label="Comuna">
            <SaokoCombobox
              options={COMMUNES}
              value={watchedCommune}
              onValueChange={v => setValue('commune', v)}
              placeholder="Comuna..."
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  )

  const medicalCard = (
    <Card size="sm" style={cardStyle}>
      <CardContent className="py-0">
        {sectionTitle('Datos médicos')}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <FormField label="EPS">
            <Input style={inputStyle} {...register('eps')} placeholder="Nueva EPS, Sura..." />
          </FormField>
          <FormField label="Lugar de atención">
            <Input style={inputStyle} {...register('epsLocation')} placeholder="Clínica" />
          </FormField>
          <div className="col-span-2">
            <FormField label="Grupo sanguíneo">
              <SaokoCombobox
                options={bloodOptions}
                value={watchedBlood}
                onValueChange={v => setValue('bloodType', v)}
                placeholder="RH..."
              />
            </FormField>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const notesCard = (
    <Card size="sm" className="flex min-h-0 flex-1 flex-col" style={cardStyle}>
      <CardContent className="flex min-h-0 flex-1 flex-col py-0">
        <FormField label="Observaciones" className="min-h-0 flex-1">
          <textarea
            className="min-h-24 w-full flex-1 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none"
            style={{ background: 'var(--accent)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            {...register('notes')}
            placeholder="Información adicional..."
          />
        </FormField>
      </CardContent>
    </Card>
  )

  const actions = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => history.back()}
        style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
        Cancelar
      </Button>
      <Button type="submit" size="sm" disabled={isSubmitting || loadingCats || uploadingPhoto}
        style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none', minWidth: 140 }}>
        {isSubmitting ? 'Guardando...' : submitLabel}
      </Button>
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={compact ? 'flex flex-col gap-3' : 'flex flex-col gap-4'}>
      <div className="grid items-stretch gap-4 md:grid-cols-[minmax(240px,0.85fr)_minmax(0,1.35fr)]">
        <div className="flex flex-col gap-4">
          {photoCard}
          {addressCard}
          {medicalCard}
        </div>
        <div className="flex h-full min-h-0 flex-col gap-4">
          {personalCard}
          {notesCard}
        </div>
      </div>
      {actions}
    </form>
  )
}
