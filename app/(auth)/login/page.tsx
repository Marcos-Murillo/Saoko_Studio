'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { homeForRole } from '@/lib/auth/roles'
import { Input } from '@/components/ui/input'
import { SetPasswordForm } from '@/components/auth/SetPasswordForm'
import { AuthError, AuthPrimaryButton, LoginArcs, pillClass, pillStyle } from '@/components/auth/AuthBackdrop'

const REMEMBER_KEY = 'saoko.login.username'

const loginSchema = z.object({
  username: z.string().min(1, 'Campo requerido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type LoginData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { signIn, completePasswordSetup, adminUser, user, loading } = useAuth()
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [authError, setAuthError] = useState('')
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false)
  const [remember, setRemember] = useState(false)

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema) as any,
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY)
      if (saved) {
        loginForm.setValue('username', saved)
        setRemember(true)
      }
    } catch {
      // Storage can be blocked; login still works.
    }
  }, [loginForm])

  useEffect(() => {
    if (loading) return
    if (user && adminUser?.mustSetPassword) {
      setNeedsPasswordSetup(true)
      return
    }
    if (user && adminUser && !adminUser.mustSetPassword) {
      router.replace(homeForRole(adminUser.role))
    }
  }, [user, adminUser, loading, router])

  const onLogin = async (data: LoginData) => {
    setAuthError('')
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, data.username.trim())
      else localStorage.removeItem(REMEMBER_KEY)
    } catch {
      // Ignore storage failures.
    }
    try {
      const result = await signIn(data.username, data.password)
      if (result.mustSetPassword) {
        setNeedsPasswordSetup(true)
        return
      }
      router.replace(homeForRole(result.role))
    } catch {
      setAuthError('Usuario o contraseña incorrectos. Verifica tus datos.')
    }
  }

  const onForcedSetup = async (password: string) => {
    await completePasswordSetup(password)
    router.replace(homeForRole(adminUser?.role))
  }

  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-x-hidden px-5 py-8"
      style={{ background: 'var(--background)' }}
    >
      <LoginArcs />

      <div className="relative z-10 mx-auto my-auto flex w-full max-w-[380px] flex-col items-center">
        <img
          src="/LOGOS/LOGO%20COMPLETO-SIN%20FONDO.png"
          alt="Nexora. La gestión de tu academia."
          className="mb-8 w-[min(220px,70vw)]"
        />
      <div
        className="w-full rounded-[18px] px-7 py-8"
        style={{
          background: 'rgba(12, 12, 12, 0.34)',
          border: '1px solid rgba(240, 234, 214, 0.28)',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.38)',
          backdropFilter: 'blur(18px) saturate(1.25)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.25)',
        }}
      >
        <h1
          className="mb-7 text-center text-[1.65rem] font-bold tracking-tight"
          style={{ color: 'var(--foreground)' }}
        >
          {needsPasswordSetup ? 'Nueva contraseña' : 'Login'}
        </h1>

        {needsPasswordSetup ? (
          <div className="flex flex-col gap-4">
            <p className="text-center text-sm" style={{ color: '#a09070' }}>
              Por seguridad, elige una contraseña que usarás de ahora en adelante.
            </p>
            <SetPasswordForm onSubmit={onForcedSetup} submitLabel="Continuar" />
          </div>
        ) : (
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="flex flex-col gap-4">
            <AuthError message={authError} />

            <div>
              <Input
                aria-label="Correo electrónico o cédula"
                placeholder="Usuario"
                autoComplete="username"
                className={pillClass}
                style={pillStyle}
                {...loginForm.register('username')}
              />
              {loginForm.formState.errors.username?.message && (
                <p className="mt-1.5 text-center text-xs" style={{ color: 'var(--destructive)' }}>
                  {loginForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div>
              <div className="relative">
                <Input
                  aria-label="Contraseña"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  className={`${pillClass} pr-11`}
                  style={pillStyle}
                  {...loginForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute top-1/2 right-4 -translate-y-1/2"
                  style={{ color: '#a09070', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {loginForm.formState.errors.password?.message && (
                <p className="mt-1.5 text-center text-xs" style={{ color: 'var(--destructive)' }}>
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-2 px-1 text-xs" style={{ color: 'rgba(240,234,214,0.78)' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="size-3.5 rounded-sm"
                style={{ accentColor: '#c9a84c' }}
              />
              Recordarme
            </label>

            <AuthPrimaryButton disabled={loginForm.formState.isSubmitting}>
              {loginForm.formState.isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </AuthPrimaryButton>
            <p className="text-center text-sm" style={{ color: '#a09070' }}>
              ¿Aún no tienes contraseña?{' '}
              <Link href="/registro" style={{ color: 'var(--gold-light)', fontWeight: 600 }}>
                Crear cuenta
              </Link>
            </p>
          </form>
        )}

        <Link
          href="/"
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
          style={{
            color: 'var(--foreground)',
            border: '1px solid rgba(240, 234, 214, 0.28)',
            background: 'transparent',
          }}
        >
          <ArrowLeft size={15} />
          Volver al inicio
        </Link>
      </div>
      </div>
    </div>
  )
}
