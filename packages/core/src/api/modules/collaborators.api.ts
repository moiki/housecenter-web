import { getApiClient } from 'core/api/http/registry'
import { DEFAULT_PAGE_SIZE } from 'core/lib/constants'
import type { PagedResult } from 'core/types/common.types'
import type { CollaboratorResponse, CreateCollaboratorRequest, UpdateCollaboratorRequest } from 'core/types/collaborator.types'

const BASE = '/collaborators'

export const collaboratorsApi = {
  list: (page = 1, pageSize = DEFAULT_PAGE_SIZE) =>
    getApiClient().get<PagedResult<CollaboratorResponse>>(BASE, { params: { page, pageSize } }).then(r => r.data),

  getById: (id: string) =>
    getApiClient().get<CollaboratorResponse>(`${BASE}/${id}`).then(r => r.data),

  create: (data: CreateCollaboratorRequest) =>
    getApiClient().post<CollaboratorResponse>(BASE, data).then(r => r.data),

  update: (id: string, data: UpdateCollaboratorRequest) =>
    getApiClient().put<CollaboratorResponse>(`${BASE}/${id}`, data).then(r => r.data),

  deactivate: (id: string) =>
    getApiClient().delete<void>(`${BASE}/${id}`).then(r => r.data),
}
