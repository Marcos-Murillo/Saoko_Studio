import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { Dancer, Guardian, DancerGuardian } from '@/types'
import { logAudit } from './audit.service'

function snapToEntity<T>(snap: { id: string; data: () => Record<string, unknown> }): T {
  return { id: snap.id, ...snap.data() } as T
}

// ─── Dancers ────────────────────────────────────────────────────────────────

export async function getDancers(activeOnly = false): Promise<Dancer[]> {
  const snap = await getDocs(query(collection(db, COLLECTIONS.DANCERS), orderBy('fullName')))
  const list = snap.docs.map((d) => snapToEntity<Dancer>(d))
  return activeOnly ? list.filter(d => d.isActive) : list
}

export async function getDancerById(id: string): Promise<Dancer | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.DANCERS, id))
  if (!snap.exists()) return null
  return snapToEntity<Dancer>(snap)
}

export async function createDancer(
  data: Omit<Dancer, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.DANCERS), {
    ...data,
    isActive: true,
    inactiveDate: null,
    currentGroupId: null,
      currentGroupName: null,
      photoUrl: (data as Dancer).photoUrl ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  return ref.id
}

export async function updateDancer(id: string, data: Partial<Dancer>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.DANCERS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deactivateDancer(id: string, actor?: { id: string; name: string }): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.DANCERS, id), {
    isActive: false,
    inactiveDate: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  if (actor) await logAudit(actor.id, actor.name, 'dancer.deactivate', 'dancers', id, null, null)
}

export async function reactivateDancer(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.DANCERS, id), {
    isActive: true,
    inactiveDate: null,
    updatedAt: serverTimestamp(),
  })
}

export async function searchDancers(term: string): Promise<Dancer[]> {
  // Firestore doesn't support full-text search; we fetch all and filter client-side.
  // For larger academies, swap this for Algolia or a Firebase Extension.
  const all = await getDancers(false)
  const lower = term.toLowerCase()
  return all.filter(
    (d) =>
      d.fullName.toLowerCase().includes(lower) ||
      d.documentNumber.toLowerCase().includes(lower) ||
      d.email.toLowerCase().includes(lower),
  )
}

// ─── Guardians (Acudientes) ──────────────────────────────────────────────────

export async function getGuardians(): Promise<Guardian[]> {
  const snap = await getDocs(query(collection(db, COLLECTIONS.GUARDIANS), orderBy('fullName')))
  return snap.docs.map((d) => snapToEntity<Guardian>(d))
}

export async function getGuardianById(id: string): Promise<Guardian | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.GUARDIANS, id))
  if (!snap.exists()) return null
  return snapToEntity<Guardian>(snap)
}

export async function createGuardian(
  data: Omit<Guardian, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.GUARDIANS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateGuardian(id: string, data: Partial<Guardian>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.GUARDIANS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// ─── Dancer <-> Guardian relationships ──────────────────────────────────────

export async function getDancerGuardians(dancerId: string): Promise<DancerGuardian[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.DANCER_GUARDIANS), where('dancerId', '==', dancerId)),
  )
  return snap.docs.map((d) => snapToEntity<DancerGuardian>(d))
}

export async function getGuardianDancers(guardianId: string): Promise<DancerGuardian[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.DANCER_GUARDIANS), where('guardianId', '==', guardianId)),
  )
  return snap.docs.map((d) => snapToEntity<DancerGuardian>(d))
}

export async function linkGuardianToDancer(
  dancerId: string,
  guardianId: string,
  relationship: string,
  isPrimary: boolean,
  dancerName: string,
  guardianName: string,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.DANCER_GUARDIANS), {
    dancerId,
    guardianId,
    relationship,
    isPrimary,
    dancerName,
    guardianName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function unlinkGuardianFromDancer(linkId: string): Promise<void> {
  // Soft-flag: not deleting to preserve history
  await updateDoc(doc(db, COLLECTIONS.DANCER_GUARDIANS, linkId), {
    isActive: false,
    updatedAt: serverTimestamp(),
  })
}
