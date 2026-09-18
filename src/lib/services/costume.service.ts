import {
  collection, doc, getDocs, addDoc, updateDoc, query, where, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { Costume, CostumeLoan, CostumeLoanStatus } from '@/types'
import { logAudit } from './audit.service'

function snapToEntity<T>(snap: { id: string; data: () => Record<string, unknown> }): T {
  return { id: snap.id, ...snap.data() } as T
}

function loanStatus(loan: CostumeLoan): CostumeLoanStatus {
  if (loan.returnDate) return 'returned'
  if (loan.dueDate && loan.dueDate.toMillis() < Date.now()) return 'overdue'
  return 'loaned'
}

export async function getCostumes(activeOnly = true): Promise<Costume[]> {
  const snap = await getDocs(query(collection(db, COLLECTIONS.COSTUMES), orderBy('name')))
  const all = snap.docs.map(d => snapToEntity<Costume>(d))
  return activeOnly ? all.filter(c => c.isActive !== false) : all
}

export async function createCostume(data: Omit<Costume, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.COSTUMES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateCostume(id: string, data: Partial<Costume>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.COSTUMES, id), { ...data, updatedAt: serverTimestamp() })
}

export async function getLoans(): Promise<CostumeLoan[]> {
  const snap = await getDocs(query(collection(db, COLLECTIONS.COSTUME_LOANS), orderBy('loanDate', 'desc')))
  return snap.docs.map(d => {
    const loan = snapToEntity<CostumeLoan>(d)
    return { ...loan, status: loanStatus(loan) }
  })
}

export async function getOpenLoans(): Promise<CostumeLoan[]> {
  const all = await getLoans()
  return all.filter(l => l.status !== 'returned')
}

export async function createLoan(
  data: Omit<CostumeLoan, 'id' | 'createdAt' | 'updatedAt' | 'returnDate' | 'status'>,
  actor: { id: string; name: string },
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.COSTUME_LOANS), {
    ...data,
    returnDate: null,
    status: 'loaned',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await logAudit(actor.id, actor.name, 'costume.loan', 'costumeLoans', ref.id, null, { costumeId: data.costumeId, dancerId: data.dancerId })
  return ref.id
}

export async function returnLoan(id: string, actor: { id: string; name: string }): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.COSTUME_LOANS, id), {
    returnDate: serverTimestamp(),
    status: 'returned',
    updatedAt: serverTimestamp(),
  })
  await logAudit(actor.id, actor.name, 'costume.return', 'costumeLoans', id, null, null)
}

export function isCostumeOnLoan(loans: CostumeLoan[], costumeId: string): boolean {
  return loans.some(l => l.costumeId === costumeId && l.status !== 'returned')
}

export { Timestamp }
