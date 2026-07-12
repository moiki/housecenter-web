import { getApiClient } from 'core/api/http/registry'
import type { PagedResult } from 'core/types/common.types'
import type {
  ConsultationResponse,
  ConsultationDetailResponse,
  ConsultationMessageResponse,
  CreateConsultationRequest,
  PostMessageRequest,
  UpdateConsultationStatusRequest,
  ConsultationStatus,
} from 'core/types/consultation.types'

const BASE = '/consultations'

export const consultationsApi = {
  list: (params: { page?: number; pageSize?: number; status?: ConsultationStatus } = {}) =>
    getApiClient().get<PagedResult<ConsultationResponse>>(BASE, { params }).then((r) => r.data),

  getDetail: (id: string) =>
    getApiClient().get<ConsultationDetailResponse>(`${BASE}/${id}`).then((r) => r.data),

  create: (data: CreateConsultationRequest) =>
    getApiClient().post<ConsultationResponse>(BASE, data).then((r) => r.data),

  postMessage: (id: string, data: PostMessageRequest) =>
    getApiClient()
      .post<ConsultationMessageResponse>(`${BASE}/${id}/messages`, data)
      .then((r) => r.data),

  updateStatus: (id: string, data: UpdateConsultationStatusRequest) =>
    getApiClient()
      .patch<ConsultationResponse>(`${BASE}/${id}/status`, data)
      .then((r) => r.data),
}
