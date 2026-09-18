/**
 * Format a number as Colombian Peso currency.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Parse a formatted currency string back to number.
 */
export function parseCurrency(value: string): number {
  return Number(value.replace(/[^0-9,-]/g, '').replace(',', '.'))
}
