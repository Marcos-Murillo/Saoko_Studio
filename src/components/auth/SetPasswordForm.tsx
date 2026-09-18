'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/FormField'
import { NEW_PASSWORD_HINT } from '@/lib/auth/identity'

const schema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export function SetPasswordForm({
  onSubmit,
  submitLabel = 'Guardar contraseña',
}: {
  onSubmit: (password: string) => Promise<void>
  submitLabel?: string
}) {
  const [showPass, setShowPass] = useState(false)
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  })

  const submit = async (data: FormData) => {
    setFormError('')
    try {
      await onSubmit(data.password)
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'No se pudo guardar la contraseña')
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      {formError && (
        <p className="text-sm" style={{ color: '#e05252' }}>{formError}</p>
      )}
      <FormField label="Nueva contraseña" error={errors.password?.message} hint={NEW_PASSWORD_HINT}>
        <div className="relative">
          <Input
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            className="pr-10"
            style={{
              background: 'var(--accent)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </FormField>
      <FormField label="Confirmar contraseña" error={errors.confirmPassword?.message}>
        <Input
          type={showPass ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete="new-password"
          style={{
            background: 'var(--accent)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
          {...register('confirmPassword')}
        />
      </FormField>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full mt-2 h-12 font-semibold text-sm rounded-xl"
        style={{
          background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
          color: '#000',
          border: 'none',
          opacity: isSubmitting ? 0.75 : 1,
        }}
      >
        {isSubmitting ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  )
}
