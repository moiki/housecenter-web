import { apiClient } from '@/api/client'
import type { PagedResult } from '@/types/common.types'
import type {
  ConsultationResponse,
  ConsultationDetailResponse,
  ConsultationMessageResponse,
  CreateConsultationRequest,
  PostMessageRequest,
  UpdateConsultationStatusRequest,
  ConsultationStatus,
} from '@/types/consultation.types'

const BASE = '/api/v1/consultations'

export const consultationsApi = {
  list: (params: { page?: number; pageSize?: number; status?: ConsultationStatus } = {}) =>
    apiClient.get<PagedResult<ConsultationResponse>>(BASE, { params }).then((r) => r.data),

  getDetail: (id: string) =>
    apiClient.get<ConsultationDetailResponse>(`${BASE}/${id}`).then((r) => r.data),

  create: (data: CreateConsultationRequest) =>
    apiClient.post<ConsultationResponse>(BASE, data).then((r) => r.data),

  postMessage: (id: string, data: PostMessageRequest) =>
    apiClient
      .post<ConsultationMessageResponse>(`${BASE}/${id}/messages`, data)
      .then((r) => r.data),

  updateStatus: (id: string, data: UpdateConsultationStatusRequest) =>
    apiClient
      .patch<ConsultationResponse>(`${BASE}/${id}/status`, data)
      .then((r) => r.data),
}
