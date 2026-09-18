/** Digits-only cédula used as login alias and first-access proof. */
export function normalizeDocumentNumber(value: string): string {
  return value.replace(/\D/g, '')
}

export function isDocumentNumber(value: string): boolean {
  return /^\d{6,15}$/.test(normalizeDocumentNumber(value))
}

export const NEW_PASSWORD_HINT = 'Mínimo 8 caracteres. No uses tu cédula.'
