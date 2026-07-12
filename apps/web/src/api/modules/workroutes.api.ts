import { apiClient } from '@/api/client'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { PagedResult } from '@/types/common.types'
import type { WorkRouteResponse, CreateWorkRouteRequest, UpdateWorkRouteRequest } from '@/types/workroute.types'

const BASE = '/workroutes'

export const workRoutesApi = {
  list: (page = 1, pageSize = DEFAULT_PAGE_SIZE) =>
    apiClient.get<PagedResult<WorkRouteResponse>>(BASE, { params: { page, pageSize } }).then(r => r.data),

  getById: (id: string) =>
    apiClient.get<WorkRouteResponse>(`${BASE}/${id}`).then(r => r.data),

  create: (data: CreateWorkRouteRequest) =>
    apiClient.post<WorkRouteResponse>(BASE, data).then(r => r.data),

  update: (id: string, data: UpdateWorkRouteRequest) =>
    apiClient.put<WorkRouteResponse>(`${BASE}/${id}`, data).then(r => r.data),

  deactivate: (id: string) =>
    apiClient.delete<void>(`${BASE}/${id}`).then(r => r.data),
}
