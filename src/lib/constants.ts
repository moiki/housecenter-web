export const ROLE_NAMES = {
  Owner: 'Owner',
  Administrator: 'Administrator',
  Member: 'Member',
  Doctor: 'Doctor',
  Sponsor: 'Sponsor',
} as const

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES]

export const ALL_ROLES: RoleName[] = ['Owner', 'Administrator', 'Member', 'Doctor', 'Sponsor']
export const ADMIN_ABOVE: RoleName[] = ['Owner', 'Administrator']
export const STAFF_ONLY: RoleName[] = ['Owner', 'Administrator', 'Member', 'Doctor']

export interface NavItem {
  label: string
  path: string
  roles: RoleName[]
  icon: string
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',      path: '/',                    roles: ALL_ROLES,   icon: 'home' },
  { label: 'Patients',       path: '/patients',            roles: ALL_ROLES,   icon: 'users' },
  { label: 'Clinics',        path: '/clinics',             roles: ALL_ROLES,   icon: 'building' },
  { label: 'Work Routes',    path: '/work-routes',         roles: ALL_ROLES,   icon: 'map' },
  { label: 'Consultations',  path: '/consultations',       roles: STAFF_ONLY,  icon: 'message' },
  { label: 'Reports',        path: '/reports',             roles: ALL_ROLES,   icon: 'chart' },
  { label: 'Collaborators',  path: '/collaborators',       roles: ADMIN_ABOVE, icon: 'briefcase' },
  { label: 'Users',          path: '/management/users',    roles: ADMIN_ABOVE, icon: 'shield' },
  { label: 'Invitations',    path: '/management/invitations', roles: ADMIN_ABOVE, icon: 'mail' },
  { label: 'Help',           path: '/help',                roles: ALL_ROLES,   icon: 'help' },
]
