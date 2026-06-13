import { apiClient } from '@/api/client'
import type { ClinicResponse, CreateClinicRequest, UpdateClinicRequest } from '@/types/clinic.types'

const BASE = '/api/v1/clinics'

export const clinicsApi = {
  getAll: () => apiClient.get<ClinicResponse[]>(BASE).then((r) => r.data),
  getById: (id: string) => apiClient.get<ClinicResponse>(`${BASE}/${id}`).then((r) => r.data),
  create: (data: CreateClinicRequest) => apiClient.post<ClinicResponse>(BASE, data).then((r) => r.data),
  update: (id: string, data: UpdateClinicRequest) =>
    apiClient.put<ClinicResponse>(`${BASE}/${id}`, data).then((r) => r.data),
  deactivate: (id: string) => apiClient.delete(`${BASE}/${id}`),
}
