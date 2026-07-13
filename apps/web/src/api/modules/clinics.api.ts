import { apiClient } from '@/api/client'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { PagedResult } from '@/types/common.types'
import type { ClinicResponse, CreateClinicRequest, UpdateClinicRequest } from '@/types/clinic.types'

const BASE = '/api/v1/clinics'

export const clinicsApi = {
  list: (page = 1, pageSize = DEFAULT_PAGE_SIZE) =>
    apiClient.get<PagedResult<ClinicResponse>>(BASE, { params: { page, pageSize } }).then((r) => r.data),
  getById: (id: string) => apiClient.get<ClinicResponse>(`${BASE}/${id}`).then((r) => r.data),
  create: (data: CreateClinicRequest) => apiClient.post<ClinicResponse>(BASE, data).then((r) => r.data),
  update: (id: string, data: UpdateClinicRequest) =>
    apiClient.put<ClinicResponse>(`${BASE}/${id}`, data).then((r) => r.data),
  deactivate: (id: string) => apiClient.delete(`${BASE}/${id}`),
}
