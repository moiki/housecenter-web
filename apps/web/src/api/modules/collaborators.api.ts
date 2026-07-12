import { apiClient } from '@/api/client'
import { DEFAULT_PAGE_SIZE } from 'core/lib/constants'
import type { PagedResult } from 'core/types/common.types'
import type { CollaboratorResponse, CreateCollaboratorRequest, UpdateCollaboratorRequest } from 'core/types/collaborator.types'

const BASE = '/collaborators'

export const collaboratorsApi = {
  list: (page = 1, pageSize = DEFAULT_PAGE_SIZE) =>
    apiClient.get<PagedResult<CollaboratorResponse>>(BASE, { params: { page, pageSize } }).then(r => r.data),

  getById: (id: string) =>
    apiClient.get<CollaboratorResponse>(`${BASE}/${id}`).then(r => r.data),

  create: (data: CreateCollaboratorRequest) =>
    apiClient.post<CollaboratorResponse>(BASE, data).then(r => r.data),

  update: (id: string, data: UpdateCollaboratorRequest) =>
    apiClient.put<CollaboratorResponse>(`${BASE}/${id}`, data).then(r => r.data),

  deactivate: (id: string) =>
    apiClient.delete<void>(`${BASE}/${id}`).then(r => r.data),
}
