/**
 * Centralized Firestore collection name constants.
 * All service files must import from here — never hardcode collection names.
 */
export const COLLECTIONS = {
  // Config / catalog
  MODALITIES: 'modalities',
  CATEGORIES: 'categories',
  LEVELS: 'levels',
  PAYMENT_METHODS: 'paymentMethods',
  EXPENSE_CATEGORIES: 'expenseCategories',

  // People
  ADMIN_USERS: 'adminUsers',
  LOGIN_ALIASES: 'loginAliases',
  DANCERS: 'dancers',
  GUARDIANS: 'guardians',
  DANCER_GUARDIANS: 'dancerGuardians',

  // Groups & scheduling
  GROUPS: 'groups',
  GROUP_MEMBERSHIPS: 'groupMemberships',
  SCHEDULES: 'schedules',

  // Finance
  MONTHLY_FEES: 'monthlyFees',
  PAYMENTS: 'payments',
  PAYMENT_ALLOCATIONS: 'paymentAllocations',
  DANCER_CREDITS: 'dancerCredits',
  CREDIT_TRANSACTIONS: 'creditTransactions',
  EXPENSES: 'expenses',

  COSTUMES: 'costumes',
  COSTUME_LOANS: 'costumeLoans',

  EVENTS: 'events',
  EVENT_CATEGORIES: 'eventCategories',
  EVENT_REGISTRATIONS: 'eventRegistrations',
  EVENT_PAYMENTS: 'eventPayments',

  // Audit
  AUDIT_LOGS: 'auditLogs',
} as const
