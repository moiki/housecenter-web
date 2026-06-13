export type AttentionType = 'Medical' | 'EducationalReinforcement'
export type SessionStatus = 'Scheduled' | 'Completed' | 'Missed'

export interface AttentionSessionResponse {
  id: string
  patientId: string
  collaboratorId: string
  collaboratorName: string
  clinicId: string | null
  workRouteId: string | null
  attentionType: AttentionType
  sessionDate: string
  durationMinutes: number | null
  notes: string | null
  status: SessionStatus
  isActive: boolean
}

export interface CreateAttentionSessionRequest {
  collaboratorId: string
  clinicId: string | null
  workRouteId: string | null
  attentionType: AttentionType
  sessionDate: string
  durationMinutes: number | null
  notes: string | null
}

export interface UpdateSessionStatusRequest {
  status: SessionStatus
  durationMinutes: number | null
  notes: string | null
}
