'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  User,
} from 'firebase/auth'
import {
  getDoc, getDocs, setDoc, updateDoc, doc, collection, query, where, serverTimestamp,
} from 'firebase/firestore'
import { db, getFirebaseAuth } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { AppRole } from '@/lib/auth/roles'
import { normalizeDocumentNumber } from '@/lib/auth/identity'

export interface AdminUser {
  id: string
  uid: string
  name: string
  email: string
  role: AppRole
  isActive: boolean
  documentNumber?: string
  mustSetPassword?: boolean
}

interface AuthContextValue {
  user: User | null
  adminUser: AdminUser | null
  loading: boolean
  signIn: (emailOrUsername: string, password: string) => Promise<{ mustSetPassword: boolean }>
  completeFirstAccess: (input: {
    email: string
    documentNumber: string
    password: string
  }) => Promise<void>
  completePasswordSetup: (password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapAdminUser(id: string, data: Record<string, unknown>, fallbackUid: string): AdminUser {
  return {
    id,
    uid: (data.uid as string) || fallbackUid,
    name: data.name as string,
    email: data.email as string,
    role: data.role as AppRole,
    isActive: data.isActive as boolean,
    documentNumber: data.documentNumber as string | undefined,
    mustSetPassword: data.mustSetPassword === true,
  }
}

async function resolveLoginEmail(emailOrUsername: string): Promise<string> {
  const trimmed = emailOrUsername.trim()
  const cedula = normalizeDocumentNumber(trimmed)
  const looksLikeDocument = cedula.length >= 6 && /^\d[\d.\s-]*$/.test(trimmed)

  if (looksLikeDocument) {
    try {
      const alias = await getDoc(doc(db, COLLECTIONS.LOGIN_ALIASES, cedula))
      if (alias.exists()) {
        return String(alias.data().email)
      }
    } catch {
      // Alias lookup is public; if rules are not published yet, fall back.
    }
    return `superadmin.${cedula}@saokostudio.internal`
  }

  return trimmed
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAdminUser = async (firebaseUser: User) => {
    try {
      const byId = await getDoc(doc(db, COLLECTIONS.ADMIN_USERS, firebaseUser.uid))
      if (byId.exists()) {
        const profile = mapAdminUser(byId.id, byId.data(), firebaseUser.uid)
        if (!profile.isActive) {
          await firebaseSignOut(getFirebaseAuth())
          setAdminUser(null)
          return
        }
        setAdminUser(profile)
        return
      }

      const legacy = await getDocs(
        query(collection(db, COLLECTIONS.ADMIN_USERS), where('uid', '==', firebaseUser.uid)),
      )
      if (!legacy.empty) {
        const data = legacy.docs[0].data()
        await setDoc(doc(db, COLLECTIONS.ADMIN_USERS, firebaseUser.uid), {
          ...data,
          uid: firebaseUser.uid,
          updatedAt: serverTimestamp(),
        }, { merge: true })
        const profile = mapAdminUser(firebaseUser.uid, data, firebaseUser.uid)
        if (!profile.isActive) {
          await firebaseSignOut(getFirebaseAuth())
          setAdminUser(null)
          return
        }
        setAdminUser(profile)
        return
      }

      const email = firebaseUser.email ?? ''
      if (/^superadmin\..+@saokostudio\.internal$/i.test(email)) {
        await setDoc(doc(db, COLLECTIONS.ADMIN_USERS, firebaseUser.uid), {
          uid: firebaseUser.uid,
          name: 'Super Administrador',
          email,
          role: 'super_admin',
          isActive: true,
          documentNumber: email.split('@')[0].replace('superadmin.', ''),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        setAdminUser({
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          name: 'Super Administrador',
          email,
          role: 'super_admin',
          isActive: true,
        })
        return
      }

      setAdminUser(null)
    } catch {
      setAdminUser(null)
    }
  }

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      setLoading(false)
      return
    }
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) await loadAdminUser(firebaseUser)
      else setAdminUser(null)
      setLoading(false)
    })
    return unsub
  }, [])

  const signIn = async (emailOrUsername: string, password: string) => {
    const email = await resolveLoginEmail(emailOrUsername)
    const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
    await loadAdminUser(cred.user)
    const profile = await getDoc(doc(db, COLLECTIONS.ADMIN_USERS, cred.user.uid))
    return { mustSetPassword: profile.data()?.mustSetPassword === true }
  }

  const persistPasswordSet = async (uid: string, documentNumber?: string) => {
    await updateDoc(doc(db, COLLECTIONS.ADMIN_USERS, uid), {
      mustSetPassword: false,
      updatedAt: serverTimestamp(),
    })
    const cedula = documentNumber ? normalizeDocumentNumber(documentNumber) : ''
    if (cedula) {
      const aliasRef = doc(db, COLLECTIONS.LOGIN_ALIASES, cedula)
      const alias = await getDoc(aliasRef)
      if (alias.exists()) {
        await updateDoc(aliasRef, { mustSetPassword: false })
      }
    }
    setAdminUser(prev => (prev ? { ...prev, mustSetPassword: false } : prev))
  }

  const completePasswordSetup = async (password: string) => {
    const current = getFirebaseAuth().currentUser
    if (!current) throw new Error('No hay una sesión activa')
    const cedula = normalizeDocumentNumber(adminUser?.documentNumber ?? '')
    if (cedula && password === cedula) {
      throw new Error('La contraseña no puede ser tu número de cédula')
    }
    await updatePassword(current, password)
    await persistPasswordSet(current.uid, adminUser?.documentNumber)
  }

  const completeFirstAccess = async (input: {
    email: string
    documentNumber: string
    password: string
  }) => {
    const cedula = normalizeDocumentNumber(input.documentNumber)
    if (input.password === cedula) {
      throw new Error('La contraseña no puede ser tu número de cédula')
    }

    const email = await resolveLoginEmail(input.email.trim())
    const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, cedula)
    const snap = await getDoc(doc(db, COLLECTIONS.ADMIN_USERS, cred.user.uid))
    if (!snap.exists()) {
      await firebaseSignOut(getFirebaseAuth())
      throw new Error('No encontramos tu usuario. Pide al administrador que te cree la cuenta.')
    }

    const data = snap.data()
    const storedCedula = normalizeDocumentNumber(String(data.documentNumber ?? ''))
    if (storedCedula !== cedula) {
      await firebaseSignOut(getFirebaseAuth())
      throw new Error('El correo y la cédula no coinciden.')
    }
    if (data.mustSetPassword !== true) {
      await firebaseSignOut(getFirebaseAuth())
      throw new Error('Ya tienes una contraseña. Usa el inicio de sesión normal.')
    }
    if (data.isActive !== true) {
      await firebaseSignOut(getFirebaseAuth())
      throw new Error('Tu usuario está inactivo.')
    }

    await loadAdminUser(cred.user)
    await updatePassword(cred.user, input.password)
    await persistPasswordSet(cred.user.uid, cedula)
  }

  const signOut = async () => {
    await firebaseSignOut(getFirebaseAuth())
  }

  return (
    <AuthContext.Provider value={{
      user, adminUser, loading, signIn, completeFirstAccess, completePasswordSetup, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
