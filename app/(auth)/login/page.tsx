'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Music, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { FormField } from '@/components/shared/FormField'
import { SetPasswordForm } from '@/components/auth/SetPasswordForm'
import { NEW_PASSWORD_HINT, isDocumentNumber } from '@/lib/auth/identity'

const loginSchema = z.object({
  username: z.string().min(1, 'Campo requerido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type LoginData = z.infer<typeof loginSchema>

const firstAccessSchema = z.object({
  email: z.string().email('Correo inválido'),
  documentNumber: z.string().refine(isDocumentNumber, 'Cédula inválida (6 a 15 dígitos)'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
}).refine(d => d.password !== d.documentNumber.replace(/\D/g, ''), {
  message: 'La contraseña no puede ser tu número de cédula',
  path: ['password'],
})
type FirstAccessData = z.infer<typeof firstAccessSchema>

export default function LoginPage() {
  const { signIn, completeFirstAccess, completePasswordSetup, adminUser, user, loading } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'first'>('login')
  const [showPass, setShowPass] = useState(false)
  const [authError, setAuthError] = useState('')
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false)

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema) as any,
  })
  const firstForm = useForm<FirstAccessData>({
    resolver: zodResolver(firstAccessSchema) as any,
  })

  useEffect(() => {
    if (loading) return
    if (user && adminUser?.mustSetPassword) {
      setNeedsPasswordSetup(true)
      return
    }
    if (user && adminUser && !adminUser.mustSetPassword) {
      router.replace('/dashboard')
    }
  }, [user, adminUser, loading, router])

  const onLogin = async (data: LoginData) => {
    setAuthError('')
    try {
      const result = await signIn(data.username, data.password)
      if (result.mustSetPassword) {
        setNeedsPasswordSetup(true)
        return
      }
      router.replace('/dashboard')
    } catch {
      setAuthError('Usuario o contraseña incorrectos. Verifica tus datos.')
    }
  }

  const onFirstAccess = async (data: FirstAccessData) => {
    setAuthError('')
    try {
      await completeFirstAccess({
        email: data.email,
        documentNumber: data.documentNumber,
        password: data.password,
      })
      router.replace('/dashboard')
    } catch (e: unknown) {
      setAuthError(e instanceof Error ? e.message : 'No se pudo completar el primer ingreso.')
    }
  }

  const onForcedSetup = async (password: string) => {
    await completePasswordSetup(password)
    router.replace('/dashboard')
  }

  return (
    <div
      className="min-h-dvh flex items-center justify-center px-5 py-8"
      style={{ background: 'var(--background)' }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 35% at 50% 50%, rgba(201,168,76,.06) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-[400px] relative">
        <Card
          className="shadow-2xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <CardHeader className="items-center pb-2 pt-8 px-6 md:px-8 gap-0">
            <div
              className="flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
              style={{
                background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
              }}
            >
              <Music size={26} color="#000" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center" style={{ color: 'var(--foreground)' }}>
              Saoko Studio
            </h1>
            <p className="text-sm mt-1 text-center" style={{ color: 'var(--muted-foreground)' }}>
              {needsPasswordSetup
                ? 'Crea tu contraseña de acceso'
                : mode === 'first'
                  ? 'Primer ingreso'
                  : 'Sistema Administrativo'}
            </p>
            <div className="w-10 h-0.5 mt-4 rounded-full" style={{ background: 'var(--gold)' }} />
          </CardHeader>

          <CardContent className="px-6 md:px-8 pb-8 pt-6">
            {needsPasswordSetup ? (
              <>
                <p className="text-sm mb-4 text-center" style={{ color: 'var(--muted-foreground)' }}>
                  Por seguridad, elige una contraseña que usarás de ahora en adelante.
                </p>
                <SetPasswordForm onSubmit={onForcedSetup} submitLabel="Continuar" />
              </>
            ) : mode === 'login' ? (
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="flex flex-col gap-4">
                {authError && (
                  <div
                    className="flex items-start gap-2.5 p-3 rounded-lg text-sm"
                    style={{
                      background: 'rgba(224,82,82,.1)',
                      border: '1px solid rgba(224,82,82,.3)',
                      color: '#e05252',
                    }}
                  >
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                <FormField
                  label="Correo electrónico o cédula"
                  error={loginForm.formState.errors.username?.message}
                >
                  <Input
                    placeholder="correo@saoko.com"
                    autoComplete="username"
                    style={{
                      background: 'var(--accent)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                    {...loginForm.register('username')}
                  />
                </FormField>

                <FormField label="Contraseña" error={loginForm.formState.errors.password?.message}>
                  <div className="relative">
                    <Input
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="pr-10"
                      style={{
                        background: 'var(--accent)',
                        borderColor: 'var(--border)',
                        color: 'var(--foreground)',
                      }}
                      {...loginForm.register('password')}
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

                <Button
                  type="submit"
                  disabled={loginForm.formState.isSubmitting}
                  className="w-full mt-2 h-12 font-semibold text-sm rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
                    color: '#000',
                    border: 'none',
                    opacity: loginForm.formState.isSubmitting ? 0.75 : 1,
                  }}
                >
                  {loginForm.formState.isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </Button>
              </form>
            ) : (
              <form onSubmit={firstForm.handleSubmit(onFirstAccess)} className="flex flex-col gap-4">
                {authError && (
                  <div
                    className="flex items-start gap-2.5 p-3 rounded-lg text-sm"
                    style={{
                      background: 'rgba(224,82,82,.1)',
                      border: '1px solid rgba(224,82,82,.3)',
                      color: '#e05252',
                    }}
                  >
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Confirma el correo y la cédula con los que te registraron, y crea tu contraseña.
                </p>

                <FormField label="Correo electrónico" error={firstForm.formState.errors.email?.message}>
                  <Input
                    type="email"
                    placeholder="correo@saoko.com"
                    autoComplete="email"
                    style={{
                      background: 'var(--accent)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                    {...firstForm.register('email')}
                  />
                </FormField>

                <FormField label="Cédula" error={firstForm.formState.errors.documentNumber?.message}>
                  <Input
                    placeholder="1007261234"
                    inputMode="numeric"
                    autoComplete="off"
                    style={{
                      background: 'var(--accent)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                    {...firstForm.register('documentNumber')}
                  />
                </FormField>

                <FormField
                  label="Crea tu contraseña"
                  error={firstForm.formState.errors.password?.message}
                  hint={NEW_PASSWORD_HINT}
                >
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
                      {...firstForm.register('password')}
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

                <FormField label="Confirmar contraseña" error={firstForm.formState.errors.confirmPassword?.message}>
                  <Input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    style={{
                      background: 'var(--accent)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                    {...firstForm.register('confirmPassword')}
                  />
                </FormField>

                <Button
                  type="submit"
                  disabled={firstForm.formState.isSubmitting}
                  className="w-full mt-2 h-12 font-semibold text-sm rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
                    color: '#000',
                    border: 'none',
                    opacity: firstForm.formState.isSubmitting ? 0.75 : 1,
                  }}
                >
                  {firstForm.formState.isSubmitting ? 'Guardando...' : 'Crear contraseña y entrar'}
                </Button>
              </form>
            )}

            {!needsPasswordSetup && (
              <>
                <Separator className="my-6" style={{ background: 'var(--border)' }} />
                <button
                  type="button"
                  onClick={() => {
                    setAuthError('')
                    setMode(m => (m === 'login' ? 'first' : 'login'))
                  }}
                  className="w-full text-center text-xs"
                  style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {mode === 'login' ? '¿Primer ingreso? Crea tu contraseña aquí' : 'Ya tengo contraseña'}
                </button>
              </>
            )}

            <p className="text-center text-xs mt-4" style={{ color: 'var(--muted-foreground)' }}>
              Acceso restringido · Solo personal autorizado
            </p>
          </CardContent>
        </Card>

        <p className="text-center mt-5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Saoko Estudio & Dance Company · Cali, Colombia
        </p>
      </div>
    </div>
  )
}
