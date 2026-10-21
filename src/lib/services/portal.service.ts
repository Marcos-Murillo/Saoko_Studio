import { getDancerById } from './dancer.service'
import { getDancerCurrentMemberships, getGroupById } from './group.service'
import { getSchedulesByGroup } from './schedule.service'
import { getMonthlyFeesByDancer, monthPayStatus, type MonthPayStatus } from './fee.service'
import { getPaymentsByDancer } from './payment.service'
import { getDancerCredit } from './credit.service'
import { currentYearMonth } from '@/lib/utils/dates'
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
  monthStatus: FeeStatus | 'none'
  monthRemaining: number
  classes: PortalClass[]
}

export interface PortalTeacher {
  name: string
  groups: string[]
}

export interface StudentPortalData {
  fullName: string
  photoUrl: string | null
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

    return {
      id: membership.groupId,
      name: membership.groupName || group?.name || 'Grupo',
      modality: group?.modalityName || '',
      level: group?.levelName || '',
      teacher,
      monthlyFee: membership.monthlyFeeSnapshot || group?.monthlyFee || 0,
      monthStatus: groupMonthStatus(monthFees),
      monthRemaining,
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
    expectedMonthly: groups.reduce((sum, group) => sum + group.monthlyFee, 0),
  }
}
