export interface SummaryReportResponse {
  totalPatients: number
  activePatients: number
  sessionsThisMonth: number
  collaborators: number
  clinics: number
  workRoutes: number
  activeTreatments: number
  sessionsByAttentionType: Record<string, number>
}

export interface WeeklySessionBucket {
  weekStart: string
  attentionType: string
  status: string
  count: number
}

export interface SessionPeriodReportResponse {
  from: string
  to: string
  weeks: WeeklySessionBucket[]
  sessionsByCollaborator: Record<string, number> | null
}
