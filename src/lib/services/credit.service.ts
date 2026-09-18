/**
 * credit.service.ts
 * Manages dancer credit balances (saldo a favor).
 *
 * A dancer accumulates credit when a payment exceeds their current debt.
 * Credits are automatically consumed when new fees are generated.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { DancerCredit, CreditTransaction } from '@/types'

function snapToEntity<T>(snap: { id: string; data: () => Record<string, unknown> }): T {
  return { id: snap.id, ...snap.data() } as T
}

// ─── Balance ──────────────────────────────────────────────────────────────────

export async function getDancerCredit(dancerId: string): Promise<DancerCredit | null> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.DANCER_CREDITS), where('dancerId', '==', dancerId)),
  )
  if (snap.empty) return null
  return snapToEntity<DancerCredit>(snap.docs[0])
}

export async function getAllCredits(): Promise<DancerCredit[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.DANCER_CREDITS), where('balance', '>', 0), orderBy('balance', 'desc')),
  )
  return snap.docs.map((d) => snapToEntity<DancerCredit>(d))
}

/** Add credit to a dancer's balance. Creates the record if it doesn't exist. */
export async function addCredit(
  dancerId: string,
  dancerName: string,
  amount: number,
  sourcePaymentId: string,
  notes: string,
): Promise<void> {
  const existing = await getDancerCredit(dancerId)

  if (existing) {
    await updateDoc(doc(db, COLLECTIONS.DANCER_CREDITS, existing.id), {
      balance: existing.balance + amount,
      lastUpdated: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } else {
    await addDoc(collection(db, COLLECTIONS.DANCER_CREDITS), {
      dancerId,
      dancerName,
      balance: amount,
      lastUpdated: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  // Log the credit transaction
  await addDoc(collection(db, COLLECTIONS.CREDIT_TRANSACTIONS), {
    dancerId,
    amount,
    type: 'credit',
    sourcePaymentId,
    targetMonthlyFeeId: null,
    notes,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/** Consume credit to pay toward a monthly fee. Returns how much was applied. */
export async function consumeCredit(
  dancerId: string,
  amount: number,
  targetMonthlyFeeId: string,
  notes: string,
): Promise<number> {
  const credit = await getDancerCredit(dancerId)
  if (!credit || credit.balance <= 0) return 0

  const applied = Math.min(credit.balance, amount)

  await updateDoc(doc(db, COLLECTIONS.DANCER_CREDITS, credit.id), {
    balance: credit.balance - applied,
    lastUpdated: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await addDoc(collection(db, COLLECTIONS.CREDIT_TRANSACTIONS), {
    dancerId,
    amount: applied,
    type: 'debit',
    sourcePaymentId: null,
    targetMonthlyFeeId,
    notes,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return applied
}

/** Reverse a credit debit (used when voiding a payment allocation). */
export async function reverseDebit(
  dancerId: string,
  amount: number,
  notes: string,
): Promise<void> {
  const credit = await getDancerCredit(dancerId)

  if (credit) {
    await updateDoc(doc(db, COLLECTIONS.DANCER_CREDITS, credit.id), {
      balance: credit.balance + amount,
      lastUpdated: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } else {
    await addDoc(collection(db, COLLECTIONS.DANCER_CREDITS), {
      dancerId,
      balance: amount,
      lastUpdated: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  await addDoc(collection(db, COLLECTIONS.CREDIT_TRANSACTIONS), {
    dancerId,
    amount,
    type: 'credit',
    sourcePaymentId: null,
    targetMonthlyFeeId: null,
    notes: `[REVERSAL] ${notes}`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Called automatically when a new fee is generated.
 * Attempts to cover the fee using available credit.
 */
export async function applyCreditsToFee(
  dancerId: string,
  feeId: string,
  feeAmount: number,
): Promise<void> {
  const credit = await getDancerCredit(dancerId)
  if (!credit || credit.balance <= 0) return

  const applied = await consumeCredit(
    dancerId,
    feeAmount,
    feeId,
    'Aplicación automática de saldo a favor',
  )

  if (applied > 0) {
    // Update fee's amountPaid and status
    const newAmountPaid = applied
    const status = newAmountPaid >= feeAmount ? 'paid' : 'partial'

    await updateDoc(doc(db, COLLECTIONS.MONTHLY_FEES, feeId), {
      amountPaid: newAmountPaid,
      status,
      updatedAt: serverTimestamp(),
    })
  }
}

export async function getCreditTransactions(dancerId: string): Promise<CreditTransaction[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.CREDIT_TRANSACTIONS),
      where('dancerId', '==', dancerId),
      orderBy('createdAt', 'desc'),
    ),
  )
  return snap.docs.map((d) => snapToEntity<CreditTransaction>(d))
}
