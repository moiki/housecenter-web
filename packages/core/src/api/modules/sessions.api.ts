import { getApiClient } from 'core/api/http/registry'
import type { PagedResult } from 'core/types/common.types'
import type {
  AttentionSessionResponse,
  CreateAttentionSessionRequest,
  UpdateSessionStatusRequest,
  AttentionType,
  SessionStatus,
} from 'core/types/session.types'

const base = (patientId: string) => `/patients/${patientId}/sessions`

export const sessionsApi = {
  list: (
    patientId: string,
    params: {
      page?: number
      pageSize?: number
      type?: AttentionType
      status?: SessionStatus
      from?: string
      to?: string
    } = {},
  ) =>
    getApiClient()
      .get<PagedResult<AttentionSessionResponse>>(base(patientId), { params })
      .then((r) => r.data),

  create: (patientId: string, data: CreateAttentionSessionRequest) =>
    getApiClient()
      .post<AttentionSessionResponse>(base(patientId), data)
      .then((r) => r.data),

  patchStatus: (
    patientId: string,
    sessionId: string,
    data: UpdateSessionStatusRequest,
  ) =>
    getApiClient()
      .patch<AttentionSessionResponse>(`${base(patientId)}/${sessionId}/status`, data)
      .then((r) => r.data),

  delete: (patientId: string, sessionId: string) =>
    getApiClient().delete<void>(`${base(patientId)}/${sessionId}`).then((r) => r.data),
}
