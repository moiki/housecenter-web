export interface PositionDto {
  id: string
  name: string
}

export interface CollaboratorResponse {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  address: string
  country: string | null
  state: string | null
  city: string | null
  profilePicture: string | null
  clinicId: string
  clinicName: string
  workRouteId: string | null
  positions: PositionDto[]
  isActive: boolean
}

export interface CreateCollaboratorRequest {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  address: string
  country: string | null
  state: string | null
  city: string | null
  profilePicture: string | null
  clinicId: string
  workRouteId: string | null
  positions: string[]
}

export type UpdateCollaboratorRequest = CreateCollaboratorRequest
