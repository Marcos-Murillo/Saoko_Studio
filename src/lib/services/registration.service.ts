import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, getFirebaseAuth } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { isDocumentNumber, normalizeDocumentNumber } from '@/lib/auth/identity'
import { dateToTs, isUnderage } from '@/lib/utils/dates'
import type { ProfileFieldKey } from './dancerClaim.service'

export type RegistrationLookup =
  | { kind: 'new' }
  | { kind: 'no-email' }
  | { kind: 'mismatch' }
  | { kind: 'inactive'; fullName: string }
  | { kind: 'claimed'; fullName: string }
  | { kind: 'claim'; fullName: string; dancerId: string; missing: ProfileFieldKey[]; minor: boolean }

export type StudentGuardianInput = {
  fullName: string
  relationship: string
  phone: string
  documentNumber: string
}

function errorCode(error: unknown): string {
  return (error as { code?: string }).code || ''
}

function publicError(error: unknown, fallback: string): Error {
  const code = errorCode(error)
  if (code === 'permission-denied' || code.endsWith('/permission-denied')) return new Error(fallback)
  if (code === 'auth/invalid-email') return new Error('El correo no es válido.')
  if (code === 'auth/weak-password') return new Error('La contraseña debe tener al menos 8 caracteres.')
  if (code === 'auth/email-already-in-use') return new Error('Este correo ya está registrado. Inicia sesión.')
  if (error instanceof Error && error.message) return error
  return new Error(fallback)
}

function assertPassword(password: string, cedula: string) {
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.')
  if (normalizeDocumentNumber(password) === cedula) {
    throw new Error('La contraseña no puede ser tu número de cédula.')
  }
}

function parseBirthDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) throw new Error('La fecha de nacimiento no es válida.')
  return dateToTs(new Date(year, month - 1, day, 12, 0, 0))
}

async function settleAuth(user: User) {
  await user.getIdToken(true)
  const auth = getFirebaseAuth()
  if (auth.currentUser?.uid === user.uid) return
  await new Promise<void>((resolve) => {
    const unsub = onAuthStateChanged(auth, (current) => {
      if (current?.uid === user.uid) {
        unsub()
        resolve()
      }
    })
  })
  await user.getIdToken(true)
}

async function openAccount(email: string, password: string): Promise<string> {
  const auth = getFirebaseAuth()
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await settleAuth(cred.user)
    return cred.user.uid
  } catch (error) {
    if (errorCode(error) !== 'auth/email-already-in-use') throw publicError(error, 'No se pudo crear la cuenta.')
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      await settleAuth(cred.user)
      return cred.user.uid
    } catch {
      throw new Error('Este correo ya está registrado. Inicia sesión con tu contraseña.')
    }
  }
}

export async function lookupRegistration(email: string, documentNumber: string): Promise<RegistrationLookup> {
  const cedula = normalizeDocumentNumber(documentNumber)
  const normalizedEmail = email.trim().toLowerCase()
  if (!isDocumentNumber(cedula)) throw new Error('La cédula debe tener entre 6 y 15 dígitos.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Escribe un correo válido.')

  let snap
  try {
    snap = await getDoc(doc(db, COLLECTIONS.DANCER_CLAIMS, cedula))
  } catch (error) {
    throw publicError(error, 'No pudimos buscar tu ficha. Recarga la página e inténtalo de nuevo.')
  }
  if (!snap.exists()) return { kind: 'new' }

  const data = snap.data()
  const storedEmail = String(data.email || '').trim().toLowerCase()
  if (!storedEmail) return { kind: 'no-email' }
  if (storedEmail !== normalizedEmail) return { kind: 'mismatch' }

  const fullName = String(data.fullName || 'Bailarín')
  if (data.isActive === false) return { kind: 'inactive', fullName }
  if (data.authUid) return { kind: 'claimed', fullName }

  const missing = Array.isArray(data.missing)
    ? data.missing.filter((key): key is ProfileFieldKey => typeof key === 'string')
    : []
  return {
    kind: 'claim',
    fullName,
    dancerId: String(data.dancerId),
    missing,
    minor: isUnderage(data.birthMillis) || data.minor === true,
  }
}

export async function enrollStudentInGroups(dancerId: string, dancerName: string, groupIds: string[]): Promise<void> {
  const ids = [...new Set(groupIds.map(id => id.trim()).filter(Boolean))]
  if (ids.length === 0) throw new Error('Elige al menos un grupo.')
  const { getGroups, enrollDancer } = await import('./group.service')
  const groups = await getGroups(true)
  for (const id of ids) {
    const group = groups.find(item => item.id === id)
    if (!group) throw new Error('Uno de los grupos ya no está disponible.')
    await enrollDancer(dancerId, dancerName, group.id, group.name, group.monthlyFee, 'Inscripción del estudiante')
  }
}

