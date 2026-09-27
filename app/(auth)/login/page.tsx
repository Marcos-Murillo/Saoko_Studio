'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { Input } from '@/components/ui/input'
import { SetPasswordForm } from '@/components/auth/SetPasswordForm'

const REMEMBER_KEY = 'saoko.login.username'

const loginSchema = z.object({
  username: z.string().min(1, 'Campo requerido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type LoginData = z.infer<typeof loginSchema>

const pillClass =
  'h-11 w-full rounded-full border bg-transparent px-5 text-center text-sm outline-none transition-[border-color,box-shadow] placeholder:text-[#a09070] focus-visible:border-[var(--gold)] focus-visible:ring-3 focus-visible:ring-[rgba(201,168,76,0.28)]'

const pillStyle = {
  borderColor: 'rgba(240, 234, 214, 0.28)',
  color: 'var(--foreground)',
  background: 'transparent',
} as const

function LoginArcs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            'radial-gradient(circle, rgba(201,168,76,0.16) 0%, rgba(160,120,48,0.05) 38%, transparent 68%)',
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="saokoArc" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0ead6" />
            <stop offset="32%" stopColor="#e8c97a" />
            <stop offset="68%" stopColor="#c9a84c" />
            <stop offset="100%" stopColor="#a07830" />
          </linearGradient>
          <filter id="saokoGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx="1880"
          cy="700"
          r="900"
          fill="none"
          stroke="#e8c97a"
          strokeWidth="42"
          opacity="0.34"
          filter="url(#saokoGlow)"
        />
        <circle
          cx="1880"
          cy="700"
          r="900"
          fill="none"
          stroke="url(#saokoArc)"
          strokeWidth="20"
        />
        <circle
          cx="1880"
          cy="700"
          r="830"
          fill="none"
          stroke="#e8c97a"
          strokeWidth="1.5"
          opacity="0.4"
        />

        <line
          x1="-60"
          y1="70"
          x2="760"
          y2="820"
          stroke="#c9a84c"
          strokeWidth="1.5"
          opacity="0.4"
        />

        <circle
          cx="260"
          cy="1560"
          r="760"
          fill="none"
          stroke="#e8c97a"
          strokeWidth="30"
          opacity="0.22"
          filter="url(#saokoGlow)"
        />
        <circle
          cx="260"
          cy="1560"
          r="760"
          fill="none"
          stroke="url(#saokoArc)"
          strokeWidth="14"
        />
      </svg>
    </div>
  )
}

function AuthError({ message }: { message: string }) {
  if (!message) return null
  return (
    <div
      className="flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm"
      style={{
        background: 'rgba(224,82,82,.12)',
        border: '1px solid rgba(224,82,82,.32)',
        color: '#e05252',
      }}
    >
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

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
      router.replace('/dashboard')
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
      router.replace('/dashboard')
    } catch {
      setAuthError('Usuario o contraseña incorrectos. Verifica tus datos.')
    }
  }

  const onForcedSetup = async (password: string) => {
    await completePasswordSetup(password)
    router.replace('/dashboard')
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

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="mt-1 h-11 w-full cursor-pointer rounded-full text-sm font-semibold transition-opacity"
              style={{
                background: 'linear-gradient(180deg, var(--gold-light), var(--gold))',
                color: '#0c0c0c',
                border: 'none',
                opacity: loginForm.formState.isSubmitting ? 0.75 : 1,
              }}
            >
              {loginForm.formState.isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        )}
      </div>
      </div>
    </div>
  )
}
