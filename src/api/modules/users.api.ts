import { apiClient } from '@/api/client'
import type { UserResponse, UpdateUserRequest, AssignRolesRequest } from '@/types/user.types'

const BASE = '/users'

export const usersApi = {
  list: () =>
    apiClient.get<UserResponse[]>(BASE).then(r => r.data),

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