async function saveStudentGuardian(dancerId: string, dancerName: string, guardian: StudentGuardianInput): Promise<void> {
  const fullName = guardian.fullName.trim()
  const relationship = guardian.relationship.trim()
  const phone = guardian.phone.trim()
  if (fullName.length < 3) throw new Error('Escribe el nombre del acudiente.')
  if (!relationship) throw new Error('Indica el parentesco del acudiente.')
  if (phone.replace(/\D/g, '').length < 7) throw new Error('Escribe el celular del acudiente.')
  const { createGuardian, linkGuardianToDancer } = await import('./dancer.service')
  const guardianId = await createGuardian({
    fullName,
    documentNumber: guardian.documentNumber.trim(),
    phone,
    email: '',
    address: '',
    notes: '',
  })
  await linkGuardianToDancer(dancerId, guardianId, relationship, true, dancerName, fullName)
}

const PENDING_KEY = 'saoko.pendingStudent'

type PendingStudent = { dancerId: string; cedula: string; name: string; email: string }

export function rememberPendingStudent(input: PendingStudent) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(input)) } catch { /* storage can be blocked */ }
}

function readPendingStudent(email: string): PendingStudent | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingStudent
    if (!parsed?.dancerId || parsed.email !== email) return null
    return parsed
  } catch {
    return null
  }
}

function clearPendingStudent() {
  try { localStorage.removeItem(PENDING_KEY) } catch { /* ignore */ }
}

