// Shared pagination defaults (mirrors the backend's PageQuery defaults / clamp).
export const DEFAULT_PAGE_SIZE = 20
// Clamp max enforced by the backend's ToPagedResultAsync — used by dropdown/select
// call sites that need the "full" list. Known limitation: any list beyond 100 rows
// is truncated for dropdown purposes; the real fix (typeahead/lookup) is a tracked
// follow-up, not part of this change.
export const DROPDOWN_PAGE_SIZE = 100

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

// NavItem / NAV_ITEMS (route paths + MUI icon strings) stay in web —
// see apps/web/src/lib/nav.ts.
