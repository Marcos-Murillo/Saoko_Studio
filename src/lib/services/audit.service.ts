import {
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'

export async function logAudit(
  userId: string,
  userName: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValue: Record<string, unknown> | null = null,
  newValue: Record<string, unknown> | null = null,
) {
  try {
    await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), {
      userId,
      userName,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch {
    // Never block the main action if audit write fails
  }
}
