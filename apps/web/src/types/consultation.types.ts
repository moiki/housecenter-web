export type ConsultationStatus = 'Open' | 'UnderReview' | 'Resolved'

export interface ConsultationResponse {
  id: string
  patientId: string
  treatmentId: string | null
  openedByUserId: string
  assignedDoctorId: string
  title: string
  status: ConsultationStatus
  resolvedAt: string | null
  isActive: boolean
}

export interface ConsultationMessageResponse {
  id: string
  consultationId: string
  authorId: string
  authorName: string
  body: string
  attachmentUrl: string | null
  createdDate: string
}

export interface ConsultationDetailResponse {
  consultation: ConsultationResponse
  messages: ConsultationMessageResponse[]
}

export interface CreateConsultationRequest {
  patientId: string
  treatmentId: string | null
  assignedDoctorId: string
  title: string
  firstMessage: string
  attachmentUrl: string | null
}

export interface PostMessageRequest {
  body: string
  attachmentUrl: string | null
}

export interface UpdateConsultationStatusRequest {
  status: ConsultationStatus
}
