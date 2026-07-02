import { apiClient } from '@/api/client'
import type {
  PatientResponse,
  PatientFullSummaryResponse,
  PagedResult,
  CreatePatientRequest,
  UpdatePatientRequest,
} from '@/types/patient.types'

const BASE = '/patients'

export const patientsApi = {
  list: (page = 1, pageSize = 20) =>
    apiClient.get<PagedResult<PatientResponse>>(BASE, { params: { page, pageSize } }).then(r => r.data),

  getById: (id: string) =>
    apiClient.get<PatientResponse>(`${BASE}/${id}`).then(r => r.data),

  getFullSummary: (id: string) =>
    apiClient.get<PatientFullSummaryResponse>(`${BASE}/${id}/full-summary`).then(r => r.data),

  create: (data: CreatePatientRequest) =>
    apiClient.post<PatientResponse>(BASE, data).then(r => r.data),

  update: (id: string, data: UpdatePatientRequest) =>
    apiClient.put<PatientResponse>(`${BASE}/${id}`, data).then(r => r.data),

  deactivate: (id: string) =>
    apiClient.delete<void>(`${BASE}/${id}`).then(r => r.data),
}
