/**
 * fee.service.ts
 * Core business logic for monthly fee generation and management.
 *
 * KEY RULES:
 * 1. `amount` in each MonthlyFee document is a SNAPSHOT — it never changes
 *    even if the group price changes later.
 * 2. Inactive dancers do NOT get new fees.
 * 3. If a dancer has credit, it is applied automatically on generation.
 * 4. Duplicate fees for same (dancer, group, year, month) are prevented.
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
import { monthStart, currentYearMonth } from '@/lib/utils/dates'
import type { MonthlyFee, FeeStatus } from '@/types'
import { applyCreditsToFee } from './credit.service'
import { logAudit } from './audit.service'

function snapToEntity<T>(snap: { id: string; data: () => Record<string, unknown> }): T {
  return { id: snap.id, ...snap.data() } as T
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getMonthlyFeesByDancer(dancerId: string): Promise<MonthlyFee[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.MONTHLY_FEES),
      where('dancerId', '==', dancerId),
    ),
  )
  return snap.docs
    .map((d) => snapToEntity<MonthlyFee>(d))
    .sort((a, b) => b.periodYear - a.periodYear || b.periodMonth - a.periodMonth)
}

export async function getMonthlyFeesByPeriod(year: number, month: number): Promise<MonthlyFee[]> {
  const fromDocs = (docs: { id: string; data: () => Record<string, unknown> }[]) =>
    docs
      .map((d) => snapToEntity<MonthlyFee>(d))
      .filter((f) => f.periodYear === year && f.periodMonth === month)
      .sort((a, b) => (a.dancerName ?? '').localeCompare(b.dancerName ?? '', 'es'))

  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.MONTHLY_FEES),
        where('periodYear', '==', year),
        where('periodMonth', '==', month),
      ),
    )
    return fromDocs(snap.docs)
  } catch {
    const snap = await getDocs(collection(db, COLLECTIONS.MONTHLY_FEES))
    return fromDocs(snap.docs)
  }
}

export async function getPendingFeesByDancer(dancerId: string): Promise<MonthlyFee[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.MONTHLY_FEES),
      where('dancerId', '==', dancerId),
    ),
  )
  return snap.docs
    .map((d) => snapToEntity<MonthlyFee>(d))
    .filter((f) => f.status === 'pending' || f.status === 'partial')
    .sort((a, b) => a.periodYear - b.periodYear || a.periodMonth - b.periodMonth)
}

export async function getAllPendingFees(): Promise<MonthlyFee[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.MONTHLY_FEES))
  return snap.docs
    .map((d) => snapToEntity<MonthlyFee>(d))
    .filter((f) => f.status === 'pending' || f.status === 'partial')
    .sort((a, b) => (a.dancerName ?? '').localeCompare(b.dancerName ?? '', 'es'))
}

export type MonthPayStatus = 'paid' | 'pending' | 'partial' | 'na'

/** Pagado solo si todas las cuotas del mes están paid/forgiven. */
export function monthPayStatus(fees: MonthlyFee[]): MonthPayStatus {
  if (fees.length === 0) return 'na'
  if (fees.every(f => f.status === 'paid' || f.status === 'forgiven')) return 'paid'
  if (fees.some(f => f.amountPaid > 0)) return 'partial'
  return 'pending'
}

export async function updateFeeStatus(
  feeId: string,
  amountPaid: number,
  status: FeeStatus,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.MONTHLY_FEES, feeId), {
    amountPaid,
    status,
    updatedAt: serverTimestamp(),
  })
}

// ─── Generation ───────────────────────────────────────────────────────────────

/**
 * Generate one monthly fee for a dancer+group combination.
 * Safe to call multiple times — returns existing if already generated.
 */
