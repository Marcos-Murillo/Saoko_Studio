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
import { getSchedulesByGroup, updateSchedule } from '@/lib/services/schedule.service'
import { normalizeDocumentNumber } from '@/lib/auth/identity'

const SECOND_GROUP_NOTE = 'Segundo grupo de Doble Proceso. No genera mensualidad.'

export function isInstructorWaiver(membership: { feeWaiver?: string | null }): boolean {
  return membership.feeWaiver === 'instructor'
}

/** Segundo grupo de Doble Proceso. El grupo que dicta el profesor no entra aquí. */
export function isSecondGroupMembership(membership: { chargesFee?: boolean; feeWaiver?: string | null }): boolean {
  return membership.chargesFee === false && !isInstructorWaiver(membership)
}

export function membershipFeeText(
  membership: { chargesFee?: boolean; feeWaiver?: string | null },
  formattedAmount: string,
): string {
  if (isInstructorWaiver(membership)) return 'Exento'
  if (membership.chargesFee === false) return 'Sin cobro'
  return formattedAmount
}

export function membershipFeeSuffix(membership: { chargesFee?: boolean; feeWaiver?: string | null }): string {
  if (isInstructorWaiver(membership)) return ' · exento'
  if (membership.chargesFee === false) return ' · sin mensualidad'
  return ''
}

export async function syncDancerCurrentGroup(dancerId: string): Promise<void> {
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

async function resolveTeacherDancerId(userId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.ADMIN_USERS, userId))
  if (!snap.exists()) return null
  const data = snap.data()
  if (data.role !== 'teacher' || data.isActive === false) return null
  if (typeof data.dancerId === 'string' && data.dancerId) return data.dancerId
  const cedula = normalizeDocumentNumber(String(data.documentNumber ?? ''))
  if (!cedula) return null
  for (const field of ['documentKey', 'documentNumber']) {
    const matches = await getDocs(query(collection(db, COLLECTIONS.DANCERS), where(field, '==', cedula)))
    if (!matches.empty) return matches.docs[0].id
  }
  return null
}

async function dancerIsInstructor(dancerId: string): Promise<boolean> {
  const groups = await getGroups(false)
  if (groups.some(group => group.instructorDancerId === dancerId)) return true
  for (const group of groups) {
    if (!group.instructorId || group.instructorDancerId) continue
    try {
      const linked = await resolveTeacherDancerId(group.instructorId)
      if (linked === dancerId) return true
    } catch {
      // Sin permiso para leer usuarios, la ficha del grupo basta.
    }
  }
  return false
}

/** El profesor no paga ningún grupo en el que esté inscrito. Si deja de ser profesor, la mensualidad vuelve. */
async function applyInstructorWaiver(dancerId: string, exempt: boolean): Promise<void> {
  const memberships = await getDancerCurrentMemberships(dancerId)
  const dancerSnap = await getDoc(doc(db, COLLECTIONS.DANCERS, dancerId))
  const secondGroupId = typeof dancerSnap.data()?.secondGroupId === 'string' ? dancerSnap.data()?.secondGroupId as string : ''
  const dancerName = String(dancerSnap.data()?.fullName ?? '')
  const { removeUnpaidFeesForGroup, generateFeeForDancer } = await import('./fee.service')
  const { currentYearMonth } = await import('@/lib/utils/dates')

  for (const membership of memberships) {
    if (exempt) {
      if (membership.chargesFee !== false || membership.feeWaiver !== 'instructor') {
        await updateDoc(doc(db, COLLECTIONS.GROUP_MEMBERSHIPS, membership.id), {
          chargesFee: false,
          feeWaiver: 'instructor',
          updatedAt: serverTimestamp(),
        })
      }
      await removeUnpaidFeesForGroup(dancerId, membership.groupId)
      continue
    }
    if (membership.feeWaiver !== 'instructor') continue
    if (membership.groupId === secondGroupId) {
      await updateDoc(doc(db, COLLECTIONS.GROUP_MEMBERSHIPS, membership.id), {
        chargesFee: false,
        feeWaiver: null,
        notes: membership.notes || SECOND_GROUP_NOTE,
        updatedAt: serverTimestamp(),
      })
      continue
    }
    await updateDoc(doc(db, COLLECTIONS.GROUP_MEMBERSHIPS, membership.id), {
      chargesFee: true,
      feeWaiver: null,
      updatedAt: serverTimestamp(),
    })
    const group = await getGroupById(membership.groupId)
    if (!group || group.isActive === false) continue
    const { year, month } = currentYearMonth()
    await generateFeeForDancer(
      dancerId,
      dancerName || membership.dancerName || '',
      membership.groupId,
      group.name,
      group.monthlyFee,
      year,
      month,
    )
  }
}

