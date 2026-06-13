import { apiClient } from '@/api/client'
import type { SummaryReportResponse, SessionPeriodReportResponse } from '@/types/report.types'

const BASE = '/api/v1/reports'

export const reportsApi = {
  getSummary: () =>
    apiClient.get<SummaryReportResponse>(`${BASE}/summary`).then((r) => r.data),

  getSessionPeriod: (from: string, to: string) =>
    apiClient
      .get<SessionPeriodReportResponse>(`${BASE}/sessions`, { params: { from, to } })
      .then((r) => r.data),
}
