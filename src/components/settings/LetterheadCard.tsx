'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ImagePlus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/shared/Toast'
import {
  compressLetterhead,
  getLetterheadParts,
  saveLetterheadParts,
  type LetterheadParts,
} from '@/lib/services/branding.service'

const EMPTY: LetterheadParts = { header: null, center: null, footer: null }
const PART_MAX = 280_000

const SLOTS: { key: keyof LetterheadParts; label: string; hint: string }[] = [
  { key: 'header', label: 'Cabecera', hint: 'Arriba de la hoja' },
  { key: 'center', label: 'Centro', hint: 'Logo en la mitad' },
  { key: 'footer', label: 'Pie', hint: 'Abajo de la hoja' },
]

export function LetterheadCard() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<LetterheadParts>(EMPTY)
  const [draft, setDraft] = useState<LetterheadParts>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<keyof LetterheadParts | null>(null)
  const inputs = useRef<Partial<Record<keyof LetterheadParts, HTMLInputElement | null>>>({})

  useEffect(() => {
    getLetterheadParts()
      .then(value => {
        setCurrent(value)
        setDraft(value)
      })
      .catch(() => toast('No se pudo cargar el membrete', 'error'))
      .finally(() => setLoading(false))
  }, [toast])

  const onFile = async (key: keyof LetterheadParts, file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('Elige una imagen PNG o JPG', 'error')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast('La imagen supera 8 MB', 'error')
      return
    }
    setBusy(key)
    try {
      const dataUrl = await compressLetterhead(file, PART_MAX)
      setDraft(prev => ({ ...prev, [key]: dataUrl }))
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'No se pudo preparar la imagen', 'error')
    } finally {
      setBusy(null)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveLetterheadParts(draft)
      setCurrent(draft)
      toast('Membrete guardado')
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'No se pudo guardar el membrete', 'error')
    } finally {
      setSaving(false)
    }
  }

  const dirty = draft.header !== current.header || draft.center !== current.center || draft.footer !== current.footer
  const ready = SLOTS.filter(slot => current[slot.key]).map(slot => slot.label)

  return (
    <Card
      className={open ? 'sm:col-span-2 lg:col-span-3' : undefined}
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full cursor-pointer items-start gap-4 p-5 text-left"
        style={{ background: 'none', border: 'none', color: 'inherit' }}
        aria-expanded={open}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(201,168,76,.12)' }}
        >
          <ImagePlus size={18} style={{ color: 'var(--gold)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Membrete del PDF</p>
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
            {ready.length ? ready.join(' · ') : 'Cabecera, logo central y pie de página'}
          </p>
        </div>
        <ChevronDown
          size={16}
          className="mt-1 shrink-0 transition-transform"
          style={{
            color: 'var(--muted-foreground)',
            transform: open ? 'rotate(180deg)' : undefined,
          }}
        />
      </button>

      {open && (
        <CardContent className="flex flex-col gap-4 px-5 pt-0 pb-5">
          {loading ? (
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Cargando membrete...</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {SLOTS.map(slot => {
                  const value = draft[slot.key]
                  return (
                    <div key={slot.key} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{slot.label}</p>
                        <p className="text-[0.65rem]" style={{ color: 'var(--muted-foreground)' }}>{slot.hint}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => inputs.current[slot.key]?.click()}
                        className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl"
                        style={{
                          background: 'var(--accent)',
                          border: '1px dashed var(--border)',
                          cursor: 'pointer',
                          padding: 8,
                        }}
                      >
                        {value ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={value} alt={slot.label} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            {busy === slot.key ? 'Preparando...' : 'Elegir imagen'}
                          </span>
                        )}
                      </button>
                      <input
                        ref={node => { inputs.current[slot.key] = node }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          void onFile(slot.key, e.target.files?.[0])
                          e.target.value = ''
                        }}
                      />
                      {value && (
                        <button
                          type="button"
                          className="self-start text-[0.68rem]"
                          style={{ color: '#e05252', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={() => setDraft(prev => ({ ...prev, [slot.key]: null }))}
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={!dirty || saving || busy !== null}
                  onClick={() => void save()}
                  style={{
                    background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
                    color: '#000',
                    border: 'none',
                    opacity: !dirty || saving || busy !== null ? 0.6 : 1,
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar membrete'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