export async function generateFeeForDancer(
  dancerId: string,
  dancerName: string,
  groupId: string,
  groupName: string,
  monthlyFeeAmount: number,
  year: number,
  month: number,
): Promise<{ feeId: string; wasExisting: boolean }> {
  // Check for existing fee
  const existing = await getDocs(
    query(
      collection(db, COLLECTIONS.MONTHLY_FEES),
      where('dancerId', '==', dancerId),
      where('groupId', '==', groupId),
      where('periodYear', '==', year),
      where('periodMonth', '==', month),
    ),
  )
  if (!existing.empty) {
    return { feeId: existing.docs[0].id, wasExisting: true }
  }

  const dueDate = Timestamp.fromDate(monthStart(year, month))

  const ref = await addDoc(collection(db, COLLECTIONS.MONTHLY_FEES), {
    dancerId,
    dancerName,
    groupId,
    groupName,
    periodYear: year,
    periodMonth: month,
    amount: monthlyFeeAmount,   // SNAPSHOT — never modified retroactively
    amountPaid: 0,
    status: 'pending' as FeeStatus,
    dueDate,
    notes: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // Auto-apply any existing credit
  await applyCreditsToFee(dancerId, ref.id, monthlyFeeAmount)

  return { feeId: ref.id, wasExisting: false }
}

/**
 * Generate fees for ALL active dancers with current memberships.
 * Called manually by admin or scheduled via a server action.
 */
export async function generateMonthlyFees(
  year: number,
  month: number,
  actor?: { id: string; name: string },
): Promise<{ created: number; skipped: number }> {
  // Get all active memberships
  const membershipsSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.GROUP_MEMBERSHIPS),
      where('isCurrent', '==', true),
    ),
  )

  let created = 0
  let skipped = 0

  for (const membershipDoc of membershipsSnap.docs) {
    const membership = membershipDoc.data()

    // Verify dancer is still active
    const dancerSnap = await getDoc(doc(db, COLLECTIONS.DANCERS, membership.dancerId as string))
    if (!dancerSnap.exists() || !dancerSnap.data().isActive) {
      skipped++
      continue
    }

    const result = await generateFeeForDancer(
      membership.dancerId as string,
      membership.dancerName as string,
      membership.groupId as string,
      membership.groupName as string,
      membership.monthlyFeeSnapshot as number,
      year,
      month,
    )

    result.wasExisting ? skipped++ : created++
  }

  if (actor) {
    await logAudit(actor.id, actor.name, 'fees.generate', 'monthlyFees', `${year}-${month}`, null, { created, skipped })
  }

  return { created, skipped }
}

/** Crea la cuota del mes en curso para un bailarín activo (todos sus grupos actuales). */
export async function ensureDancerMonthFees(
  dancerId: string,
  year?: number,
  month?: number,
): Promise<void> {
  const { year: cy, month: cm } = currentYearMonth()
  const y = year ?? cy
  const m = month ?? cm

  const dancerSnap = await getDoc(doc(db, COLLECTIONS.DANCERS, dancerId))
  if (!dancerSnap.exists() || !dancerSnap.data().isActive) return

  const membershipsSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.GROUP_MEMBERSHIPS),
      where('dancerId', '==', dancerId),
      where('isCurrent', '==', true),
    ),
  )

  for (const membershipDoc of membershipsSnap.docs) {
    const membership = membershipDoc.data()
    await generateFeeForDancer(
      dancerId,
      (membership.dancerName as string) ?? (dancerSnap.data().fullName as string),
      membership.groupId as string,
      membership.groupName as string,
      membership.monthlyFeeSnapshot as number,
      y,
      m,
    )
  }
}

/**
 * Asegura las cuotas del mes actual para todos los activos.
 * Se llama al entrar al panel; no duplica si ya existen.
 */
let ensureInflight: Promise<{ created: number; skipped: number }> | null = null

export async function ensureCurrentMonthFees(
  actor?: { id: string; name: string },
): Promise<{ created: number; skipped: number }> {
  const { year, month } = currentYearMonth()
  const cacheKey = `saoko-fees-${year}-${month}`
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(cacheKey) === '1') {
      return { created: 0, skipped: 0 }
    }
  } catch { /* ignore */ }

  if (ensureInflight) return ensureInflight

  ensureInflight = generateMonthlyFees(year, month, actor)
    .then((result) => {
      try {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(cacheKey, '1')
      } catch { /* ignore */ }
      return result
    })
    .finally(() => { ensureInflight = null })

  return ensureInflight
}
