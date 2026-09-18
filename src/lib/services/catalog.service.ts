/**
 * catalog.service.ts
 *
 * IMPORTANT: Queries that combine where() + orderBy() require a composite
 * index in Firestore. To avoid that dependency during development, we fetch
 * all documents and sort client-side.  This is fine for catalog collections
 * which are small (< 100 items each).
 */
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { Modality, Category, Level, PaymentMethod, ExpenseCategory } from '@/types'

function snapToEntity<T>(snap: { id: string; data: () => Record<string, unknown> }): T {
  return { id: snap.id, ...snap.data() } as T
}

// ─── Modalities ────────────────────────────────────────────────────────────

export async function getModalities(activeOnly = true): Promise<Modality[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.MODALITIES))
  const all = snap.docs.map(d => snapToEntity<Modality>(d))
  const filtered = activeOnly ? all.filter(m => m.isActive !== false) : all
  return filtered.sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export async function createModality(data: Omit<Modality, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.MODALITIES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateModality(id: string, data: Partial<Modality>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.MODALITIES, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// ─── Categories ────────────────────────────────────────────────────────────

export async function getCategories(activeOnly = true): Promise<Category[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.CATEGORIES))
  const all = snap.docs.map(d => snapToEntity<Category>(d))
  const filtered = activeOnly ? all.filter(c => c.isActive !== false) : all
  return filtered.sort((a, b) => {
    const so = (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
    return so !== 0 ? so : a.name.localeCompare(b.name, 'es')
  })
}

export async function createCategory(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.CATEGORIES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.CATEGORIES, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// ─── Levels ────────────────────────────────────────────────────────────────

export async function getLevels(modalityId?: string, activeOnly = true): Promise<Level[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.LEVELS))
  let all = snap.docs.map(d => snapToEntity<Level>(d))
  if (activeOnly) all = all.filter(l => l.isActive !== false)
  if (modalityId) all = all.filter(l => !l.modalityId || l.modalityId === modalityId)
  return all.sort((a, b) => {
    const so = (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
    return so !== 0 ? so : a.name.localeCompare(b.name, 'es')
  })
}

export async function createLevel(data: Omit<Level, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.LEVELS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateLevel(id: string, data: Partial<Level>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.LEVELS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// ─── Payment Methods ────────────────────────────────────────────────────────

export async function getPaymentMethods(activeOnly = true): Promise<PaymentMethod[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.PAYMENT_METHODS))
  const all = snap.docs.map(d => snapToEntity<PaymentMethod>(d))
  const filtered = activeOnly ? all.filter(m => m.isActive !== false) : all
  return filtered.sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export async function createPaymentMethod(data: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.PAYMENT_METHODS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.PAYMENT_METHODS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// ─── Expense Categories ─────────────────────────────────────────────────────

export async function getExpenseCategories(activeOnly = true): Promise<ExpenseCategory[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.EXPENSE_CATEGORIES))
  const all = snap.docs.map(d => snapToEntity<ExpenseCategory>(d))
  const filtered = activeOnly ? all.filter(c => c.isActive !== false) : all
  return filtered.sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export async function createExpenseCategory(data: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.EXPENSE_CATEGORIES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateExpenseCategory(id: string, data: Partial<ExpenseCategory>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.EXPENSE_CATEGORIES, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}
