import { getApiClient } from 'core/api/http/registry'
import { DEFAULT_PAGE_SIZE } from 'core/lib/constants'
import type { PagedResult } from 'core/types/common.types'
import type { ClinicResponse, CreateClinicRequest, UpdateClinicRequest } from 'core/types/clinic.types'

const BASE = '/api/v1/clinics'

export const clinicsApi = {
  list: (page = 1, pageSize = DEFAULT_PAGE_SIZE) =>
    getApiClient().get<PagedResult<ClinicResponse>>(BASE, { params: { page, pageSize } }).then((r) => r.data),
  getById: (id: string) => getApiClient().get<ClinicResponse>(`${BASE}/${id}`).then((r) => r.data),
  create: (data: CreateClinicRequest) => getApiClient().post<ClinicResponse>(BASE, data).then((r) => r.data),
  update: (id: string, data: UpdateClinicRequest) =>
    getApiClient().put<ClinicResponse>(`${BASE}/${id}`, data).then((r) => r.data),
  deactivate: (id: string) => getApiClient().delete(`${BASE}/${id}`),
}
