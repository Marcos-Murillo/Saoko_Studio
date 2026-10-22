import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { normalizeDocumentNumber } from '@/lib/auth/identity'
import { parseLocalDateInput, toDateInputValue } from '@/lib/utils/localDate'
import { missingProfileFields } from './dancerClaim.service'
import { getDancerById } from './dancer.service'
import { getDancerCurrentMemberships, getGroupById } from './group.service'
import { getSchedulesByGroup } from './schedule.service'
import { getMonthlyFeesByDancer, monthPayStatus, type MonthPayStatus } from './fee.service'
import { getPaymentsByDancer } from './payment.service'
import { getDancerCredit } from './credit.service'
import { currentYearMonth, dateToTs } from '@/lib/utils/dates'
import type { DayOfWeek, FeeStatus, MonthlyFee, Payment } from '@/types'

const DAY_ORDER: DayOfWeek[] = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
]

export interface PortalClass {
  id: string
  day: DayOfWeek
  start: string
  end: string
  location: string
  groupId: string
  groupName: string
  teacher: string
}

export interface PortalGroup {
  id: string
  name: string
  modality: string
  level: string
  teacher: string
  monthlyFee: number
  /** false cuando es el segundo grupo de Doble Proceso: asiste y no se cobra. */
  chargesFee: boolean
  monthStatus: FeeStatus | 'none'
  monthRemaining: number
  classes: PortalClass[]
}

export interface PortalTeacher {
  name: string
  groups: string[]
}

export interface StudentProfile {
  fullName: string
  documentNumber: string
  email: string
  phone: string
  birthDate: string
  gender: string
  address: string
  neighborhood: string
  commune: string
  city: string
  eps: string
  epsLocation: string
  bloodType: string
  photoUrl: string | null
}

export interface StudentPortalData {
  fullName: string
  photoUrl: string | null
  profile: StudentProfile
  groups: PortalGroup[]
  classes: PortalClass[]
  teachers: PortalTeacher[]
  fees: MonthlyFee[]
  payments: Payment[]
  credit: number
  year: number
  month: number
  currentStatus: MonthPayStatus
  currentRemaining: number
  currentPaid: number
  currentBilled: number
  olderDebt: number
  totalDebt: number
  expectedMonthly: number
}

function groupMonthStatus(fees: MonthlyFee[]): FeeStatus | 'none' {
  if (fees.length === 0) return 'none'
  if (fees.length === 1) return fees[0].status
  if (fees.every(fee => fee.status === 'paid' || fee.status === 'forgiven')) return 'paid'
  if (fees.some(fee => fee.amountPaid > 0)) return 'partial'
  return 'pending'
}

function teacherName(...values: Array<string | null | undefined>): string {
  return values.find(value => value && value.trim())?.trim() || ''
}

