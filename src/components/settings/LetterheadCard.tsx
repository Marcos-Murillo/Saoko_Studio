'use client'
import { useEffect, useState } from 'react'
import { ChevronDown, ImagePlus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/ui/file-upload'
import { useToast } from '@/components/shared/Toast'
import { compressLetterhead, getLetterhead, saveLetterhead } from '@/lib/services/branding.service'

export function LetterheadCard() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<string | null>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getLetterhead()
      .then(value => {
        setCurrent(value)
        setDraft(value)
      })
      .catch(() => toast('No se pudo cargar el membrete', 'error'))
      .finally(() => setLoading(false))
  }, [toast])

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('Elige una imagen PNG o JPG', 'error')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast('La imagen supera 8 MB', 'error')
      return
    }
    try {
      setDraft(await compressLetterhead(file))
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'No se pudo preparar la imagen', 'error')
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveLetterhead(draft)
      setCurrent(draft)
      toast(draft ? 'Membrete guardado' : 'Membrete quitado')
    } catch {
      toast('No se pudo guardar el membrete', 'error')
    } finally {
      setSaving(false)
    }
  }

  const dirty = draft !== current

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
            Imagen del encabezado en los reportes
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
              <FileUpload onChange={files => { void onFile(files[0]) }} previewUrl={draft} />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!dirty || saving}
                  onClick={() => void save()}
                  style={{
                    background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
                    color: '#000',
                    border: 'none',
                    opacity: !dirty || saving ? 0.6 : 1,
                  }}
                >
                  {saving ? 'Guardando...' : draft ? 'Guardar membrete' : 'Quitar membrete'}
                </Button>
                {draft && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => setDraft(null)}
                    style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                  >
                    Quitar
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
