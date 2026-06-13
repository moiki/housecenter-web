import { apiClient } from '@/api/client'
import type { InvitationResponse, CreateInvitationRequest } from '@/types/invitation.types'

const BASE = '/api/v1/invitations'

export const invitationsApi = {
  create: (data: CreateInvitationRequest) =>
    apiClient.post<InvitationResponse>(BASE, data).then(r => r.data),

  resend: (id: string) =>
    apiClient.post<void>(`${BASE}/${id}/resend`).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete<void>(`${BASE}/${id}`).then(r => r.data),

  validate: (token: string) =>
    apiClient.get<InvitationResponse>(`${BASE}/validate`, { params: { token } }).then(r => r.data),
}
