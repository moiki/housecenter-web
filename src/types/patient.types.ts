export type Gender = 'Male' | 'Female'
export type AttentionType = 'Medical' | 'EducationalReinforcement'
export type TreatmentStatus = 'Active' | 'Completed' | 'Cancelled'
export type CommentType = 'Note' | 'Alert' | 'Observation'
export type CommentStatus = 'Open' | 'Resolved'

export interface PatientResponse {
  id: string
  firstName: string
  lastName: string
  profile: string | null
  birthDate: string
  gender: Gender
  country: string | null
  state: string | null
  city: string | null
  address: string
  description: string | null
  primaryAttentionType: AttentionType
  clinicId: string | null
  workRouteId: string | null
  isActive: boolean
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface CreatePatientRequest {
  firstName: string
  lastName: string
  profile: string | null
  birthDate: string
  gender: Gender
  country: string | null
  state: string | null
  city: string | null
  address: string
  description: string | null
  primaryAttentionType: AttentionType
  clinicId: string | null
  workRouteId: string | null
}

export type UpdatePatientRequest = CreatePatientRequest

export interface TreatmentSummaryDto {
  id: string
  name: string
  description: string
  status: string
  startDate: string
  endDate: string
}

export interface PatientCommentDto {
  id: string
  body: string
  type: string
  status: string
  userId: string
  createdDate: string
}

export interface PatientFullSummaryResponse {
  patient: PatientResponse
  treatments: TreatmentSummaryDto[]
  comments: PatientCommentDto[]
}

export interface TreatmentResponse {
  id: string
  patientId: string
  name: string
  description: string
  profile: string | null
  status: TreatmentStatus
  type: AttentionType
  startDate: string
  endDate: string
  isActive: boolean
}

export interface TreatmentDetailResponse {
  id: string
  treatmentId: string
  name: string
  description: string
  profile: string | null
  treatmentDate: string
  isActive: boolean
}

export interface TreatmentCommentResponse {
  id: string
  treatmentId: string
  body: string
  type: CommentType
  status: CommentStatus
  userId: string
  isActive: boolean
}

export interface PatientCommentResponse {
  id: string
  patientId: string
  body: string
  type: CommentType
  status: CommentStatus
  userId: string
  isActive: boolean
}

export interface CreateTreatmentRequest {
  name: string
  description: string
  profile: string | null
  startDate: string
  endDate: string
  type: AttentionType | null
}

export interface CreateTreatmentDetailRequest {
  name: string
  description: string
  profile: string | null
  treatmentDate: string
}

export interface CreateCommentRequest {
  body: string
  type: CommentType
}