/** Alinea la exención de los profesores ya vinculados. Si no hay permiso, no interrumpe la caja. */
export async function exemptInstructorMemberships(): Promise<void> {
  const groups = await getGroups(false)
  const taughtByDancer = new Map<string, Set<string>>()

  for (const group of groups) {
    if (!group.instructorId) continue
    let dancerId = group.instructorDancerId ?? null
    if (!dancerId) {
      try {
        dancerId = await resolveTeacherDancerId(group.instructorId)
        if (dancerId) {
          await updateDoc(doc(db, COLLECTIONS.GROUPS, group.id), {
            instructorDancerId: dancerId,
            updatedAt: serverTimestamp(),
          })
        }
      } catch {
        continue
      }
    }
    if (!dancerId) continue
    const taught = taughtByDancer.get(dancerId) ?? new Set<string>()
    taught.add(group.id)
    taughtByDancer.set(dancerId, taught)
  }

  try {
    const waived = await getDocs(query(
      collection(db, COLLECTIONS.GROUP_MEMBERSHIPS),
      where('feeWaiver', '==', 'instructor'),
    ))
    waived.docs.forEach(item => {
      if (item.data().isCurrent !== true) return
      const dancerId = String(item.data().dancerId ?? '')
      if (dancerId && !taughtByDancer.has(dancerId)) taughtByDancer.set(dancerId, new Set())
    })
  } catch {
    // Sin índice o sin permiso, la vinculación del profesor igual aplica la exención.
  }

  for (const [dancerId, taught] of taughtByDancer) {
    try {
      await applyInstructorWaiver(dancerId, taught.size > 0)
    } catch {
      // Quien no administra la caja no puede reescribir matrículas.
    }
  }
}

/** Vincula o retira al profesor del grupo. Si es bailarín, no paga ningún grupo en el que esté inscrito. */
export async function assignTeacherGroups(userId: string, userName: string, groupIds: string[]): Promise<void> {
  const groups = await getGroups(false)
  const chosen = new Set(groupIds)
  let dancerId: string | null = null
  try {
    dancerId = await resolveTeacherDancerId(userId)
  } catch {
    dancerId = null
  }
  await Promise.all(groups.map(async group => {
    const teaches = group.instructorId === userId
    const selected = chosen.has(group.id)
    if (!selected && !teaches) return
    const instructorId = selected ? userId : null
    const instructorName = selected ? userName : null
    await updateDoc(doc(db, COLLECTIONS.GROUPS, group.id), {
      instructorId,
      instructorName,
      instructorDancerId: selected ? dancerId : null,
      updatedAt: serverTimestamp(),
    })
    const classes = await getSchedulesByGroup(group.id)
    await Promise.all(classes.map(item => updateSchedule(item.id, { instructorId, instructorName })))
  }))
  if (dancerId) await applyInstructorWaiver(dancerId, chosen.size > 0)
}

export async function updateGroup(id: string, data: Partial<Group>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.GROUPS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
  const live = await getGroupById(id)
  if (live) await syncOpenRecordsForGroup(live)
}

export async function deleteGroup(id: string): Promise<void> {
  const members = await getGroupMembers(id)
  const { removeUnpaidFeesForGroup } = await import('./fee.service')
  for (const m of members) {
    await unenrollDancer(m.id, m.dancerId, id)
    await removeUnpaidFeesForGroup(m.dancerId, id)
  }
  await deleteDoc(doc(db, COLLECTIONS.GROUPS, id))
}

/** Aplica el nombre y tarifa actuales a matrículas vigentes y cuotas abiertas (sin abono). */
export async function syncOpenRecordsForGroup(group: Group): Promise<void> {
  const members = await getGroupMembers(group.id)
  for (const m of members) {
    const patch: Record<string, unknown> = { updatedAt: serverTimestamp() }
    if (m.groupName !== group.name) patch.groupName = group.name
    if (m.monthlyFeeSnapshot !== group.monthlyFee) patch.monthlyFeeSnapshot = group.monthlyFee
    if (Object.keys(patch).length > 1) {
      await updateDoc(doc(db, COLLECTIONS.GROUP_MEMBERSHIPS, m.id), patch)
    }
    await syncDancerCurrentGroup(m.dancerId)
    if (isSecondGroupMembership(m)) {
      await updateDoc(doc(db, COLLECTIONS.DANCERS, m.dancerId), {
        secondGroupId: group.id,
        secondGroupName: group.name,
        updatedAt: serverTimestamp(),
      })
    }
  }
  const { syncOpenFeesForGroup } = await import('./fee.service')
  await syncOpenFeesForGroup(group)
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
  const instructorExempt = await dancerIsInstructor(dancerId)
  if (!existing.empty) {
    const current = existing.docs[0]
    if (instructorExempt) {
      await updateDoc(current.ref, {
        chargesFee: false,
        feeWaiver: 'instructor',
        updatedAt: serverTimestamp(),
      })
      const { removeUnpaidFeesForGroup } = await import('./fee.service')
      await removeUnpaidFeesForGroup(dancerId, groupId)
      return current.id
    }
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

  const chargesFee = instructorExempt ? false : options?.chargesFee !== false
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
    feeWaiver: instructorExempt ? 'instructor' : null,
    notes: chargesFee ? notes : (instructorExempt ? notes : (notes || SECOND_GROUP_NOTE)),
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
  const free = memberships.filter(isSecondGroupMembership)
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
  try {
    await updateDoc(doc(db, COLLECTIONS.GROUPS, groupId), {
      memberCount: increment(-1),
      updatedAt: serverTimestamp(),
    })
  } catch {
    // El grupo ya no existe (migración / borrado directo).
  }
}
