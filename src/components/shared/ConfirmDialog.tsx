'use client'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, title, description,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'default', loading, onConfirm, onCancel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel() }}>
      <DialogContent
        showCloseButton={false}
        style={{ background: 'var(--popover)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--foreground)' }}>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
          {description}
        </p>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}
            style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            variant={variant === 'danger' ? 'destructive' : 'default'}
            style={variant !== 'danger' ? {
              background: 'linear-gradient(135deg,var(--gold-dark),var(--gold))',
              color: '#000', border: 'none',
            } : undefined}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
