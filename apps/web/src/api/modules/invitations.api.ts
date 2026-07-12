import { apiClient } from '@/api/client'
import { DEFAULT_PAGE_SIZE } from 'core/lib/constants'
import type { PagedResult } from 'core/types/common.types'
import type { InvitationResponse, CreateInvitationRequest } from 'core/types/invitation.types'

// Unversioned, like /auth, /notifications, /attachments — was wrongly "/api/v1/invitations"
// before, which 404'd against the real backend (HouseCenter.Api registers "/invitations").
const BASE = '/invitations'

export const invitationsApi = {
  list: (page = 1, pageSize = DEFAULT_PAGE_SIZE) =>
    apiClient.get<PagedResult<InvitationResponse>>(BASE, { params: { page, pageSize } }).then(r => r.data),

  create: (data: CreateInvitationRequest) =>
    apiClient.post<InvitationResponse>(BASE, data).then(r => r.data),

  resend: (id: string) =>
    apiClient.post<void>(`${BASE}/${id}/resend`).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete<void>(`${BASE}/${id}`).then(r => r.data),

  validate: (token: string) =>
    apiClient.get<InvitationResponse>(`${BASE}/validate`, { params: { token } }).then(r => r.data),
}