export async function getStudentPortal(dancerId: string): Promise<StudentPortalData> {
  const [dancer, memberships, fees, payments, credit] = await Promise.all([
    getDancerById(dancerId),
    getDancerCurrentMemberships(dancerId),
    getMonthlyFeesByDancer(dancerId),
    getPaymentsByDancer(dancerId),
    getDancerCredit(dancerId),
  ])
  if (!dancer) throw new Error('No encontramos tu ficha.')

  const { year, month } = currentYearMonth()
  const scheduleGroups = await Promise.all(memberships.map(async (membership) => {
    const [group, classes] = await Promise.all([
      getGroupById(membership.groupId),
      getSchedulesByGroup(membership.groupId),
    ])
    return { membership, group, classes }
  }))

  const groups: PortalGroup[] = scheduleGroups.map(({ membership, group, classes }) => {
    const monthFees = fees.filter(fee =>
      fee.groupId === membership.groupId && fee.periodYear === year && fee.periodMonth === month,
    )
    const monthRemaining = monthFees.reduce((sum, fee) => sum + Math.max(0, fee.amount - fee.amountPaid), 0)
    const teacher = teacherName(group?.instructorName, ...classes.map(item => item.instructorName))
    const portalClasses: PortalClass[] = classes
      .filter(item => item.isActive !== false)
      .map(item => ({
        id: item.id,
        day: item.dayOfWeek,
        start: item.startTime,
        end: item.endTime,
        location: item.location || '',
        groupId: membership.groupId,
        groupName: membership.groupName || group?.name || 'Grupo',
        teacher: teacherName(item.instructorName, teacher),
      }))
      .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.start.localeCompare(b.start))

    const chargesFee = membership.chargesFee !== false
    return {
      id: membership.groupId,
      name: membership.groupName || group?.name || 'Grupo',
      modality: group?.modalityName || '',
      level: group?.levelName || '',
      teacher,
      monthlyFee: chargesFee ? (membership.monthlyFeeSnapshot || group?.monthlyFee || 0) : 0,
      chargesFee,
      monthStatus: chargesFee ? groupMonthStatus(monthFees) : 'none',
      monthRemaining: chargesFee ? monthRemaining : 0,
      classes: portalClasses,
    }
  }).sort((a, b) => a.name.localeCompare(b.name, 'es'))

  const classes = groups.flatMap(group => group.classes)
    .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.start.localeCompare(b.start))

  const teacherMap = new Map<string, Set<string>>()
  for (const group of groups) {
    if (!group.teacher) continue
    const current = teacherMap.get(group.teacher) ?? new Set<string>()
    current.add(group.name)
    teacherMap.set(group.teacher, current)
  }
  const teachers: PortalTeacher[] = [...teacherMap.entries()]
    .map(([name, groupNames]) => ({ name, groups: [...groupNames] }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  const currentFees = fees.filter(fee => fee.periodYear === year && fee.periodMonth === month)
  const openFees = fees.filter(fee => fee.status !== 'paid' && fee.status !== 'forgiven')
  const totalDebt = openFees.reduce((sum, fee) => sum + Math.max(0, fee.amount - fee.amountPaid), 0)
  const currentRemaining = currentFees.reduce((sum, fee) => sum + Math.max(0, fee.amount - fee.amountPaid), 0)
  const olderDebt = Math.max(0, totalDebt - currentRemaining)

  return {
    fullName: dancer.fullName,
    photoUrl: dancer.photoUrl,
    profile: {
      fullName: dancer.fullName || '',
      documentNumber: dancer.documentNumber || '',
      email: dancer.email || '',
      phone: dancer.phone || '',
      birthDate: toDateInputValue(dancer.birthDate),
      gender: dancer.gender || '',
      address: dancer.address || '',
      neighborhood: dancer.neighborhood || '',
      commune: dancer.commune || '',
      city: dancer.city || '',
      eps: dancer.eps || '',
      epsLocation: dancer.epsLocation || '',
      bloodType: dancer.bloodType || '',
      photoUrl: dancer.photoUrl,
    },
    groups,
    classes,
    teachers,
    fees,
    payments: payments.filter(payment => !payment.isVoided),
    credit: credit?.balance ?? 0,
    year,
    month,
    currentStatus: monthPayStatus(currentFees),
    currentRemaining,
    currentPaid: currentFees.reduce((sum, fee) => sum + fee.amountPaid, 0),
    currentBilled: currentFees.reduce((sum, fee) => sum + fee.amount, 0),
    olderDebt,
    totalDebt,
    expectedMonthly: groups.reduce((sum, group) => sum + (group.chargesFee ? group.monthlyFee : 0), 0),
  }
}

export async function saveStudentProfile(dancerId: string, uid: string, input: StudentProfile): Promise<void> {
  const fullName = input.fullName.trim()
  if (fullName.length < 3) throw new Error('Escribe tu nombre completo.')
  const phone = input.phone.trim()
  if (phone.replace(/\D/g, '').length < 7) throw new Error('Escribe un celular válido.')

  let birthDate = null
  if (input.birthDate) {
    const parsed = parseLocalDateInput(input.birthDate)
    if (!parsed) throw new Error('La fecha de nacimiento no es válida.')
    birthDate = dateToTs(parsed)
  }

  const photoUrl = input.photoUrl?.trim() ? input.photoUrl.trim() : null
  await updateDoc(doc(db, COLLECTIONS.DANCERS, dancerId), {
    fullName,
    phone,
    address: input.address.trim(),
    neighborhood: input.neighborhood.trim(),
    commune: input.commune.trim(),
    city: input.city.trim(),
    gender: input.gender,
    eps: input.eps.trim(),
    epsLocation: input.epsLocation.trim(),
    bloodType: input.bloodType,
    birthDate,
    photoUrl,
    authUid: uid,
    updatedAt: serverTimestamp(),
  })

  try {
    const fresh = await getDancerById(dancerId)
    const cedula = normalizeDocumentNumber(fresh?.documentNumber)
    if (!fresh || !cedula) return
    const claimRef = doc(db, COLLECTIONS.DANCER_CLAIMS, cedula)
    const claim = await getDoc(claimRef)
    const missing = missingProfileFields(fresh)
    if (claim.exists()) {
      await setDoc(claimRef, { fullName, authUid: uid, missing }, { merge: true })
    } else {
      await setDoc(claimRef, {
        email: (fresh.email || '').trim().toLowerCase(),
        dancerId,
        fullName,
        isActive: fresh.isActive !== false,
        documentKey: cedula,
        authUid: uid,
        missing,
      })
    }
  } catch {
    // The ficha is already saved. The signup index can be refreshed later.
  }
}
