'use client'
/**
 * Combobox con búsqueda. El valor del formulario sigue siendo el id,
 * pero el input siempre muestra el `label` (nombre).
 */
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox'

export interface ComboboxOption {
  value: string
  label: string
  description?: string
}

interface Props {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function SaokoCombobox({
  options,
  value,
  onValueChange,
  placeholder = 'Seleccionar...',
  disabled,
}: Props) {
  const selected = options.find(o => o.value === value) ?? null

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(item: ComboboxOption | null) => onValueChange?.(item?.value ?? '')}
      itemToStringLabel={(item: ComboboxOption | null) => item?.label ?? ''}
      isItemEqualToValue={(a: ComboboxOption, b: ComboboxOption) => a?.value === b?.value}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder={placeholder}
        showClear={!!value}
        style={{
          background:  'var(--accent)',
          borderColor: 'var(--border)',
          color:       'var(--foreground)',
          width:       '100%',
        }}
      />
      <ComboboxContent
        style={{
          background: 'var(--popover)',
          border:     '1px solid var(--border)',
          zIndex:     80,
        }}
      >
        <ComboboxList>
          <ComboboxEmpty>Sin resultados</ComboboxEmpty>
          {options.map(opt => (
            <ComboboxItem
              key={opt.value}
              value={opt}
              style={{
                color: 'var(--foreground)',
                background: value === opt.value ? 'rgba(201,168,76,.14)' : undefined,
              }}
            >
              <div className="flex flex-col">
                <span className="text-sm">{opt.label}</span>
                {opt.description && (
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {opt.description}
                  </span>
                )}
              </div>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
