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
  getAuth,
} from 'firebase/auth'
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
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

export async function updateAdminUserProfile(id: string, data: Partial<Pick<AdminUser, 'name' | 'documentNumber'>>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ADMIN_USERS, id), { ...data, updatedAt: serverTimestamp() })
}
