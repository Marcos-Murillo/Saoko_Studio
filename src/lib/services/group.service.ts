import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  increment,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { Group, GroupMembership } from '@/types'

async function syncDancerCurrentGroup(dancerId: string): Promise<void> {
  const current = await getDancerCurrentMemberships(dancerId)
  if (current.length === 0) {
    await updateDoc(doc(db, COLLECTIONS.DANCERS, dancerId), {
      currentGroupId: null,
      currentGroupName: null,
      updatedAt: serverTimestamp(),
    })
    return
  }
  const sorted = [...current].sort((a, b) => {
    const ta = a.startDate?.toMillis?.() ?? 0
    const tb = b.startDate?.toMillis?.() ?? 0
    return tb - ta
  })
  await updateDoc(doc(db, COLLECTIONS.DANCERS, dancerId), {
    currentGroupId: sorted[0].groupId,
    currentGroupName: current.map(m => m.groupName).filter(Boolean).join(', '),
    updatedAt: serverTimestamp(),
  })
}

function snapToEntity<T>(snap: { id: string; data: () => Record<string, unknown> }): T {
  return { id: snap.id, ...snap.data() } as T
}

// ─── Groups ──────────────────────────────────────────────────────────────────

export async function getGroups(activeOnly = false): Promise<Group[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.GROUPS))
  const all  = snap.docs.map(d => snapToEntity<Group>(d))
  const filtered = activeOnly ? all.filter(g => g.isActive !== false) : all
  return filtered.sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export async function getGroupById(id: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.GROUPS, id))
  if (!snap.exists()) return null
  return snapToEntity<Group>(snap)
}

export async function createGroup(
  data: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'memberCount'>,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.GROUPS), {
    ...data,
    memberCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateGroup(id: string, data: Partial<Group>): Promise<void> {
  // IMPORTANT: Changing monthlyFee here NEVER affects existing monthlyFees documents.
  // Historical fees have their own `amount` snapshot.
  await updateDoc(doc(db, COLLECTIONS.GROUPS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteGroup(id: string): Promise<void> {
  const members = await getGroupMembers(id)
  for (const m of members) {
    await unenrollDancer(m.id, m.dancerId, id)
  }
  await deleteDoc(doc(db, COLLECTIONS.GROUPS, id))
}

// ─── Group Memberships ────────────────────────────────────────────────────────

export async function getGroupMembers(groupId: string): Promise<GroupMembership[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.GROUP_MEMBERSHIPS),
      where('groupId', '==', groupId),
      where('isCurrent', '==', true),
    ),
  )
  return snap.docs.map((d) => snapToEntity<GroupMembership>(d))
}

export async function getDancerMemberships(dancerId: string): Promise<GroupMembership[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.GROUP_MEMBERSHIPS),
      where('dancerId', '==', dancerId),
    ),
  )
  const all = snap.docs.map(d => snapToEntity<GroupMembership>(d))
  // Sort client-side — avoids composite index
  return all.sort((a, b) => {
    const ta = a.startDate?.toMillis?.() ?? 0
    const tb = b.startDate?.toMillis?.() ?? 0
    return tb - ta  // desc
  })
}

export async function getDancerCurrentMemberships(dancerId: string): Promise<GroupMembership[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.GROUP_MEMBERSHIPS),
      where('dancerId', '==', dancerId),
      where('isCurrent', '==', true),
    ),
  )
  return snap.docs.map((d) => snapToEntity<GroupMembership>(d))
}

/**
 * Enroll a dancer in a group.
 * Takes a snapshot of the current monthly fee so historical records are immutable.
 */
export async function enrollDancer(
  dancerId: string,
  dancerName: string,
  groupId: string,
  groupName: string,
  monthlyFeeSnapshot: number,
  notes = '',
): Promise<string> {
  const existing = await getDocs(
    query(
      collection(db, COLLECTIONS.GROUP_MEMBERSHIPS),
      where('dancerId', '==', dancerId),
      where('groupId', '==', groupId),
      where('isCurrent', '==', true),
    ),
  )
  if (!existing.empty) return existing.docs[0].id

  const ref = await addDoc(collection(db, COLLECTIONS.GROUP_MEMBERSHIPS), {
    dancerId,
    dancerName,
    groupId,
    groupName,
    startDate: serverTimestamp(),
    endDate: null,
    isCurrent: true,
    monthlyFeeSnapshot,
    notes,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await syncDancerCurrentGroup(dancerId)
  await updateDoc(doc(db, COLLECTIONS.GROUPS, groupId), {
    memberCount: increment(1),
    updatedAt: serverTimestamp(),
  })
  const { currentYearMonth } = await import('@/lib/utils/dates')
  const { generateFeeForDancer } = await import('./fee.service')
  const { year, month } = currentYearMonth()
  await generateFeeForDancer(dancerId, dancerName, groupId, groupName, monthlyFeeSnapshot, year, month)
  return ref.id
}

/**
 * Remove a dancer from a group (closes membership with end date).
 * History is preserved.
 */
export async function unenrollDancer(
  membershipId: string,
  dancerId: string,
  groupId: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.GROUP_MEMBERSHIPS, membershipId), {
    endDate: serverTimestamp(),
    isCurrent: false,
    updatedAt: serverTimestamp(),
  })
  await syncDancerCurrentGroup(dancerId)
  await updateDoc(doc(db, COLLECTIONS.GROUPS, groupId), {
    memberCount: increment(-1),
    updatedAt: serverTimestamp(),
  })
}
