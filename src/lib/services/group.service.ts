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
import { isDobleProcesoName } from '@/lib/utils/dancerCategories'

const SECOND_GROUP_NOTE = 'Segundo grupo de Doble Proceso. No genera mensualidad.'

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
  options?: { chargesFee?: boolean },
): Promise<string> {
  const existing = await getDocs(
    query(
      collection(db, COLLECTIONS.GROUP_MEMBERSHIPS),
      where('dancerId', '==', dancerId),
      where('groupId', '==', groupId),
      where('isCurrent', '==', true),
    ),
  )
  if (!existing.empty) {
    const current = existing.docs[0]
    const chargesNow = current.data().chargesFee !== false
    if (options?.chargesFee === false && chargesNow) {
      await updateDoc(current.ref, {
        chargesFee: false,
        notes: notes || SECOND_GROUP_NOTE,
        updatedAt: serverTimestamp(),
      })
      const { removeUnpaidFeesForGroup } = await import('./fee.service')
      await removeUnpaidFeesForGroup(dancerId, groupId)
    } else if (options?.chargesFee === true && !chargesNow) {
      await updateDoc(current.ref, {
        chargesFee: true,
        updatedAt: serverTimestamp(),
      })
      const { currentYearMonth } = await import('@/lib/utils/dates')
      const { generateFeeForDancer } = await import('./fee.service')
      const { year, month } = currentYearMonth()
      await generateFeeForDancer(dancerId, dancerName, groupId, groupName, monthlyFeeSnapshot, year, month)
    }
    return current.id
  }

  const chargesFee = options?.chargesFee !== false
  const ref = await addDoc(collection(db, COLLECTIONS.GROUP_MEMBERSHIPS), {
    dancerId,
    dancerName,
    groupId,
    groupName,
    startDate: serverTimestamp(),
    endDate: null,
    isCurrent: true,
    monthlyFeeSnapshot,
    chargesFee,
    notes: chargesFee ? notes : (notes || SECOND_GROUP_NOTE),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await syncDancerCurrentGroup(dancerId)
  await updateDoc(doc(db, COLLECTIONS.GROUPS, groupId), {
    memberCount: increment(1),
    updatedAt: serverTimestamp(),
  })
  if (chargesFee) {
    const { currentYearMonth } = await import('@/lib/utils/dates')
    const { generateFeeForDancer } = await import('./fee.service')
    const { year, month } = currentYearMonth()
    await generateFeeForDancer(dancerId, dancerName, groupId, groupName, monthlyFeeSnapshot, year, month)
  }
  return ref.id
}

/**
 * El segundo grupo de Doble Proceso queda activo y sin mensualidad.
 * Sin grupo, se retira solo esa matrícula (la que no cobraba).
 */
export async function saveDancerSecondGroup(
  dancerId: string,
  dancerName: string,
  secondGroup: { id: string; name: string; monthlyFee: number } | null,
): Promise<void> {
  const memberships = await getDancerCurrentMemberships(dancerId)
  const free = memberships.filter(m => m.chargesFee === false)
  const { removeUnpaidFeesForGroup } = await import('./fee.service')

  if (!secondGroup) {
    for (const m of free) {
      await unenrollDancer(m.id, dancerId, m.groupId)
      await removeUnpaidFeesForGroup(dancerId, m.groupId)
    }
    await updateDoc(doc(db, COLLECTIONS.DANCERS, dancerId), {
      secondGroupId: null,
      secondGroupName: null,
      updatedAt: serverTimestamp(),
    })
    return
  }

  for (const m of free) {
    if (m.groupId === secondGroup.id) continue
    await unenrollDancer(m.id, dancerId, m.groupId)
    await removeUnpaidFeesForGroup(dancerId, m.groupId)
  }

  await enrollDancer(
    dancerId,
    dancerName,
    secondGroup.id,
    secondGroup.name,
    secondGroup.monthlyFee,
    SECOND_GROUP_NOTE,
    { chargesFee: false },
  )
  await updateDoc(doc(db, COLLECTIONS.DANCERS, dancerId), {
    secondGroupId: secondGroup.id,
    secondGroupName: secondGroup.name,
    updatedAt: serverTimestamp(),
  })
}

export async function persistSecondGroupChoice(
  dancerId: string,
  dancerName: string,
  catalog: { id: string; name: string }[],
  categoryIds: string[],
  secondGroupId: string,
): Promise<void> {
  const doble = catalog.some(c => categoryIds.includes(c.id) && isDobleProcesoName(c.name))
  if (!doble) {
    await saveDancerSecondGroup(dancerId, dancerName, null)
    return
  }
  const groups = await getGroups(true)
  const group = groups.find(g => g.id === secondGroupId)
  if (!group) throw new Error('Elige el segundo grupo al que asiste')
  await saveDancerSecondGroup(dancerId, dancerName, {
    id: group.id,
    name: group.name,
    monthlyFee: group.monthlyFee,
  })
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
