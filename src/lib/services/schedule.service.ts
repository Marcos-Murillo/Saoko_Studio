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
import type { Schedule, DayOfWeek } from '@/types'

const DAY_ORDER: DayOfWeek[] = [
  'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo',
]

function snapToEntity<T>(snap: { id: string; data: () => Record<string, unknown> }): T {
  return { id: snap.id, ...snap.data() } as T
}

export async function getSchedules(activeOnly = true): Promise<Schedule[]> {
  // Fetch all and filter/sort client-side — avoids composite index requirement
  const snap = await getDocs(collection(db, COLLECTIONS.SCHEDULES))
  let all = snap.docs.map(d => snapToEntity<Schedule>(d))
  if (activeOnly) all = all.filter(s => s.isActive !== false)
  return all.sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)
    return dayDiff !== 0 ? dayDiff : a.startTime.localeCompare(b.startTime)
  })
}

export async function getSchedulesByGroup(groupId: string): Promise<Schedule[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.SCHEDULES), where('groupId', '==', groupId)),
  )
  return snap.docs.map(d => snapToEntity<Schedule>(d))
}

export async function createSchedule(
  data: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.SCHEDULES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateSchedule(id: string, data: Partial<Schedule>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SCHEDULES, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/** Create multiple schedules for the same group (batch) */
export async function createSchedulesBatch(
  slots: Array<Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<string[]> {
  const ids: string[] = []
  for (const slot of slots) {
    const ref = await addDoc(collection(db, COLLECTIONS.SCHEDULES), {
      ...slot,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    ids.push(ref.id)
  }
  return ids
}
