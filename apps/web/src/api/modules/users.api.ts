import { apiClient } from '@/api/client'
import { DEFAULT_PAGE_SIZE } from 'core/lib/constants'
import type { PagedResult } from 'core/types/common.types'
import type { UserResponse, UpdateUserRequest, AssignRolesRequest } from 'core/types/user.types'

const BASE = '/users'

export const usersApi = {
  list: (page = 1, pageSize = DEFAULT_PAGE_SIZE) =>
    apiClient.get<PagedResult<UserResponse>>(BASE, { params: { page, pageSize } }).then(r => r.data),

  getById: (id: string) =>
    apiClient.get<UserResponse>(`${BASE}/${id}`).then(r => r.data),

  update: (id: string, data: UpdateUserRequest) =>
    apiClient.put<UserResponse>(`${BASE}/${id}`, data).then(r => r.data),

  deactivate: (id: string) =>
    apiClient.delete<void>(`${BASE}/${id}`).then(r => r.data),

  assignRoles: (id: string, data: AssignRolesRequest) =>
    apiClient.put<UserResponse>(`${BASE}/${id}/roles`, data).then(r => r.data),

  updateTheme: (data: { isDarkMode: boolean }) =>
    apiClient.patch<void>(`${BASE}/me/theme`, { darkMode: data.isDarkMode }).then(r => r.data),
}
