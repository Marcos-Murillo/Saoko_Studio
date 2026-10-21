/**
 * Role hierarchy for Saoko Studio.
 *
 * super_admin  → Created in Firebase Auth + Firestore (document id = Auth UID).
 * admin        → Full access except creating other super admins.
 * staff        → Dancers, groups, accounting. No user/catalog settings.
 * teacher      → Assigned by an admin. Dashboard, groups (read), schedules.
 * student      → Self-registered dancer. Only their own portal.
 */

export type AppRole = 'super_admin' | 'admin' | 'staff' | 'teacher' | 'student'

function isOffice(role: AppRole) {
  return role === 'super_admin' || role === 'admin' || role === 'staff'
}

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Administrador',
  admin:       'Administrador',
  staff:       'Administrativo',
  teacher:     'Instructor / Profesor',
  student:     'Estudiante',
}

export const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: '#C9A84C',
  admin:       '#4A90D9',
  staff:       '#4CAF7D',
  teacher:     '#A09070',
  student:     '#820AD1',
}

export const PERMISSIONS = {
  canManageUsers:      (role: AppRole) => role === 'super_admin' || role === 'admin',
  canManageDancers:    (role: AppRole) => isOffice(role),
  canViewGroups:       (role: AppRole) => role !== 'student',
  canManageGroups:     (role: AppRole) => isOffice(role),
  canManageAccounting: (role: AppRole) => isOffice(role),
  canViewSchedules:    (role: AppRole) => role !== 'student',
  canManageSchedules:  (role: AppRole) => isOffice(role),
  canManageSettings:   (role: AppRole) => role === 'super_admin' || role === 'admin',
  canViewDashboard:    (role: AppRole) => role !== 'student',
  canManageCostumes:   (role: AppRole) => isOffice(role),
  canManageEvents:     (role: AppRole) => isOffice(role),
  canAssignRole: (assignerRole: AppRole, targetRole: AppRole): boolean => {
    if (assignerRole === 'super_admin') return true
    if (assignerRole === 'admin') return targetRole === 'staff' || targetRole === 'teacher' || targetRole === 'student'
    return false
  },
}

export function assignableRoles(role: AppRole): AppRole[] {
  if (role === 'super_admin') return ['admin', 'staff', 'teacher', 'student']
  if (role === 'admin')       return ['staff', 'teacher', 'student']
  return []
}

export function homeForRole(role?: AppRole | null): string {
  return role === 'student' ? '/mi-espacio' : '/dashboard'
}
