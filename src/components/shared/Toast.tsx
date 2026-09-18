'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; type: ToastType }
interface ToastCtx { toast: (msg: string, type?: ToastType) => void }
const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now()
    setItems(p => [...p, { id, message, type }])
    setTimeout(() => setItems(p => p.filter(t => t.id !== id)), 4000)
  }, [])

  const remove = (id: number) => setItems(p => p.filter(t => t.id !== id))

  const styles: Record<ToastType, { color: string; Icon: typeof CheckCircle }> = {
    success: { color: '#4caf7d', Icon: CheckCircle },
    error:   { color: '#e05252', Icon: XCircle },
    info:    { color: '#4a90d9', Icon: Info },
  }

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-[200]">
        {items.map(t => {
          const { color, Icon } = styles[t.type]
          return (
            <div key={t.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl min-w-[280px] max-w-[360px]"
              style={{
                background: 'var(--popover)',
                border: `1px solid ${color}35`,
                animation: 'slideUp .2s ease',
              }}>
              <Icon size={16} style={{ color, flexShrink: 0 }} />
              <p className="flex-1 text-sm" style={{ color: 'var(--foreground)' }}>{t.message}</p>
              <Button variant="ghost" size="icon-xs" onClick={() => remove(t.id)}
                style={{ color: 'var(--muted-foreground)', flexShrink: 0 }}>
                <X size={12} />
              </Button>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx.toast
}
