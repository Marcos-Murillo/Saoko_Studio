import { Timestamp } from 'firebase/firestore'

// ─────────────────────────────────────────────
// Base
// ─────────────────────────────────────────────
export interface BaseEntity {
  id: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─────────────────────────────────────────────
// Catalog / Config entities
// ─────────────────────────────────────────────
export interface Modality extends BaseEntity {
  name: string
  description: string
  isActive: boolean
}

export interface Category extends BaseEntity {
  name: string
  minAge: number | null
  maxAge: number | null
  description: string
  isActive: boolean
  sortOrder: number
}

export interface Level extends BaseEntity {
  name: string
  modalityId: string | null   // null = applies to all modalities
  modalityName?: string
  description: string
  isActive: boolean
  sortOrder: number
}

export interface PaymentMethod extends BaseEntity {
  name: string
  isActive: boolean
}

export interface ExpenseCategory extends BaseEntity {
  name: string
  description: string
  isActive: boolean
}

// ─────────────────────────────────────────────
// Admin Users
// ─────────────────────────────────────────────
export type AdminRole = 'super_admin' | 'admin' | 'staff' | 'teacher'

export interface AdminUser extends BaseEntity {
  name: string
  email: string
  role: AdminRole
  isActive: boolean
  /** UID from Firebase Auth */
  uid: string
  documentNumber?: string
  mustSetPassword?: boolean
}

// ─────────────────────────────────────────────
// Guardians (acudientes)
// ─────────────────────────────────────────────
export interface Guardian extends BaseEntity {
  fullName: string
  documentNumber: string
  phone: string
  email: string
  address: string
  notes: string
}

export interface DancerGuardian extends BaseEntity {
  dancerId: string
  guardianId: string
  relationship: string   // e.g. "Madre", "Padre", "Abuelo"
  isPrimary: boolean
  // Denormalized for display
  guardianName?: string
  dancerName?: string
}

// ─────────────────────────────────────────────
// Dancers (Bailarines)
// ─────────────────────────────────────────────
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

export interface Dancer extends BaseEntity {
  fullName: string
  documentNumber: string
  birthDate: Timestamp
  address: string
  neighborhood: string
  commune: string
  eps: string
  epsLocation: string
  bloodType: BloodType | ''
  email: string
  phone: string
  categoryId: string
  categoryName?: string    // denormalized
  isActive: boolean
  inactiveDate: Timestamp | null
  notes: string
  photoUrl: string | null
  // Denormalized: current group info for quick display
  currentGroupId: string | null
  currentGroupName: string | null
}

// ─────────────────────────────────────────────
// Groups (Grupos)
// ─────────────────────────────────────────────
export interface Group extends BaseEntity {
  name: string
  modalityId: string
  modalityName?: string   // denormalized
  categoryId: string
  categoryName?: string   // denormalized
  levelId: string | null
  levelName?: string | null  // denormalized
  monthlyFee: number
  description: string
  isActive: boolean
  instructorId: string | null
  instructorName?: string | null
  memberCount?: number   // computed
}

export interface GroupMembership extends BaseEntity {
  dancerId: string
  dancerName?: string    // denormalized
  groupId: string
  groupName?: string     // denormalized
  startDate: Timestamp
  endDate: Timestamp | null
  isCurrent: boolean
  /** Price snapshot at time of enrollment — never changes retroactively */
  monthlyFeeSnapshot: number
  notes: string
}

// ─────────────────────────────────────────────
// Schedules (Horarios)
// ─────────────────────────────────────────────
export type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo'

export interface Schedule extends BaseEntity {
  groupId: string
  groupName?: string     // denormalized
  dayOfWeek: DayOfWeek
  startTime: string      // "HH:mm"
  endTime: string        // "HH:mm"
  location: string
  instructorId: string | null
  instructorName?: string | null
  isActive: boolean
  notes: string
}

// ─────────────────────────────────────────────
// Finance — Monthly Fees (Mensualidades)
// ─────────────────────────────────────────────
export type FeeStatus = 'pending' | 'partial' | 'paid' | 'forgiven'

export interface MonthlyFee extends BaseEntity {
  dancerId: string
  dancerName?: string    // denormalized
  groupId: string
  groupName?: string     // denormalized
  periodYear: number
  periodMonth: number    // 1–12
  /** Price snapshot at generation time — NEVER modified retroactively */
  amount: number
  /** Amount paid so far toward this fee */
  amountPaid: number
  status: FeeStatus
  dueDate: Timestamp
  notes: string
}

// ─────────────────────────────────────────────
// Finance — Payments (Pagos)
// ─────────────────────────────────────────────
export interface Payment extends BaseEntity {
  dancerId: string
  dancerName?: string    // denormalized
  amount: number
  paymentDate: Timestamp
  paymentMethodId: string
  paymentMethodName?: string  // denormalized
  concept: string
  notes: string
  registeredById: string
  registeredByName?: string  // denormalized
  isVoided: boolean
  voidReason: string | null
  voidDate: Timestamp | null
  voidById: string | null
}

export interface PaymentAllocation extends BaseEntity {
  paymentId: string
  monthlyFeeId: string
  dancerId: string
  amountApplied: number
  /** true if this allocation was reversed by a void */
  isReversed: boolean
}

// ─────────────────────────────────────────────
// Finance — Credits / Saldo a favor
// ─────────────────────────────────────────────
export interface DancerCredit extends BaseEntity {
  dancerId: string
  dancerName?: string
  balance: number
  lastUpdated: Timestamp
}

export type CreditTransactionType = 'credit' | 'debit'

export interface CreditTransaction extends BaseEntity {
  dancerId: string
  amount: number
  type: CreditTransactionType
  sourcePaymentId: string | null
  targetMonthlyFeeId: string | null
  notes: string
}

// ─────────────────────────────────────────────
// Finance — Expenses (Gastos)
// ─────────────────────────────────────────────
export interface Expense extends BaseEntity {
  concept: string
  categoryId: string
  categoryName?: string   // denormalized
  amount: number
  expenseDate: Timestamp
  paymentMethodId: string
  paymentMethodName?: string  // denormalized
  description: string
  receiptUrl: string | null
  registeredById: string
  registeredByName?: string  // denormalized
}

// ─────────────────────────────────────────────
// Audit
// ─────────────────────────────────────────────
export interface AuditLog extends BaseEntity {
  userId: string
  userName: string
  action: string
  entityType: string
  entityId: string
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
}

// ─────────────────────────────────────────────
// Dashboard / Report types (computed, not stored)
// ─────────────────────────────────────────────
export interface DashboardStats {
  activeDancers: number
  dancersWithDebt: number
  dancersUpToDate: number
  dancersWithCredit: number
  /** Pagos no anulados del mes (caja) */
  cashIncomeThisMonth: number
  /** Suma de amountPaid de cuotas del período (devengo) */
  accrualCollectedThisMonth: number
  totalCollectedThisMonth: number
  totalPendingThisMonth: number
  totalExpensesThisMonth: number
  balanceThisMonth: number
  totalCreditBalance: number
  feesGeneratedCount: number
}

export interface MonthlyChartData {
  month: string
  income: number
  expenses: number
  balance: number
}

export interface Costume extends BaseEntity {
  name: string
  code: string
  size: string
  notes: string
  isActive: boolean
}

export type CostumeLoanStatus = 'loaned' | 'returned' | 'overdue'

export interface CostumeLoan extends BaseEntity {
  costumeId: string
  costumeName?: string
  dancerId: string
  dancerName?: string
  loanDate: Timestamp
  dueDate: Timestamp | null
  returnDate: Timestamp | null
  status: CostumeLoanStatus
  notes: string
}

export interface DebtReport {
  dancerId: string
  dancerName: string
  groupName: string
  pendingMonths: number
  totalDebt: number
  fees: MonthlyFee[]
}

// ─────────────────────────────────────────────
// Eventos (festivales / competencias) — NO entra a contabilidad Saoko
// ─────────────────────────────────────────────
export type EventStatus = 'active' | 'inactive' | 'finished'
export type EventCategoryStatus = 'active' | 'inactive'
export type EventRegistrationStatus = 'pending' | 'partial' | 'paid'
export type EventPaymentConcept = 'full_pass' | 'category' | 'other'

export interface StudioEvent extends BaseEntity {
  name: string
  eventDate: Timestamp
  fullPassPrice: number
  status: EventStatus
  notes: string
}

export interface EventCategory extends BaseEntity {
  eventId: string
  name: string
  price: number
  status: EventCategoryStatus
}

export interface EventRegistration extends BaseEntity {
  eventId: string
  eventName?: string
  dancerId: string
  dancerName?: string
  categoryId: string
  categoryName?: string
  categoryPrice: number
  fullPassAmount: number
  totalDue: number
  amountPaid: number
  status: EventRegistrationStatus
}

export interface EventPayment extends BaseEntity {
  dancerId: string
  dancerName?: string
  eventId: string
  eventName?: string
  registrationId: string
  categoryId: string
  categoryName?: string
  concept: EventPaymentConcept
  amount: number
  paymentDate: Timestamp
  paymentMethodId: string
  paymentMethodName?: string
  notes: string
  registeredById: string
  registeredByName?: string
}

export interface EventStats {
  registeredDancers: number
  paidDancers: number
  pendingDancers: number
  collected: number
  outstanding: number
  registrations: number
}
