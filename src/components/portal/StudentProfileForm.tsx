'use client'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { compressLetterhead } from '@/lib/services/branding.service'
import type { StudentProfile } from '@/lib/services/portal.service'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const GENDERS = ['Femenino', 'Masculino']
const COMMUNES = Array.from({ length: 22 }, (_, index) => String(index + 1))

const inputClass = 'h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--accent)] px-4 text-sm text-[var(--foreground)] outline-none focus:border-[var(--gold)]'

export function StudentProfileForm({
  profile,
  onSave,
}: {
  profile: StudentProfile
  onSave: (input: StudentProfile) => Promise<void>
}) {
  const [form, setForm] = useState(profile)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => { setForm(profile) }, [profile])

  const set = (key: keyof StudentProfile, value: string) => {
    setSaved(false)
    setForm(current => ({ ...current, [key]: value }))
  }

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Elige una imagen JPG, PNG o WebP.')
      return
    }
    setUploading(true)
    setError('')
    setSaved(false)
    try {
      const url = await compressLetterhead(file, 220_000)
      setForm(current => ({ ...current, photoUrl: url }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo preparar la foto.')
    } finally {
      setUploading(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await onSave(form)
      setSaved(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar tu perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Foto</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(201,168,76,.35)] bg-[var(--accent)]">
            {form.photoUrl ? (
              <img src={form.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-[var(--gold)]">{form.fullName.charAt(0).toUpperCase() || 'N'}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex h-10 cursor-pointer items-center rounded-full px-4 text-sm font-semibold" style={{ background: 'var(--gold-muted)', color: 'var(--gold)' }}>
              {uploading ? 'Preparando foto…' : 'Subir foto'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading || saving}
                onChange={event => onPhoto(event.target.files?.[0])}
              />
            </label>
            {form.photoUrl && (
              <button
                type="button"
                className="text-left text-xs font-semibold text-[#e05252]"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setForm(current => ({ ...current, photoUrl: null }))}
              >
                Quitar foto
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Información personal</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nombre completo" className="md:col-span-2">
            <input className={inputClass} value={form.fullName} onChange={event => set('fullName', event.target.value)} required />
          </Field>
          <Field label="Cédula">
            <input className={`${inputClass} opacity-70`} value={form.documentNumber} readOnly />
          </Field>
          <Field label="Correo">
            <input className={`${inputClass} opacity-70`} value={form.email} readOnly />
          </Field>
          <Field label="Celular">
            <input className={inputClass} inputMode="tel" value={form.phone} onChange={event => set('phone', event.target.value)} required />
          </Field>
          <Field label="Fecha de nacimiento">
            <input className={inputClass} type="date" value={form.birthDate} onChange={event => set('birthDate', event.target.value)} />
          </Field>
          <Field label="Género">
            <select className={inputClass} value={form.gender} onChange={event => set('gender', event.target.value)}>
              <option value="">Sin especificar</option>
              {GENDERS.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Dirección</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Dirección" className="md:col-span-2">
            <input className={inputClass} value={form.address} onChange={event => set('address', event.target.value)} />
          </Field>
          <Field label="Ciudad">
            <input className={inputClass} value={form.city} onChange={event => set('city', event.target.value)} />
          </Field>
          <Field label="Barrio">
            <input className={inputClass} value={form.neighborhood} onChange={event => set('neighborhood', event.target.value)} />
          </Field>
          <Field label="Comuna">
            <select className={inputClass} value={form.commune} onChange={event => set('commune', event.target.value)}>
              <option value="">Sin especificar</option>
              {COMMUNES.map(item => <option key={item} value={item}>Comuna {item}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Datos médicos</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="EPS">
            <input className={inputClass} value={form.eps} onChange={event => set('eps', event.target.value)} />
          </Field>
          <Field label="Lugar de atención">
            <input className={inputClass} value={form.epsLocation} onChange={event => set('epsLocation', event.target.value)} />
          </Field>
          <Field label="Grupo sanguíneo">
            <select className={inputClass} value={form.bloodType} onChange={event => set('bloodType', event.target.value)}>
              <option value="">Sin especificar</option>
              {BLOOD_TYPES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {error && <p className="text-sm font-semibold text-[#e05252]">{error}</p>}
      {saved && <p className="text-sm font-semibold text-[#4caf7d]">Tu perfil quedó guardado.</p>}

      <button
        type="submit"
        disabled={saving || uploading}
        className="h-12 rounded-full text-sm font-semibold disabled:opacity-60"
        style={{ background: 'linear-gradient(180deg, var(--gold-light), var(--gold))', color: '#0c0c0c', border: 'none', cursor: 'pointer' }}
      >
        {saving ? 'Guardando…' : 'Guardar perfil'}
      </button>
    </form>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className || ''}`}>
      <span className="text-xs font-semibold text-[#a09070]">{label}</span>
      {children}
    </label>
  )
}
