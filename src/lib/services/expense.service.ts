import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { Expense } from '@/types'
import { logAudit } from './audit.service'
import { toMillis } from '@/lib/utils/dates'

function snapToEntity<T>(snap: { id: string; data: () => Record<string, unknown> }): T {
  return { id: snap.id, ...snap.data() } as T
}

export async function getExpenses(startDate?: Date, endDate?: Date): Promise<Expense[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.EXPENSES))
  let all = snap.docs.map((d) => snapToEntity<Expense>(d))
  if (startDate && endDate) {
    const startMs = startDate.getTime()
    const endMs = endDate.getTime()
    all = all.filter((e) => {
      const t = toMillis(e.expenseDate)
      return t >= startMs && t <= endMs
    })
  }
  return all.sort((a, b) => toMillis(b.expenseDate) - toMillis(a.expenseDate))
}

export async function getExpensesByCategory(categoryId: string): Promise<Expense[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.EXPENSES),
      where('categoryId', '==', categoryId),
    ),
  )
  return snap.docs
    .map((d) => snapToEntity<Expense>(d))
    .sort((a, b) => toMillis(b.expenseDate) - toMillis(a.expenseDate))
}

export async function createExpense(
  data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.EXPENSES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await logAudit(data.registeredById, data.registeredByName ?? '', 'expense.create', 'expenses', ref.id, null, { amount: data.amount, concept: data.concept })
  return ref.id
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.EXPENSES, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function getTotalExpensesByPeriod(year: number, month: number): Promise<number> {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)
  const expenses = await getExpenses(start, end)
  return expenses.reduce((sum, e) => sum + e.amount, 0)
}
