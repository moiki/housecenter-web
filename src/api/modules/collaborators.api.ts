import { apiClient } from '@/api/client'
import type { CollaboratorResponse, CreateCollaboratorRequest, UpdateCollaboratorRequest } from '@/types/collaborator.types'

const BASE = '/collaborators'

export const collaboratorsApi = {
  list: () =>
    apiClient.get<CollaboratorResponse[]>(BASE).then(r => r.data),

  getById: (id: string) =>
    apiClient.get<CollaboratorResponse>(`${BASE}/${id}`).then(r => r.data),

  create: (data: CreateCollaboratorRequest) =>
    apiClient.post<CollaboratorResponse>(BASE, data).then(r => r.data),

  update: (id: string, data: UpdateCollaboratorRequest) =>
    apiClient.put<CollaboratorResponse>(`${BASE}/${id}`, data).then(r => r.data),

  deactivate: (id: string) =>
    apiClient.delete<void>(`${BASE}/${id}`).then(r => r.data),
}
