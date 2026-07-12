import { useQuery } from '@tanstack/react-query'
import { reportsApi } from 'core/api/modules/reports.api'

const keys = {
  summary: () => ['reports', 'summary'] as const,
  period: (from: string, to: string) => ['reports', 'period', from, to] as const,
}

export function useSummaryReport() {
  return useQuery({
    queryKey: keys.summary(),
    queryFn: reportsApi.getSummary,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSessionPeriodReport(from: string, to: string) {
  return useQuery({
    queryKey: keys.period(from, to),
    queryFn: () => reportsApi.getSessionPeriod(from, to),
    enabled: !!from && !!to,
    staleTime: 5 * 60 * 1000,
  })
}
