'use client'
import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { homeForRole } from '@/lib/auth/roles'
import { NEW_PASSWORD_HINT } from '@/lib/auth/identity'
import { Input } from '@/components/ui/input'
import { AuthError, AuthPrimaryButton, LoginArcs, pillClass, pillStyle } from '@/components/auth/AuthBackdrop'
import { PROFILE_FIELDS, type ProfileFieldKey } from '@/lib/services/dancerClaim.service'
import { lookupRegistration, registerClaimedDancer, registerNewStudent } from '@/lib/services/registration.service'

type Phase =
  | { name: 'identify' }
  | { name: 'claim'; fullName: string; dancerId: string; missing: ProfileFieldKey[] }
  | { name: 'new' }
  | { name: 'notice'; title: string; body: string }

const GENDERS = ['Femenino', 'Masculino']

export default function RegisterPage() {
  const router = useRouter()
  const { user, adminUser, loading, reloadProfile } = useAuth()
  const [phase, setPhase] = useState<Phase>({ name: 'identify' })
  const [email, setEmail] = useState('')
  const [cedula, setCedula] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [fields, setFields] = useState<Partial<Record<ProfileFieldKey, string>>>({})
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (loading || !user || !adminUser || adminUser.mustSetPassword) return
    router.replace(homeForRole(adminUser.role))
  }, [user, adminUser, loading, router])

  const passwordsMatch = () => {
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return false
    }
    return true
  }

  const onIdentify = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await lookupRegistration(email, cedula)
      if (result.kind === 'claim') {
        setPhase({ name: 'claim', fullName: result.fullName, dancerId: result.dancerId, missing: result.missing })
      } else if (result.kind === 'new') {
        setPhase({ name: 'new' })
      } else if (result.kind === 'claimed') {
        setPhase({
          name: 'notice',
          title: 'Ya tienes cuenta',
          body: `${result.fullName.split(' ')[0]}, tu acceso ya está activo. Entra con tu correo o tu cédula y la contraseña que creaste.`,
        })
      } else if (result.kind === 'inactive') {
        setPhase({
          name: 'notice',
          title: 'Ficha inactiva',
          body: `${result.fullName.split(' ')[0]}, tu ficha está inactiva. Habla con el estudio para reactivarla.`,
        })
      } else if (result.kind === 'no-email') {
        setPhase({
          name: 'notice',
          title: 'Falta tu correo en la ficha',
          body: 'Encontramos tu cédula, pero el estudio todavía no tiene un correo guardado. Pídeles que lo agreguen y vuelve a intentarlo.',
        })
      } else {
        setPhase({
          name: 'notice',
          title: 'Esos datos no coinciden',
          body: 'El correo no es el que está guardado con esa cédula. Revisa ambos o pídele al estudio que actualice tu ficha.',
        })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos buscar tu ficha.')
    } finally {
      setBusy(false)
    }
  }

  const onClaim = async (event: FormEvent) => {
    event.preventDefault()
    if (phase.name !== 'claim' || !passwordsMatch()) return
    setError('')
    setBusy(true)
    try {
      await registerClaimedDancer({
        email,
        documentNumber: cedula,
        password,
        dancerId: phase.dancerId,
        fullName: phase.fullName,
        missing: phase.missing,
        fields,
      })
      await reloadProfile()
      router.replace('/mi-espacio')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo activar tu cuenta.')
    } finally {
      setBusy(false)
    }
  }

  const onCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!passwordsMatch()) return
    setError('')
    setBusy(true)
    try {
      await registerNewStudent({
        fullName,
        email,
        documentNumber: cedula,
        phone,
        birthDate,
        address,
        city,
        password,
      })
      await reloadProfile()
      router.replace('/mi-espacio')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear tu cuenta.')
    } finally {
      setBusy(false)
    }
  }

  const title = phase.name === 'claim'
    ? 'Completa tu acceso'
    : phase.name === 'new'
      ? 'Cuenta de estudiante'
      : phase.name === 'notice'
        ? phase.title
        : 'Crear cuenta'

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden px-5 py-8" style={{ background: 'var(--background)' }}>
      <LoginArcs />
      <div className="relative z-10 mx-auto my-auto flex w-full max-w-[420px] flex-col items-center">
        <img
          src="/LOGOS/LOGO%20COMPLETO-SIN%20FONDO.png"
          alt="Nexora"
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
          <h1 className="mb-2 text-center text-[1.65rem] font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            {title}
          </h1>

          {phase.name === 'identify' && (
            <form onSubmit={onIdentify} className="mt-5 flex flex-col gap-4">
              <p className="text-center text-sm" style={{ color: '#a09070' }}>
                Entras como estudiante. Si ya estás en el estudio, usa el correo y la cédula de tu ficha: solo completas lo que falte y creas tu contraseña.
              </p>
              <AuthError message={error} />
              <Input aria-label="Correo electrónico" type="email" placeholder="Correo" autoComplete="email" className={pillClass} style={pillStyle} value={email} onChange={e => setEmail(e.target.value)} />
              <Input aria-label="Cédula" inputMode="numeric" placeholder="Cédula" autoComplete="off" className={pillClass} style={pillStyle} value={cedula} onChange={e => setCedula(e.target.value)} />
              <AuthPrimaryButton disabled={busy}>{busy ? 'Buscando...' : 'Continuar'}</AuthPrimaryButton>
            </form>
          )}

          {phase.name === 'claim' && (
            <form onSubmit={onClaim} className="mt-5 flex flex-col gap-4">
              <p className="text-center text-sm" style={{ color: '#a09070' }}>
                Hola, {phase.fullName.split(' ')[0]}. Tu ficha ya está en el estudio.
                {phase.missing.length > 0 ? ' Completa lo que falta y crea tu contraseña.' : ' Crea la contraseña con la que vas a entrar.'}
              </p>
              <AuthError message={error} />
              {phase.missing.map((key) => {
                const field = PROFILE_FIELDS.find(item => item.key === key)
                if (!field) return null
                if (field.input === 'select') {
                  return (
                    <select
                      key={key}
                      aria-label={field.label}
                      value={fields[key] || ''}
                      onChange={e => setFields(current => ({ ...current, [key]: e.target.value }))}
                      className={pillClass}
                      style={pillStyle}
                    >
                      <option value="">{field.label}</option>
                      {GENDERS.map(gender => <option key={gender} value={gender}>{gender}</option>)}
                    </select>
                  )
                }
                return (
                  <Input
                    key={key}
                    aria-label={field.label}
                    type={field.input === 'date' ? 'date' : field.input === 'tel' ? 'tel' : 'text'}
                    placeholder={field.label}
                    className={pillClass}
                    style={pillStyle}
                    value={fields[key] || ''}
                    onChange={e => setFields(current => ({ ...current, [key]: e.target.value }))}
                  />
                )
              })}
              <PasswordFields
                password={password}
                confirm={confirm}
                showPass={showPass}
                onPassword={setPassword}
                onConfirm={setConfirm}
                onToggle={() => setShowPass(value => !value)}
              />
              <AuthPrimaryButton disabled={busy}>{busy ? 'Guardando...' : 'Entrar a mi espacio'}</AuthPrimaryButton>
            </form>
          )}

          {phase.name === 'new' && (
            <form onSubmit={onCreate} className="mt-5 flex flex-col gap-4">
              <p className="text-center text-sm" style={{ color: '#a09070' }}>
                Esa cédula todavía no está lista para crear contraseña. Si ya entrenas aquí, un administrador debe entrar al panel y recargar la página; después vuelve con el mismo correo de tu ficha. Si eres nuevo, crea tu cuenta de estudiante.
              </p>
              <AuthError message={error} />
              <Input aria-label="Nombre completo" placeholder="Nombre completo" autoComplete="name" className={pillClass} style={pillStyle} value={fullName} onChange={e => setFullName(e.target.value)} />
              <Input aria-label="Celular" type="tel" placeholder="Celular" autoComplete="tel" className={pillClass} style={pillStyle} value={phone} onChange={e => setPhone(e.target.value)} />
              <Input aria-label="Fecha de nacimiento" type="date" className={pillClass} style={pillStyle} value={birthDate} onChange={e => setBirthDate(e.target.value)} />
              <Input aria-label="Dirección" placeholder="Dirección (opcional)" className={pillClass} style={pillStyle} value={address} onChange={e => setAddress(e.target.value)} />
              <Input aria-label="Ciudad" placeholder="Ciudad (opcional)" className={pillClass} style={pillStyle} value={city} onChange={e => setCity(e.target.value)} />
              <PasswordFields
                password={password}
                confirm={confirm}
                showPass={showPass}
                onPassword={setPassword}
                onConfirm={setConfirm}
                onToggle={() => setShowPass(value => !value)}
              />
              <AuthPrimaryButton disabled={busy}>{busy ? 'Creando cuenta...' : 'Crear cuenta'}</AuthPrimaryButton>
            </form>
          )}

          {phase.name === 'notice' && (
            <div className="mt-5 flex flex-col gap-4">
              <p className="text-center text-sm" style={{ color: '#a09070' }}>{phase.body}</p>
              <Link
                href="/login"
                className="inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold"
                style={{ background: 'linear-gradient(180deg, var(--gold-light), var(--gold))', color: '#0c0c0c' }}
              >
                Ir a iniciar sesión
              </Link>
            </div>
          )}

          {phase.name !== 'identify' && (
            <button
              type="button"
              onClick={() => { setPhase({ name: 'identify' }); setError('') }}
              className="mt-4 w-full text-center text-xs"
              style={{ color: '#a09070', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Usar otro correo o cédula
            </button>
          )}

          <Link
            href={phase.name === 'notice' ? '/' : '/login'}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ color: 'var(--foreground)', border: '1px solid rgba(240, 234, 214, 0.28)' }}
          >
            <ArrowLeft size={15} />
            {phase.name === 'notice' ? 'Volver al inicio' : 'Ya tengo contraseña'}
          </Link>
          {(phase.name === 'claim' || phase.name === 'new') && (
            <p className="mt-3 text-center text-[11px]" style={{ color: '#6d5e48' }}>{NEW_PASSWORD_HINT}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function PasswordFields({
  password, confirm, showPass, onPassword, onConfirm, onToggle,
}: {
  password: string
  confirm: string
  showPass: boolean
  onPassword: (value: string) => void
  onConfirm: (value: string) => void
  onToggle: () => void
}) {
  return (
    <>
      <div className="relative">
        <Input
          aria-label="Contraseña"
          type={showPass ? 'text' : 'password'}
          placeholder="Contraseña"
          autoComplete="new-password"
          className={`${pillClass} pr-11`}
          style={pillStyle}
          value={password}
          onChange={e => onPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute top-1/2 right-4 -translate-y-1/2"
          style={{ color: '#a09070', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <Input
        aria-label="Confirmar contraseña"
        type={showPass ? 'text' : 'password'}
        placeholder="Confirmar contraseña"
        autoComplete="new-password"
        className={pillClass}
        style={pillStyle}
        value={confirm}
        onChange={e => onConfirm(e.target.value)}
      />
    </>
  )
}
