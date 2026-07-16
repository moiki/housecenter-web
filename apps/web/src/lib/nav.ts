import { ALL_ROLES, ADMIN_ABOVE, STAFF_ONLY } from 'core/lib/constants'
import type { RoleName } from 'core/lib/constants'

export interface NavItem {
  label: string
  path: string
  roles: RoleName[]
  icon: string
}

// `label` is an i18n key (namespace `nav`), not raw text — Sidebar.tsx resolves it via `t()`.
export const NAV_ITEMS: NavItem[] = [
  { label: 'nav.dashboard',     path: '/',                    roles: ALL_ROLES,   icon: 'home' },
  { label: 'nav.patients',      path: '/patients',            roles: ALL_ROLES,   icon: 'users' },
  { label: 'nav.clinics',       path: '/clinics',             roles: ALL_ROLES,   icon: 'building' },
  { label: 'nav.workRoutes',    path: '/work-routes',         roles: ALL_ROLES,   icon: 'map' },
  { label: 'nav.consultations', path: '/consultations',       roles: STAFF_ONLY,  icon: 'message' },
  { label: 'nav.reports',       path: '/reports',             roles: ALL_ROLES,   icon: 'chart' },
  { label: 'nav.collaborators', path: '/collaborators',       roles: ADMIN_ABOVE, icon: 'briefcase' },
  { label: 'nav.users',         path: '/management/users',    roles: ADMIN_ABOVE, icon: 'shield' },
  { label: 'nav.invitations',   path: '/management/invitations', roles: ADMIN_ABOVE, icon: 'mail' },
  { label: 'nav.help',          path: '/help',                roles: ALL_ROLES,   icon: 'help' },
]