/** Creates the student profile, alias and dancer link. Safe to call more than once. */
export async function completeStudentAccess(user: User): Promise<boolean> {
  const email = (user.email || '').trim().toLowerCase()
  if (!email) return false

  const profileRef = doc(db, COLLECTIONS.ADMIN_USERS, user.uid)
  const existing = await getDoc(profileRef)
  if (existing.exists() && existing.data().role && existing.data().role !== 'student') return false
  if (existing.exists() && existing.data().dancerId) {
    clearPendingStudent()
    return true
  }

  const pending = readPendingStudent(email)
  let dancerId = pending?.dancerId || ''
  let name = pending?.name || ''
  let cedula = pending?.cedula || ''

  let lookupError: unknown = null
  if (!dancerId) {
    try {
      const claims = await getDocs(query(
        collection(db, COLLECTIONS.DANCER_CLAIMS),
        where('email', '==', email),
      ))
      const claim = claims.docs.find((item) => {
        const authUid = item.data().authUid
        return !authUid || authUid === user.uid
      })
      if (claim) {
        dancerId = String(claim.data().dancerId || '')
        name = String(claim.data().fullName || '')
        cedula = normalizeDocumentNumber(claim.id)
      }
    } catch (error) {
      lookupError = error
    }
  }

  if (!dancerId) {
    try {
      const snap = await getDocs(query(collection(db, COLLECTIONS.DANCERS), where('email', '==', email)))
      const match = snap.docs.find((item) => {
        const authUid = item.data().authUid
        return !authUid || authUid === user.uid
      })
      if (match) {
        dancerId = match.id
        name = String(match.data().fullName || '')
        cedula = normalizeDocumentNumber(match.data().documentNumber)
      }
    } catch (error) {
      lookupError = error
    }
  }

  if (!dancerId) {
    if (lookupError) throw lookupError
    return false
  }

  if (!dancerId || !cedula) return false
  if (!name) name = 'Estudiante'

  if (!existing.exists()) {
    try {
      await setDoc(profileRef, {
        uid: user.uid,
        name,
        email,
        documentNumber: cedula,
        role: 'student',
        isActive: true,
        mustSetPassword: false,
        dancerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      const again = await getDoc(profileRef)
      if (!again.exists()) throw error
    }
  }

  try {
    await updateDoc(doc(db, COLLECTIONS.DANCERS, dancerId), {
      authUid: user.uid,
      email,
      documentKey: cedula,
      updatedAt: serverTimestamp(),
    })
  } catch {
    // The profile is enough to enter. The dancer link can be repaired on the next visit.
  }

  const aliasRef = doc(db, COLLECTIONS.LOGIN_ALIASES, cedula)
  const alias = await getDoc(aliasRef)
  if (!alias.exists()) {
    try {
      await setDoc(aliasRef, { email, uid: user.uid, mustSetPassword: false })
    } catch {
      // Email login still works without the cédula alias.
    }
  }

  try {
    await setDoc(doc(db, COLLECTIONS.DANCER_CLAIMS, cedula), {
      email,
      dancerId,
      fullName: name,
      isActive: true,
      documentKey: cedula,
      authUid: user.uid,
      missing: [],
    }, { merge: true })
  } catch {
    // The claim is only needed for a future signup.
  }

  clearPendingStudent()
  return true
}

export async function registerClaimedDancer(input: {
  email: string
  documentNumber: string
  password: string
  dancerId: string
  fullName: string
  missing: ProfileFieldKey[]
  fields: Partial<Record<ProfileFieldKey, string>>
  groupIds: string[]
  guardian?: StudentGuardianInput | null
}): Promise<void> {
  const email = input.email.trim().toLowerCase()
  const cedula = normalizeDocumentNumber(input.documentNumber)
  assertPassword(input.password, cedula)
  if (input.groupIds.length === 0) throw new Error('Elige al menos un grupo.')
  rememberPendingStudent({
    dancerId: input.dancerId,
    cedula,
    name: input.fullName,
    email,
  })

  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() }
  for (const key of input.missing) {
    const value = (input.fields[key] || '').trim()
    if (!value) throw new Error('Completa los datos que faltan en tu ficha.')
    patch[key] = key === 'birthDate' ? parseBirthDate(value) : value
  }

  try {
    const uid = await openAccount(email, input.password)
    const current = getFirebaseAuth().currentUser
    if (!current) throw new Error('No se pudo abrir la sesión.')
    await completeStudentAccess(current)
    patch.authUid = uid
    patch.email = email
    patch.documentKey = cedula
    await updateDoc(doc(db, COLLECTIONS.DANCERS, input.dancerId), patch)
    await setDoc(doc(db, COLLECTIONS.DANCER_CLAIMS, cedula), {
      authUid: uid,
      missing: [],
    }, { merge: true })
    await enrollStudentInGroups(input.dancerId, input.fullName, input.groupIds)
    if (input.guardian) await saveStudentGuardian(input.dancerId, input.fullName, input.guardian)
  } catch (error) {
    throw publicError(error, 'No se pudo activar tu cuenta. Vuelve a intentarlo con el correo y la cédula de tu ficha.')
  }
}

export async function registerNewStudent(input: {
  fullName: string
  email: string
  documentNumber: string
  phone: string
  birthDate: string
  address: string
  city: string
  password: string
  groupIds: string[]
  guardian?: StudentGuardianInput | null
}): Promise<void> {
  const email = input.email.trim().toLowerCase()
  const cedula = normalizeDocumentNumber(input.documentNumber)
  const fullName = input.fullName.trim()
  const phone = input.phone.trim()
  if (fullName.length < 3) throw new Error('Escribe tu nombre completo.')
  if (phone.replace(/\D/g, '').length < 7) throw new Error('Escribe un celular válido.')
  if (input.groupIds.length === 0) throw new Error('Elige al menos un grupo.')
  assertPassword(input.password, cedula)

  const claim = await getDoc(doc(db, COLLECTIONS.DANCER_CLAIMS, cedula))
  if (claim.exists()) {
    throw new Error('Esta cédula ya está en el estudio. Usa el mismo correo de tu ficha.')
  }

  try {
    const uid = await openAccount(email, input.password)
    const already = await getDocs(query(
      collection(db, COLLECTIONS.DANCERS),
      where('authUid', '==', uid),
    ))
    const dancerId = already.empty
      ? (await addDoc(collection(db, COLLECTIONS.DANCERS), {
          fullName,
          documentNumber: cedula,
          documentKey: cedula,
          birthDate: parseBirthDate(input.birthDate),
          address: input.address.trim(),
          neighborhood: '',
          commune: '',
          city: input.city.trim(),
          gender: '',
          eps: '',
          epsLocation: '',
          bloodType: '',
          email,
          phone,
          categoryId: '',
          categoryIds: [],
          categoryNames: [],
          isActive: true,
          inactiveDate: null,
          notes: '',
          photoUrl: null,
          currentGroupId: null,
          currentGroupName: null,
          authUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })).id
      : already.docs[0].id

    rememberPendingStudent({ dancerId, cedula, name: fullName, email })
    const current = getFirebaseAuth().currentUser
    if (!current) throw new Error('No se pudo abrir la sesión.')
    await completeStudentAccess(current)
    await setDoc(doc(db, COLLECTIONS.DANCER_CLAIMS, cedula), {
      email,
      dancerId,
      fullName,
      isActive: true,
      documentKey: cedula,
      authUid: uid,
      missing: [],
      minor: isUnderage(input.birthDate),
    })
    await enrollStudentInGroups(dancerId, fullName, input.groupIds)
    if (input.guardian) await saveStudentGuardian(dancerId, fullName, input.guardian)
  } catch (error) {
    throw publicError(error, 'No se pudo crear tu cuenta. Recarga e inténtalo de nuevo.')
  }
}
