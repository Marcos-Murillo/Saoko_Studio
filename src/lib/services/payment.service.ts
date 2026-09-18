/**
 * payment.service.ts
 * Handles payment registration and the critical allocation logic.
 *
 * FLOW for a new payment:
 * 1. Create the Payment document.
 * 2. Fetch all pending/partial fees for the dancer, ordered by due date ASC.
 * 3. Apply the payment amount across fees until exhausted.
 * 4. For each fee: create a PaymentAllocation, update fee amountPaid + status.
 * 5. If money remains after all fees are covered → add to dancer credit.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { Payment, PaymentAllocation, MonthlyFee } from '@/types'
import { addCredit, reverseDebit } from './credit.service'
import { logAudit } from './audit.service'
import { ensureDancerMonthFees } from './fee.service'
import { toMillis } from '@/lib/utils/dates'

function paymentLocalDate(date: Date): Date {
  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0)
  }
  return date
}

function snapToEntity<T>(snap: { id: string; data: () => Record<string, unknown> }): T {
  return { id: snap.id, ...snap.data() } as T
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getPaymentsByDancer(dancerId: string): Promise<Payment[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.PAYMENTS),
      where('dancerId', '==', dancerId),
    ),
  )
  return snap.docs
    .map((d) => snapToEntity<Payment>(d))
    .sort((a, b) => toMillis(b.paymentDate) - toMillis(a.paymentDate))
}

export async function getAllPayments(): Promise<Payment[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.PAYMENTS))
  return snap.docs
    .map((d) => snapToEntity<Payment>(d))
    .sort((a, b) => toMillis(b.paymentDate) - toMillis(a.paymentDate))
}

export async function getPaymentsByPeriod(
  startDate: Date,
  endDate: Date,
  opts: { includeVoided?: boolean } = {},
): Promise<Payment[]> {
  const startMs = startDate.getTime()
  const endMs = endDate.getTime()
  const all = await getAllPayments()
  return all.filter((p) => {
    if (!opts.includeVoided && p.isVoided) return false
    const t = toMillis(p.paymentDate) || toMillis(p.createdAt)
    return t >= startMs && t <= endMs
  })
}

export async function getAllocationsForPayment(paymentId: string): Promise<PaymentAllocation[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.PAYMENT_ALLOCATIONS),
      where('paymentId', '==', paymentId),
    ),
  )
  return snap.docs.map((d) => snapToEntity<PaymentAllocation>(d))
}

export async function getAllocationsForFee(feeId: string): Promise<PaymentAllocation[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.PAYMENT_ALLOCATIONS),
      where('monthlyFeeId', '==', feeId),
      where('isReversed', '==', false),
    ),
  )
  return snap.docs.map((d) => snapToEntity<PaymentAllocation>(d))
}

// ─── Registration & Allocation ────────────────────────────────────────────────

export interface RegisterPaymentInput {
  dancerId: string
  dancerName: string
  amount: number
  paymentDate: Date
  paymentMethodId: string
  paymentMethodName: string
  concept: string
  notes: string
  registeredById: string
  registeredByName: string
  /** If set, fees of this group are paid first, then remaining oldest fees. */
  groupId?: string
}

export interface AllocationResult {
  paymentId: string
  allocations: Array<{ feeId: string; applied: number }>
  creditGenerated: number
}

/**
 * Register a payment and automatically allocate it to pending fees.
 */
export async function registerPayment(input: RegisterPaymentInput): Promise<AllocationResult> {
  const when = paymentLocalDate(input.paymentDate)
  const paymentRef = await addDoc(collection(db, COLLECTIONS.PAYMENTS), {
    dancerId: input.dancerId,
    dancerName: input.dancerName,
    amount: input.amount,
    paymentDate: Timestamp.fromDate(when),
    paymentMethodId: input.paymentMethodId,
    paymentMethodName: input.paymentMethodName,
    concept: input.concept,
    notes: input.notes,
    registeredById: input.registeredById,
    registeredByName: input.registeredByName,
    isVoided: false,
    voidReason: null,
    voidDate: null,
    voidById: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(input.groupId ? { groupId: input.groupId } : {}),
  })

  const y = when.getFullYear()
  const m = when.getMonth() + 1
  await ensureDancerMonthFees(input.dancerId, y, m)

  const result = await applyPayment(
    paymentRef.id,
    input.dancerId,
    input.dancerName,
    input.amount,
    input.groupId,
    y,
    m,
  )

  await logAudit(
    input.registeredById,
    input.registeredByName,
    'payment.create',
    'payments',
    paymentRef.id,
    null,
    { amount: input.amount, dancerId: input.dancerId, groupId: input.groupId ?? null },
  )

  return { paymentId: paymentRef.id, ...result }
}

/**
 * Core allocation engine.
 * Takes a payment amount and distributes it across pending fees oldest-first.
 * Any surplus becomes dancer credit.
 */
