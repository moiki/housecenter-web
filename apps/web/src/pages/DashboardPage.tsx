import { Box, Paper, Skeleton, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth.store'
import { useSummaryReport, useSessionPeriodReport } from 'core/hooks/reports/useReports'
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
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { data: summary, isLoading: summaryLoading } = useSummaryReport()

  const { from, to } = getLast8Weeks()
  const { data: period, isLoading: chartLoading } = useSessionPeriodReport(from, to)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return t('dashboard.greeting.morning')
    if (h < 18) return t('dashboard.greeting.afternoon')
    return t('dashboard.greeting.evening')
  })()

  function sessionsByTypeLabel(type: string) {
    if (type === 'Medical') return t('dashboard.sessionsByType.medical')
    if (type === 'EducationalReinforcement') return t('dashboard.sessionsByType.educational')
    return t('dashboard.sessionsByType.fallback', { type })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        title={`${greeting}, ${user?.firstName}`}
        description={t('dashboard.description')}
      />

      {summaryLoading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={96} />
          ))}
        </Box>
      ) : summary ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          <MetricCard
            label={t('dashboard.stats.activePatients')}
            value={summary.activePatients}
            sub={t('dashboard.stats.activePatientsSub', { count: summary.totalPatients })}
            accent
          />
          <MetricCard label={t('dashboard.stats.sessionsThisMonth')} value={summary.sessionsThisMonth} />
          <MetricCard label={t('dashboard.stats.collaborators')} value={summary.collaborators} />
          <MetricCard label={t('dashboard.stats.activeTreatments')} value={summary.activeTreatments} />
          <MetricCard label={t('dashboard.stats.clinics')} value={summary.clinics} />
          <MetricCard label={t('dashboard.stats.workRoutes')} value={summary.workRoutes} />
          {Object.entries(summary.sessionsByAttentionType).map(([type, count]) => (
            <MetricCard key={type} label={sessionsByTypeLabel(type)} value={count} />
          ))}
        </Box>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{t('dashboard.chart.title')}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>
            {t('dashboard.chart.description')}
          </Typography>
        </Box>
        {chartLoading ? (
          <Skeleton variant="rounded" height={192} />
        ) : period ? (
          <SessionsBarChart weeks={period.weeks} />
        ) : (
          <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', py: 6 }}>
            {t('dashboard.chart.empty')}
          </Typography>
        )}
      </Paper>
    </Box>
  )
}
