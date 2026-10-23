/**
 * adminUser.service.ts
 * Manages admin user CRUD.
 *
 * Creating a new admin requires:
 * 1. Creating a Firebase Auth account (email + temporary password = cédula)
 * 2. Creating the Firestore record with role, name, mustSetPassword
 *
 * Since Firebase Auth user creation from client requires a secondary auth
 * instance to avoid signing out the current user, we use a workaround:
 * create the auth user, immediately save uid to Firestore, then sign out
 * of the secondary instance.
 */
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, orderBy, where, writeBatch, increment, serverTimestamp,
  type DocumentReference,
} from 'firebase/firestore'
import { db, getFirebaseAuth } from '@/lib/firebase/config'
import { initializeApp, getApps } from 'firebase/app'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { AppRole } from '@/lib/auth/roles'
import type { AdminUser } from '@/lib/auth/AuthContext'
import { normalizeDocumentNumber } from '@/lib/auth/identity'
import { logAudit } from './audit.service'

function getSecondaryAuth() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  }
  const existing = getApps().find(a => a.name === 'secondary')
  const secondaryApp = existing ?? initializeApp(firebaseConfig, 'secondary')
  return getAuth(secondaryApp)
}

export interface CreateAdminUserInput {
  name: string
  email: string
  role: AppRole
  documentNumber: string
}

function snapToUser(snap: { id: string; data: () => Record<string, unknown> }): AdminUser {
  const d = snap.data()
  return {
    id: snap.id,
    uid: d.uid as string,
    name: d.name as string,
    email: d.email as string,
    role: d.role as AppRole,
    isActive: d.isActive as boolean,
    documentNumber: d.documentNumber as string | undefined,
    mustSetPassword: d.mustSetPassword === true,
    dancerId: d.dancerId as string | undefined,
  }
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const snap = await getDocs(query(collection(db, COLLECTIONS.ADMIN_USERS), orderBy('name')))
  return snap.docs.map(snapToUser)
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<string> {
  const documentNumber = normalizeDocumentNumber(input.documentNumber)
  if (!/^\d{6,15}$/.test(documentNumber)) {
    throw new Error('La cédula debe tener entre 6 y 15 dígitos.')
  }

  const aliasRef = doc(db, COLLECTIONS.LOGIN_ALIASES, documentNumber)
  const existingAlias = await getDoc(aliasRef)
  if (existingAlias.exists()) {
    throw new Error('Ya existe un usuario con esta cédula.')
  }

  const email = input.email.trim().toLowerCase()
  const secondaryAuth = getSecondaryAuth()
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, documentNumber)
  const uid = cred.user.uid
  await secondaryAuth.signOut()

  await setDoc(doc(db, COLLECTIONS.ADMIN_USERS, uid), {
    uid,
    name: input.name,
    email,
    documentNumber,
    role: input.role,
    isActive: true,
    mustSetPassword: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await setDoc(aliasRef, {
    email,
    uid,
    mustSetPassword: true,
  })

  return uid
}

export async function updateAdminUserRole(id: string, role: AppRole, actor?: { id: string; name: string }): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ADMIN_USERS, id), { role, updatedAt: serverTimestamp() })
  if (actor) await logAudit(actor.id, actor.name, 'user.role', 'adminUsers', id, null, { role })
}

export async function toggleAdminUserActive(id: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ADMIN_USERS, id), { isActive, updatedAt: serverTimestamp() })
}

async function removeAuthAccount(email: string, documentNumber: string): Promise<boolean> {
  const secondaryAuth = getSecondaryAuth()
  try {
    const cred = await signInWithEmailAndPassword(secondaryAuth, email, documentNumber)
    await deleteUser(cred.user)
    return true
  } catch {
    return false
  } finally {
    await secondaryAuth.signOut().catch(() => undefined)
  }
}

async function deleteAuthViaServer(uid: string): Promise<boolean> {
  try {
    const token = await getFirebaseAuth().currentUser?.getIdToken()
    if (!token || !uid) return false
    const response = await fetch('/api/admin-users/delete-auth', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid }),
    })
    return response.ok
  } catch {
    return false
  }
}

async function docsWhere(collectionName: string, field: string, value: string) {
  if (!value) return []
  const snap = await getDocs(query(collection(db, collectionName), where(field, '==', value)))
  return snap.docs
}

async function deleteRefs(refs: DocumentReference[]) {
  const unique = [...new Map(refs.map(ref => [ref.path, ref])).values()]
  for (let index = 0; index < unique.length; index += 400) {
    const batch = writeBatch(db)
    unique.slice(index, index + 400).forEach(ref => batch.delete(ref))
    await batch.commit()
  }
}

