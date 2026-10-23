'use client'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, CalendarIcon, ChevronDown, Eye, EyeOff } from 'lucide-react'
import type { DropdownProps } from 'react-day-picker'
import { useAuth } from '@/lib/auth/AuthContext'
import { homeForRole } from '@/lib/auth/roles'
import { NEW_PASSWORD_HINT } from '@/lib/auth/identity'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AuthError, AuthPrimaryButton, LoginArcs, pillClass, pillStyle } from '@/components/auth/AuthBackdrop'
import { PROFILE_FIELDS, type ProfileFieldKey } from '@/lib/services/dancerClaim.service'
import { lookupRegistration, registerClaimedDancer, registerNewStudent, type StudentGuardianInput } from '@/lib/services/registration.service'
import { getGroups } from '@/lib/services/group.service'
import { isUnderage } from '@/lib/utils/dates'
import { parseLocalDateInput } from '@/lib/utils/localDate'
import { formatCurrency } from '@/lib/utils/currency'
import { GroupEnrollMenu } from '@/components/groups/GroupEnrollMenu'
import type { Group } from '@/types'

type Phase =
  | { name: 'identify' }
  | { name: 'claim'; fullName: string; dancerId: string; missing: ProfileFieldKey[]; minor: boolean }
  | { name: 'new' }
  | { name: 'notice'; title: string; body: string }

