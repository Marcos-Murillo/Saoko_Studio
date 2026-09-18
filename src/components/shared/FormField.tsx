import { Label } from '@/components/ui/label'
import { cn } from 'cn'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  hint?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ label, error, required, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', fontWeight: 500 }}>
        {label}
        {required && <span style={{ color: 'var(--gold)', marginLeft: 3 }}>*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium" style={{ color: 'var(--destructive)' }}>{error}</p>
      )}
    </div>
  )
}
