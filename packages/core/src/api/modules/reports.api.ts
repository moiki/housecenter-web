import { getApiClient } from 'core/api/http/registry'
import type { SummaryReportResponse, SessionPeriodReportResponse } from 'core/types/report.types'

const BASE = '/reports'

export const reportsApi = {
  getSummary: () =>
    getApiClient().get<SummaryReportResponse>(`${BASE}/summary`).then((r) => r.data),

  getSessionPeriod: (from: string, to: string) =>
    getApiClient()
      .get<SessionPeriodReportResponse>(`${BASE}/sessions`, { params: { from, to } })
      .then((r) => r.data),
}
