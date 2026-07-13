import { getApiClient } from 'core/api/http/registry'
import { DEFAULT_PAGE_SIZE } from 'core/lib/constants'
import type { PagedResult } from 'core/types/common.types'
import type {
  PatientResponse,
  PatientFullSummaryResponse,
  CreatePatientRequest,
  UpdatePatientRequest,
} from 'core/types/patient.types'

const BASE = '/patients'

export const patientsApi = {
  list: (page = 1, pageSize = DEFAULT_PAGE_SIZE) =>
    getApiClient().get<PagedResult<PatientResponse>>(BASE, { params: { page, pageSize } }).then(r => r.data),

  getById: (id: string) =>
    getApiClient().get<PatientResponse>(`${BASE}/${id}`).then(r => r.data),

  getFullSummary: (id: string) =>
    getApiClient().get<PatientFullSummaryResponse>(`${BASE}/${id}/full-summary`).then(r => r.data),

  create: (data: CreatePatientRequest) =>
    getApiClient().post<PatientResponse>(BASE, data).then(r => r.data),

  update: (id: string, data: UpdatePatientRequest) =>
    getApiClient().put<PatientResponse>(`${BASE}/${id}`, data).then(r => r.data),

  deactivate: (id: string) =>
    getApiClient().delete<void>(`${BASE}/${id}`).then(r => r.data),
}
