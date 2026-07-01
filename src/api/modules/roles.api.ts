import { apiClient } from '@/api/client'
import type { RoleResponse } from '@/types/role.types'

// Unversioned, like /auth, /notifications, /attachments, /invitations.
const BASE = '/roles'

export const rolesApi = {
  list: () => apiClient.get<RoleResponse[]>(BASE).then((r) => r.data),
}