const GENDERS = ['Femenino', 'Masculino']
const RELATIONS = ['Madre', 'Padre', 'Abuelo/a', 'Tío/a', 'Hermano/a', 'Tutor legal', 'Otro']

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
  const [groups, setGroups] = useState<Group[]>([])
  const [groupIds, setGroupIds] = useState<string[]>([])
  const [groupsReady, setGroupsReady] = useState(false)
  const [groupsError, setGroupsError] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianRelation, setGuardianRelation] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [guardianDoc, setGuardianDoc] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getGroups(true)
      .then(list => setGroups(list))
      .catch(() => setGroupsError('No pudimos cargar los grupos. Recarga la página.'))
      .finally(() => setGroupsReady(true))
  }, [])

  useEffect(() => {
    if (loading || !user || !adminUser || adminUser.mustSetPassword) return
    router.replace(homeForRole(adminUser.role))
  }, [user, adminUser, loading, router])

  const toggleGroup = (id: string) => {
    setGroupIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  const minorFromClaim = phase.name === 'claim'
    && (fields.birthDate ? isUnderage(fields.birthDate) : !phase.missing.includes('birthDate') && phase.minor)
  const needsGuardian = phase.name === 'new' ? isUnderage(birthDate) : minorFromClaim

  const guardianInput = (): StudentGuardianInput | null => {
    if (!needsGuardian) return null
    return {
      fullName: guardianName,
      relationship: guardianRelation,
      phone: guardianPhone,
      documentNumber: guardianDoc,
    }
  }

  const readyForAccount = () => {
    if (!passwordsMatch()) return false
    if (groupIds.length === 0) {
      setError('Elige al menos un grupo.')
      return false
    }
    if (needsGuardian) {
      if (guardianName.trim().length < 3 || !guardianRelation || guardianPhone.replace(/\D/g, '').length < 7) {
        setError('Como eres menor de edad, completa el nombre, el parentesco y el celular del acudiente.')
        return false
      }
    }
    return true
  }

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
        setPhase({ name: 'claim', fullName: result.fullName, dancerId: result.dancerId, missing: result.missing, minor: result.minor })
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
    if (phase.name !== 'claim' || !readyForAccount()) return
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
        groupIds,
        guardian: guardianInput(),
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
    if (!readyForAccount()) return
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
        groupIds,
        guardian: guardianInput(),
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
                {phase.missing.length > 0 ? ' Completa lo que falta, elige tus grupos y crea tu contraseña.' : ' Elige tus grupos y crea la contraseña con la que vas a entrar.'}
              </p>
              <AuthError message={error} />
              {phase.missing.map((key) => {
                const field = PROFILE_FIELDS.find(item => item.key === key)
                if (!field) return null
                if (field.input === 'select') {
                  return (
                    <AuthMenu
                      key={key}
                      label={field.label}
                      value={fields[key] || ''}
                      options={GENDERS}
                      onChange={value => setFields(current => ({ ...current, [key]: value }))}
                    />
                  )
                }
                if (field.input === 'date') {
                  return (
                    <AuthDateField
                      key={key}
                      label={field.label}
                      value={fields[key] || ''}
                      onChange={value => setFields(current => ({ ...current, [key]: value }))}
                    />
                  )
                }
                return (
                  <Input
                    key={key}
                    aria-label={field.label}
                    type={field.input === 'tel' ? 'tel' : 'text'}
                    placeholder={field.label}
                    className={pillClass}
                    style={pillStyle}
                    value={fields[key] || ''}
                    onChange={e => setFields(current => ({ ...current, [key]: e.target.value }))}
                  />
                )
              })}
              <GroupChoices groups={groups} ready={groupsReady} selected={groupIds} error={groupsError} onToggle={toggleGroup} />
              {needsGuardian && (
                <GuardianFields
                  name={guardianName}
                  relation={guardianRelation}
                  phone={guardianPhone}
                  documentNumber={guardianDoc}
                  onName={setGuardianName}
                  onRelation={setGuardianRelation}
                  onPhone={setGuardianPhone}
                  onDocument={setGuardianDoc}
                />
              )}
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
                Si eres nuevo, elige el grupo o los grupos y crea tu cuenta. Si ya entrenas aquí y tu ficha no aparece, un administrador debe entrar al panel y recargar la página; después vuelve con el mismo correo.
              </p>
              <AuthError message={error} />
              <Input aria-label="Nombre completo" placeholder="Nombre completo" autoComplete="name" className={pillClass} style={pillStyle} value={fullName} onChange={e => setFullName(e.target.value)} />
              <Input aria-label="Celular" type="tel" placeholder="Celular" autoComplete="tel" className={pillClass} style={pillStyle} value={phone} onChange={e => setPhone(e.target.value)} />
              <AuthDateField label="Fecha de nacimiento" value={birthDate} onChange={setBirthDate} />
              <Input aria-label="Dirección" placeholder="Dirección (opcional)" className={pillClass} style={pillStyle} value={address} onChange={e => setAddress(e.target.value)} />
              <Input aria-label="Ciudad" placeholder="Ciudad (opcional)" className={pillClass} style={pillStyle} value={city} onChange={e => setCity(e.target.value)} />
              <GroupChoices groups={groups} ready={groupsReady} selected={groupIds} error={groupsError} onToggle={toggleGroup} />
              {needsGuardian && (
                <GuardianFields
                  name={guardianName}
                  relation={guardianRelation}
                  phone={guardianPhone}
                  documentNumber={guardianDoc}
                  onName={setGuardianName}
                  onRelation={setGuardianRelation}
                  onPhone={setGuardianPhone}
                  onDocument={setGuardianDoc}
                />
              )}
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

function GroupChoices({
  groups, ready, selected, error, onToggle,
}: {
  groups: Group[]
  ready: boolean
  selected: string[]
  error: string
  onToggle: (id: string) => void
}) {
  return (
    <GroupEnrollMenu
      title={<p className="text-center text-xs font-semibold" style={{ color: 'var(--foreground)' }}>¿A qué grupo o grupos quieres inscribirte?</p>}
      groups={groups.map(group => ({ id: group.id, name: group.name, feeLabel: formatCurrency(group.monthlyFee) }))}
      selected={selected}
      onToggle={onToggle}
      error={error}
      loading={!ready}
      emptyText="No hay grupos activos."
    />
  )
}

function GuardianFields({
  name, relation, phone, documentNumber, onName, onRelation, onPhone, onDocument,
}: {
  name: string
  relation: string
  phone: string
  documentNumber: string
  onName: (value: string) => void
  onRelation: (value: string) => void
  onPhone: (value: string) => void
  onDocument: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-xs" style={{ color: '#a09070' }}>
        Eres menor de edad. Necesitamos los datos de tu acudiente.
      </p>
      <Input aria-label="Nombre del acudiente" placeholder="Nombre del acudiente" className={pillClass} style={pillStyle} value={name} onChange={e => onName(e.target.value)} />
      <AuthMenu label="Parentesco" value={relation} options={RELATIONS} onChange={onRelation} />
      <Input aria-label="Celular del acudiente" type="tel" placeholder="Celular del acudiente" className={pillClass} style={pillStyle} value={phone} onChange={e => onPhone(e.target.value)} />
      <Input aria-label="Documento del acudiente" placeholder="Documento del acudiente (opcional)" className={pillClass} style={pillStyle} value={documentNumber} onChange={e => onDocument(e.target.value)} />
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

const menuPopupStyle = {
  background: '#161616',
  border: '1px solid rgba(240, 234, 214, 0.28)',
  boxShadow: '0 18px 50px rgba(0, 0, 0, 0.5)',
  color: 'var(--foreground)',
} as const

function AuthMenu({
  label, value, options, onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <Select value={value || null} onValueChange={next => onChange(next ?? '')}>
      <SelectTrigger
        aria-label={label}
        className={`${pillClass} w-full justify-center data-placeholder:text-[#a09070] [&_svg]:text-[#a09070]`}
        style={{ ...pillStyle, height: '2.75rem', borderRadius: '9999px' }}
      >
        <SelectValue placeholder={label} className="justify-center text-center" />
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger
        className="z-[80] rounded-2xl p-1.5 ring-0"
        style={menuPopupStyle}
      >
        {options.map(option => (
          <SelectItem
            key={option}
            value={option}
            className="justify-center rounded-full py-2 pr-3 pl-3 text-center data-highlighted:bg-[rgba(201,168,76,0.18)] data-selected:text-[var(--gold-light)] [&>div]:w-full [&>div]:justify-center"
          >
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function toIso(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function AuthDateField({
  label, value, onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = parseLocalDateInput(value) ?? undefined
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        className={`${pillClass} flex items-center`}
        style={{ ...pillStyle, color: selected ? 'var(--foreground)' : '#a09070' }}
      >
        <span className="min-w-0 flex-1 truncate px-5 text-center">
          {selected ? format(selected, 'dd/MM/yyyy', { locale: es }) : label}
        </span>
        <CalendarIcon size={16} className="shrink-0" style={{ color: '#a09070' }} />
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-auto rounded-2xl p-3 ring-0"
        style={menuPopupStyle}
      >
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? new Date(2010, 0)}
          onSelect={date => {
            if (!date) return
            onChange(toIso(date))
            setOpen(false)
          }}
          locale={es}
          captionLayout="dropdown"
          startMonth={new Date(1920, 0)}
          endMonth={new Date()}
          components={{ Dropdown: CalendarMenu }}
        />
      </PopoverContent>
    </Popover>
  )
}

function CalendarMenu({ options, value, onChange, disabled, 'aria-label': ariaLabel }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const selected = options?.find(option => String(option.value) === String(value))

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (!open) return
    root.current?.querySelector<HTMLElement>('[data-current="true"]')?.scrollIntoView({ block: 'center' })
  }, [open])

  const choose = (next: string) => {
    const event = { target: { value: next } } as ChangeEvent<HTMLSelectElement>
    onChange?.(event)
    setOpen(false)
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm"
        style={{ color: 'var(--foreground)', border: '1px solid rgba(240, 234, 214, 0.28)', background: 'transparent' }}
      >
        {selected?.label}
        <ChevronDown size={14} style={{ color: '#a09070' }} />
      </button>
      {open && (
        <div
          className="absolute top-full left-1/2 z-50 mt-1 max-h-48 w-40 -translate-x-1/2 overflow-y-auto rounded-2xl p-1"
          style={{
            backgroundColor: '#101010',
            border: '1px solid rgba(240, 234, 214, 0.45)',
            boxShadow: '0 18px 40px rgba(0, 0, 0, 0.9)',
            color: '#f0ead6',
          }}
        >
          {options?.map(option => {
            const current = String(option.value) === String(value)
            return (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                data-current={current ? 'true' : undefined}
                onClick={() => choose(String(option.value))}
                className="block w-full rounded-full px-2 py-1.5 text-sm disabled:opacity-40"
                style={{
                  color: current ? '#0c0c0c' : '#f0ead6',
                  background: current ? 'linear-gradient(180deg, var(--gold-light), var(--gold))' : '#101010',
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
