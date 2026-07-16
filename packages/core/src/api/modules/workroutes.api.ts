import { getApiClient } from 'core/api/http/registry'
import { DEFAULT_PAGE_SIZE } from 'core/lib/constants'
import type { PagedResult } from 'core/types/common.types'
import type {
  WorkRouteResponse,
  CreateWorkRouteRequest,
  UpdateWorkRouteRequest,
  AssignPatientToRouteRequest,
} from 'core/types/workroute.types'

const BASE = '/workroutes'

export const workRoutesApi = {
  list: (page = 1, pageSize = DEFAULT_PAGE_SIZE) =>
    getApiClient().get<PagedResult<WorkRouteResponse>>(BASE, { params: { page, pageSize } }).then(r => r.data),

  getById: (id: string) =>
    getApiClient().get<WorkRouteResponse>(`${BASE}/${id}`).then(r => r.data),

  create: (data: CreateWorkRouteRequest) =>
    getApiClient().post<WorkRouteResponse>(BASE, data).then(r => r.data),

  update: (id: string, data: UpdateWorkRouteRequest) =>
    getApiClient().put<WorkRouteResponse>(`${BASE}/${id}`, data).then(r => r.data),

  deactivate: (id: string) =>
    getApiClient().delete<void>(`${BASE}/${id}`).then(r => r.data),

  // Stops are derived from patient assignment — these two add/remove that assignment
  // directly and return the route with its Stops already refreshed.
  assignPatient: (routeId: string, patientId: string, data: AssignPatientToRouteRequest) =>
    getApiClient().post<WorkRouteResponse>(`${BASE}/${routeId}/patients/${patientId}`, data).then(r => r.data),

  unassignPatient: (routeId: string, patientId: string) =>
    getApiClient().delete<WorkRouteResponse>(`${BASE}/${routeId}/patients/${patientId}`).then(r => r.data),
}
