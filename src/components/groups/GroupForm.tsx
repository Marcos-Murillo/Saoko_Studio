'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getModalities, getCategories, getLevels } from '@/lib/services/catalog.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { FormField } from '@/components/shared/FormField'
import { SaokoCombobox } from '@/components/shared/SaokoCombobox'
import type { Modality, Category, Level } from '@/types'

const schema = z.object({
  name:        z.string().min(2, 'Nombre requerido'),
  modalityId:  z.string().min(1, 'Modalidad requerida'),
  categoryId:  z.string().min(1, 'Categoría requerida'),
  levelId:     z.string().default(''),
  monthlyFee:  z.coerce.number().min(0, 'Valor inválido'),
  description: z.string().default(''),
})
export type GroupFormData = z.infer<typeof schema>

const sectionTitle = (text: string) => (
  <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--gold)' }}>{text}</p>
)

/* Aviso inline cuando una colección está vacía */
function EmptyCatalogWarning({ entity, path }: { entity: string; path: string }) {
  return (
    <div className="flex items-center gap-2 h-8 px-3 rounded-lg text-xs"
      style={{ background: 'var(--accent)', border: '1px solid rgba(232,160,48,.5)', color: '#e8a030' }}>
      ⚠ Sin {entity}. Ve a{' '}
      <a href={path} style={{ color: 'var(--gold)', textDecoration: 'underline' }}>
        Configuración → {entity}
      </a>{' '}
      para crearlos.
    </div>
  )
}

export function GroupForm({
  defaultValues, onSubmit, submitLabel = 'Guardar', compact = false,
}: {
  defaultValues?: Partial<GroupFormData>
  onSubmit: (data: GroupFormData) => Promise<void>
  submitLabel?: string
  compact?: boolean
}) {
  const [modalities, setModalities] = useState<Modality[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [levels,     setLevels]     = useState<Level[]>([])
  const [loading,    setLoading]    = useState(true)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<GroupFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: '', modalityId: '', categoryId: '', levelId: '',
      monthlyFee: 0, description: '', ...defaultValues,
    },
  })

  const watchModality = watch('modalityId')
  const watchCategory = watch('categoryId')
  const watchLevel    = watch('levelId')

  /* Carga inicial — modalidades, categorías y todos los niveles */
  useEffect(() => {
    setLoading(true)
    Promise.all([getModalities(), getCategories(), getLevels()])
      .then(([m, c, l]) => { setModalities(m); setCategories(c); setLevels(l) })
      .catch(() => { /* empty — warnings shown inline */ })
      .finally(() => setLoading(false))
  }, [])

  /* Cuando cambia la modalidad, filtra los niveles correspondientes */
  useEffect(() => {
    if (!watchModality) return
    getLevels(watchModality).then(setLevels).catch(() => {})
  }, [watchModality])

  const inputStyle = { background: 'var(--accent)', borderColor: 'var(--border)', color: 'var(--foreground)' }
  const grid = `grid gap-4${compact ? '' : ' sm:grid-cols-2'}`

  const ComboSkeleton = () => (
    <Skeleton className="h-8 w-full rounded-lg" style={{ background: 'var(--accent)' }} />
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <CardContent className="pt-5">
          {sectionTitle('Información del Grupo')}
          <div className={grid}>

            {/* Nombre — siempre texto libre */}
            <div className="sm:col-span-2">
              <FormField label="Nombre del grupo" required error={errors.name?.message}>
                <Input style={inputStyle} {...register('name')} placeholder="Ej: Salsa Caleña Infantil Iniciación" />
              </FormField>
            </div>

            {/* Modalidad — viene de Firestore */}
            <FormField label="Modalidad" required error={errors.modalityId?.message}>
              {loading ? <ComboSkeleton /> : modalities.length === 0
                ? <EmptyCatalogWarning entity="modalidades" path="/settings/modalities" />
                : (
                  <SaokoCombobox
                    options={modalities.map(m => ({ value: m.id, label: m.name }))}
                    value={watchModality}
                    onValueChange={v => { setValue('modalityId', v); setValue('levelId', '') }}
                    placeholder="Seleccionar modalidad..."
                  />
                )}
            </FormField>

            {/* Categoría — viene de Firestore */}
            <FormField label="Categoría" required error={errors.categoryId?.message}>
              {loading ? <ComboSkeleton /> : categories.length === 0
                ? <EmptyCatalogWarning entity="categorías" path="/settings/categories" />
                : (
                  <SaokoCombobox
                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                    value={watchCategory}
                    onValueChange={v => setValue('categoryId', v)}
                    placeholder="Seleccionar categoría..."
                  />
                )}
            </FormField>

            {/* Nivel — viene de Firestore, filtrado por modalidad */}
            <FormField label="Nivel (opcional)"
              hint={watchModality && levels.length === 0 && !loading
                ? 'Esta modalidad no tiene niveles. Créalos en Configuración → Niveles.'
                : undefined}>
              {loading ? <ComboSkeleton /> : (
                <SaokoCombobox
                  options={[
                    { value: '', label: 'Sin nivel' },
                    ...levels.map(l => ({ value: l.id, label: l.name })),
                  ]}
                  value={watchLevel}
                  onValueChange={v => setValue('levelId', v)}
                  placeholder={levels.length === 0 ? 'Sin niveles disponibles' : 'Seleccionar nivel...'}
                  disabled={levels.length === 0}
                />
              )}
            </FormField>

            {/* Mensualidad — siempre numérico */}
            <FormField label="Mensualidad (COP)" required error={errors.monthlyFee?.message}>
              <Input type="number" min={0} style={inputStyle} {...register('monthlyFee')} placeholder="100000" />
            </FormField>

            {/* Descripción */}
            <div className="sm:col-span-2">
              <FormField label="Descripción">
                <textarea rows={3}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                  style={{ background: 'var(--accent)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  {...register('description')} placeholder="Descripción del grupo, objetivos, nivel de exigencia..." />
              </FormField>
            </div>

          </div>
        </CardContent>
      </Card>

      <Separator style={{ background: 'var(--border)' }} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => history.back()}
          style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || loading}
          style={{ background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))', color: '#000', border: 'none', minWidth: 140 }}>
          {isSubmitting ? 'Guardando...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
