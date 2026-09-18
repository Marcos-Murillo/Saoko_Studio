/**
 * Role hierarchy for Saoko Studio.
 *
 * super_admin  → Created in Firebase Auth + Firestore (document id = Auth UID).
 * admin        → Full access except creating other super admins.
 * staff        → Dancers, groups, accounting. No user/catalog settings.
 * teacher      → Dashboard, groups (read), schedules. No financial data.
 */

export type AppRole = 'super_admin' | 'admin' | 'staff' | 'teacher'

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Administrador',
  admin:       'Administrador',
  staff:       'Administrativo',
  teacher:     'Instructor / Profesor',
}

export const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: '#C9A84C',
  admin:       '#4A90D9',
  staff:       '#4CAF7D',
  teacher:     '#A09070',
}

export const PERMISSIONS = {
  canManageUsers:      (role: AppRole) => role === 'super_admin' || role === 'admin',
  canManageDancers:    (role: AppRole) => role !== 'teacher',
  canViewGroups:       (_role: AppRole) => true,
  canManageGroups:     (role: AppRole) => role !== 'teacher',
  canManageAccounting: (role: AppRole) => role === 'super_admin' || role === 'admin' || role === 'staff',
  canViewSchedules:    (_role: AppRole) => true,
  canManageSchedules:  (role: AppRole) => role !== 'teacher',
  canManageSettings:   (role: AppRole) => role === 'super_admin' || role === 'admin',
  canViewDashboard:    (_role: AppRole) => true,
  canManageCostumes:   (role: AppRole) => role === 'super_admin' || role === 'admin' || role === 'staff',
  canManageEvents:     (role: AppRole) => role === 'super_admin' || role === 'admin' || role === 'staff',
  canAssignRole: (assignerRole: AppRole, targetRole: AppRole): boolean => {
    if (assignerRole === 'super_admin') return true
    if (assignerRole === 'admin') return targetRole === 'staff' || targetRole === 'teacher'
    return false
  },
}

export function assignableRoles(role: AppRole): AppRole[] {
  if (role === 'super_admin') return ['admin', 'staff', 'teacher']
  if (role === 'admin')       return ['staff', 'teacher']
  return []
}
