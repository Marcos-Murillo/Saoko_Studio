import type { ElementType } from 'react'
import {
  LayoutDashboard, Users, UsersRound, CalendarDays,
  DollarSign, Settings, Shirt, Ticket,
} from 'lucide-react'
import { PERMISSIONS } from '@/lib/auth/roles'
import type { AppRole } from '@/lib/auth/roles'

export interface NavItem {
  href: string
  label: string
  icon: ElementType
  check?: (r: AppRole) => boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',  label: 'Inicio',        icon: LayoutDashboard, check: PERMISSIONS.canViewDashboard },
  { href: '/dancers',    label: 'Bailarines',    icon: Users,           check: PERMISSIONS.canManageDancers },
  { href: '/groups',     label: 'Grupos',        icon: UsersRound,      check: PERMISSIONS.canViewGroups },
  { href: '/schedules',  label: 'Horarios',      icon: CalendarDays,    check: PERMISSIONS.canViewSchedules },
  { href: '/accounting', label: 'Caja',          icon: DollarSign,      check: PERMISSIONS.canManageAccounting },
  { href: '/events',     label: 'Eventos',       icon: Ticket,          check: PERMISSIONS.canManageEvents },
  { href: '/costumes',   label: 'Vestuario',     icon: Shirt,           check: PERMISSIONS.canManageCostumes },
  { href: '/settings',   label: 'Ajustes',       icon: Settings,        check: PERMISSIONS.canManageSettings },
]

export const MOBILE_TAB_HREFS = ['/dashboard', '/dancers', '/accounting', '/events'] as const
