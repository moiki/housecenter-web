export type InvitationStatus = 'Pending' | 'Accepted' | 'Expired'

export interface InvitationResponse {
  id: string
  email: string
  roleId: string
  status: InvitationStatus
  createdDate: string
}

export interface CreateInvitationRequest {
  email: string
  roleId: string
}