async function collectDancerIds(user: AdminUser, cedula: string): Promise<Set<string>> {
  const ids = new Set<string>()
  if (user.dancerId) ids.add(user.dancerId)
  if (cedula) {
    for (const field of ['documentNumber', 'documentKey']) {
      const matches = await docsWhere(COLLECTIONS.DANCERS, field, cedula)
      matches.forEach(item => ids.add(item.id))
    }
    const claim = await getDoc(doc(db, COLLECTIONS.DANCER_CLAIMS, cedula))
    const claimDancerId = claim.data()?.dancerId
    if (typeof claimDancerId === 'string' && claimDancerId) ids.add(claimDancerId)
  }
  if (ids.size === 0 && user.role === 'student' && user.email) {
    const matches = await docsWhere(COLLECTIONS.DANCERS, 'email', user.email.trim().toLowerCase())
    matches.forEach(item => ids.add(item.id))
  }
  return ids
}

async function purgeDancer(dancerId: string): Promise<string[]> {
  const cedulas: string[] = []
  const dancerSnap = await getDoc(doc(db, COLLECTIONS.DANCERS, dancerId))
  if (dancerSnap.exists()) {
    const cedula = normalizeDocumentNumber(dancerSnap.data().documentNumber)
    if (cedula) cedulas.push(cedula)
  }

  const memberships = await docsWhere(COLLECTIONS.GROUP_MEMBERSHIPS, 'dancerId', dancerId)
  const perGroup = new Map<string, number>()
  memberships.forEach(item => {
    const data = item.data()
    if (data.isCurrent !== true || typeof data.groupId !== 'string') return
    perGroup.set(data.groupId, (perGroup.get(data.groupId) || 0) + 1)
  })

  const linked = [
    COLLECTIONS.GROUP_MEMBERSHIPS,
    COLLECTIONS.MONTHLY_FEES,
    COLLECTIONS.PAYMENTS,
    COLLECTIONS.PAYMENT_ALLOCATIONS,
    COLLECTIONS.DANCER_CREDITS,
    COLLECTIONS.CREDIT_TRANSACTIONS,
    COLLECTIONS.COSTUME_LOANS,
    COLLECTIONS.EVENT_REGISTRATIONS,
    COLLECTIONS.EVENT_PAYMENTS,
    COLLECTIONS.DANCER_GUARDIANS,
  ]
  const refs: DocumentReference[] = []
  for (const name of linked) {
    const found = await docsWhere(name, 'dancerId', dancerId)
    refs.push(...found.map(item => item.ref))
  }
  const guardianIds = [...new Set(
    (await docsWhere(COLLECTIONS.DANCER_GUARDIANS, 'dancerId', dancerId))
      .map(item => item.data().guardianId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  )]
  const claims = await docsWhere(COLLECTIONS.DANCER_CLAIMS, 'dancerId', dancerId)
  refs.push(...claims.map(item => item.ref))
  await deleteRefs(refs)

  await Promise.all([...perGroup.entries()].map(([groupId, count]) => (
    updateDoc(doc(db, COLLECTIONS.GROUPS, groupId), {
      memberCount: increment(-count),
      updatedAt: serverTimestamp(),
    }).catch(() => undefined)
  )))

  for (const guardianId of guardianIds) {
    const stillLinked = await docsWhere(COLLECTIONS.DANCER_GUARDIANS, 'guardianId', guardianId)
    if (stillLinked.length === 0) {
      await deleteDoc(doc(db, COLLECTIONS.GUARDIANS, guardianId)).catch(() => undefined)
    }
  }

  if (dancerSnap.exists()) await deleteDoc(dancerSnap.ref)
  return cedulas
}

export async function deleteAdminUser(
  user: AdminUser,
  actor: { id: string; name: string },
): Promise<{ authRemoved: boolean }> {
  if (user.id === actor.id) throw new Error('No puedes eliminar tu propio usuario.')

  const cedula = user.documentNumber ? normalizeDocumentNumber(user.documentNumber) : ''
  const authUid = user.uid || user.id
  let authRemoved = await deleteAuthViaServer(authUid)
  if (!authRemoved && user.mustSetPassword && user.email && cedula) {
    authRemoved = await removeAuthAccount(user.email, cedula)
  }

  const dancerIds = await collectDancerIds(user, cedula)
  const aliases = new Set<string>()
  if (cedula) aliases.add(cedula)
  for (const dancerId of dancerIds) {
    const found = await purgeDancer(dancerId)
    found.forEach(value => aliases.add(value))
  }

  const claimRefs = [...aliases].map(value => doc(db, COLLECTIONS.DANCER_CLAIMS, value))
  const existingClaims = []
  for (const claimRef of claimRefs) {
    if ((await getDoc(claimRef)).exists()) existingClaims.push(claimRef)
  }
  await deleteRefs(existingClaims)

  for (const alias of aliases) {
    await deleteDoc(doc(db, COLLECTIONS.LOGIN_ALIASES, alias)).catch(() => undefined)
  }
  await deleteDoc(doc(db, COLLECTIONS.ADMIN_USERS, user.id))

  await logAudit(actor.id, actor.name, 'user.delete', 'adminUsers', user.id, {
    role: user.role,
    email: user.email,
    dancerIds: [...dancerIds],
  }, null)

  return { authRemoved }
}

export async function updateAdminUserProfile(id: string, data: Partial<Pick<AdminUser, 'name' | 'documentNumber'>>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ADMIN_USERS, id), { ...data, updatedAt: serverTimestamp() })
}
