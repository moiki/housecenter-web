import { apiClient } from '@/api/client'
import type { WorkRouteResponse, CreateWorkRouteRequest, UpdateWorkRouteRequest } from '@/types/workroute.types'

const BASE = '/api/v1/workroutes'

export const workRoutesApi = {
  list: () =>
    apiClient.get<WorkRouteResponse[]>(BASE).then(r => r.data),

  getById: (id: string) =>
    apiClient.get<WorkRouteResponse>(`${BASE}/${id}`).then(r => r.data),

  create: (data: CreateWorkRouteRequest) =>
    apiClient.post<WorkRouteResponse>(BASE, data).then(r => r.data),

  update: (id: string, data: UpdateWorkRouteRequest) =>
    apiClient.put<WorkRouteResponse>(`${BASE}/${id}`, data).then(r => r.data),

  deactivate: (id: string) =>
    apiClient.delete<void>(`${BASE}/${id}`).then(r => r.data),
}
