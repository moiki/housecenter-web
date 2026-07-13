import { getApiClient } from 'core/api/http/registry'
import type { RoleResponse } from 'core/types/role.types'

// Unversioned, like /auth, /notifications, /attachments, /invitations.
const BASE = '/roles'

export const rolesApi = {
  list: () => getApiClient().get<RoleResponse[]>(BASE).then((r) => r.data),
}
