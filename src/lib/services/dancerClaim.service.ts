import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { normalizeDocumentNumber } from '@/lib/auth/identity'
import { toMillis } from '@/lib/utils/dates'
import type { Dancer } from '@/types'

export const PROFILE_FIELDS = [
  { key: 'phone', label: 'Celular', input: 'tel', placeholder: '300 000 0000' },
  { key: 'birthDate', label: 'Fecha de nacimiento', input: 'date', placeholder: '' },
  { key: 'gender', label: 'Género', input: 'select', placeholder: '' },
  { key: 'address', label: 'Dirección', input: 'text', placeholder: 'Calle 10 # 20-30' },
  { key: 'neighborhood', label: 'Barrio', input: 'text', placeholder: 'Laureles' },
  { key: 'commune', label: 'Comuna', input: 'text', placeholder: '11' },
  { key: 'city', label: 'Ciudad', input: 'text', placeholder: 'Medellín' },
  { key: 'eps', label: 'EPS', input: 'text', placeholder: 'Sura' },
] as const

export type ProfileFieldKey = (typeof PROFILE_FIELDS)[number]['key']

type ClaimSource = {
  id: string
  fullName: string
  email?: string
  documentNumber: string
  isActive?: boolean
  phone?: string
  birthDate?: Dancer['birthDate'] | null
  gender?: string
  address?: string
  neighborhood?: string
  commune?: string
  city?: string
  eps?: string
  authUid?: string | null
  documentKey?: string
}

export function missingProfileFields(dancer: ClaimSource): ProfileFieldKey[] {
  return PROFILE_FIELDS.filter((field) => {
    if (field.key === 'birthDate') return toMillis(dancer.birthDate) === 0
    const value = dancer[field.key]
    return value == null || String(value).trim() === ''
  }).map((field) => field.key)
}

export async function writeDancerClaim(dancer: ClaimSource): Promise<void> {
  const documentKey = normalizeDocumentNumber(dancer.documentNumber)
  if (!/^\d{6,15}$/.test(documentKey)) return

  const email = String(dancer.email ?? '').trim().toLowerCase()
  if (dancer.documentKey !== documentKey || (email && dancer.email !== email)) {
    const patch: Record<string, unknown> = { documentKey, updatedAt: serverTimestamp() }
    if (email && dancer.email !== email) patch.email = email
    try {
      await updateDoc(doc(db, COLLECTIONS.DANCERS, dancer.id), patch)
    } catch {
      // The signed-in dancer cannot rewrite these index fields.
    }
  }

  const payload: Record<string, unknown> = {
    email,
    dancerId: dancer.id,
    fullName: dancer.fullName || '',
    isActive: dancer.isActive !== false,
    documentKey,
    missing: missingProfileFields(dancer),
  }
  if (dancer.authUid) payload.authUid = dancer.authUid

  await setDoc(doc(db, COLLECTIONS.DANCER_CLAIMS, documentKey), payload, { merge: true })
}

/** Prepares existing dancers so they can create a password with correo + cédula. */
export async function ensureDancerClaims(): Promise<number> {
  const snap = await getDocs(collection(db, COLLECTIONS.DANCERS))
  let ready = 0

  for (const item of snap.docs) {
    try {
      const dancer = { id: item.id, ...item.data() } as Dancer
      const documentKey = normalizeDocumentNumber(dancer.documentNumber)
      if (!/^\d{6,15}$/.test(documentKey)) continue

      const email = String(dancer.email ?? '').trim().toLowerCase()
      const patch: Record<string, unknown> = {}
      if (dancer.documentKey !== documentKey) patch.documentKey = documentKey
      if (email && dancer.email !== email) patch.email = email
      if (Object.keys(patch).length > 0) {
        patch.updatedAt = serverTimestamp()
        await updateDoc(doc(db, COLLECTIONS.DANCERS, dancer.id), patch)
      }

      await writeDancerClaim({ ...dancer, email, documentNumber: documentKey, documentKey })
      ready += 1
    } catch {
      // One broken ficha should not stop the rest.
    }
  }

  return ready
}
