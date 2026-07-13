import { Box, Paper, Skeleton, Typography } from '@mui/material'
import { useAuthStore } from '@/store/auth.store'
import { useSummaryReport, useSessionPeriodReport } from '@/hooks/reports/useReports'
import { PageHeader } from '@/components/shared/PageHeader'
import { SessionsBarChart } from '@/components/shared/SessionsBarChart'

function MetricCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: number | string
  sub?: string
  accent?: boolean
}) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography
        sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 30,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: accent ? 'primary.main' : 'text.primary',
        }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>
      {sub && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{sub}</Typography>
      )}
    </Paper>
  )
}

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]
}

function getLast8Weeks() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 56)
  return { from: toISODate(from), to: toISODate(to) }
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: summary, isLoading: summaryLoading } = useSummaryReport()

  const { from, to } = getLast8Weeks()
  const { data: period, isLoading: chartLoading } = useSessionPeriodReport(from, to)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title={`${greeting}, ${user?.firstName}`}
        description="Here's what's happening across HouseCenter."
      />

      {summaryLoading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={96} />
          ))}
        </Box>
      ) : summary ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          <MetricCard label="Active patients" value={summary.activePatients} sub={`${summary.totalPatients} total`} accent />
          <MetricCard label="Sessions this month" value={summary.sessionsThisMonth} />
          <MetricCard label="Collaborators" value={summary.collaborators} />
          <MetricCard label="Active treatments" value={summary.activeTreatments} />
          <MetricCard label="Clinics" value={summary.clinics} />
          <MetricCard label="Work routes" value={summary.workRoutes} />
          {Object.entries(summary.sessionsByAttentionType).map(([type, count]) => (
            <MetricCard
              key={type}
              label={type === 'EducationalReinforcement' ? 'Educational sessions' : `${type} sessions`}
              value={count}
            />
          ))}
        </Box>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600 }}>Sessions — last 8 weeks</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>
            Weekly breakdown by attention type
          </Typography>
        </Box>
        {chartLoading ? (
          <Skeleton variant="rounded" height={192} />
        ) : period ? (
          <SessionsBarChart weeks={period.weeks} />
        ) : (
          <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', py: 6 }}>
            No session data available.
          </Typography>
        )}
      </Paper>
    </Box>
  )
}