async function applyPayment(
  paymentId: string,
  dancerId: string,
  dancerName: string,
  totalAmount: number,
  preferredGroupId?: string,
  targetYear?: number,
  targetMonth?: number,
): Promise<{ allocations: Array<{ feeId: string; applied: number }>; creditGenerated: number }> {
  const feesSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.MONTHLY_FEES),
      where('dancerId', '==', dancerId),
    ),
  )

  const pendingFees = feesSnap.docs
    .map((d) => snapToEntity<MonthlyFee>(d))
    .filter((f) => f.status === 'pending' || f.status === 'partial')
    .sort((a, b) => a.periodYear - b.periodYear || a.periodMonth - b.periodMonth)

  const ofMonth = (f: MonthlyFee) =>
    targetYear != null && targetMonth != null && f.periodYear === targetYear && f.periodMonth === targetMonth

  const monthFees = pendingFees.filter(ofMonth)
  const olderFees = pendingFees.filter(f => !ofMonth(f))

  const prefer = (list: MonthlyFee[]) =>
    preferredGroupId
      ? [...list.filter(f => f.groupId === preferredGroupId), ...list.filter(f => f.groupId !== preferredGroupId)]
      : list

  const ordered = [...prefer(monthFees), ...olderFees]

  let remaining = totalAmount
  const allocations: Array<{ feeId: string; applied: number }> = []

  for (const fee of ordered) {
    if (remaining <= 0) break

    const outstanding = fee.amount - fee.amountPaid
    if (outstanding <= 0) continue

    const toApply = Math.min(remaining, outstanding)
    remaining -= toApply

    const newAmountPaid = fee.amountPaid + toApply
    const newStatus = newAmountPaid >= fee.amount ? 'paid' : 'partial'

    // Create allocation record
    await addDoc(collection(db, COLLECTIONS.PAYMENT_ALLOCATIONS), {
      paymentId,
      monthlyFeeId: fee.id,
      dancerId,
      amountApplied: toApply,
      isReversed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Update fee
    await updateDoc(doc(db, COLLECTIONS.MONTHLY_FEES, fee.id), {
      amountPaid: newAmountPaid,
      status: newStatus,
      updatedAt: serverTimestamp(),
    })

    allocations.push({ feeId: fee.id, applied: toApply })
  }

  // Any remaining amount becomes credit
  let creditGenerated = 0
  if (remaining > 0) {
    creditGenerated = remaining
    await addCredit(
      dancerId,
      dancerName,
      remaining,
      paymentId,
      `Saldo a favor generado del pago ${paymentId}`,
    )
  }

  return { allocations, creditGenerated }
}

// ─── Void / Anulación ─────────────────────────────────────────────────────────

export async function voidPayment(
  paymentId: string,
  voidReason: string,
  voidById: string,
  voidByName: string,
): Promise<void> {
  const paymentSnap = await getDoc(doc(db, COLLECTIONS.PAYMENTS, paymentId))
  if (!paymentSnap.exists()) throw new Error('Payment not found')
  const payment = snapToEntity<Payment>(paymentSnap)
  if (payment.isVoided) throw new Error('Payment is already voided')

  // Mark payment as voided
  await updateDoc(doc(db, COLLECTIONS.PAYMENTS, paymentId), {
    isVoided: true,
    voidReason,
    voidDate: serverTimestamp(),
    voidById,
    updatedAt: serverTimestamp(),
  })

  // Reverse all allocations
  const allocationsSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.PAYMENT_ALLOCATIONS),
      where('paymentId', '==', paymentId),
      where('isReversed', '==', false),
    ),
  )

  for (const allocationDoc of allocationsSnap.docs) {
    const allocation = snapToEntity<PaymentAllocation>(allocationDoc)

    // Mark allocation as reversed
    await updateDoc(doc(db, COLLECTIONS.PAYMENT_ALLOCATIONS, allocation.id), {
      isReversed: true,
      updatedAt: serverTimestamp(),
    })

    // Reverse the fee payment
    const feeSnap = await getDoc(doc(db, COLLECTIONS.MONTHLY_FEES, allocation.monthlyFeeId))
    if (feeSnap.exists()) {
      const fee = snapToEntity<MonthlyFee>(feeSnap)
      const newAmountPaid = Math.max(0, fee.amountPaid - allocation.amountApplied)
      const newStatus = newAmountPaid === 0 ? 'pending' : 'partial'
      await updateDoc(doc(db, COLLECTIONS.MONTHLY_FEES, allocation.monthlyFeeId), {
        amountPaid: newAmountPaid,
        status: newStatus,
        updatedAt: serverTimestamp(),
      })
    }
  }

  // If payment had generated credit, reverse that too
  const creditTxSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.CREDIT_TRANSACTIONS),
      where('sourcePaymentId', '==', paymentId),
      where('type', '==', 'credit'),
    ),
  )
  for (const txDoc of creditTxSnap.docs) {
    const tx = txDoc.data()
    await reverseDebit(
      payment.dancerId,
      -(tx.amount as number),
      `Reversión de crédito por anulación de pago ${paymentId}`,
    )
  }

  await logAudit(voidById, voidByName, 'payment.void', 'payments', paymentId, null, { voidReason })
}
