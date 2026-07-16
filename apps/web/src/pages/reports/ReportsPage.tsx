import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Chip, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { useSessionPeriodReport } from 'core/hooks/reports/useReports'
import { PageHeader } from '@/components/shared/PageHeader'
import { SessionsBarChart } from '@/components/shared/SessionsBarChart'

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]
}

const PRESETS = [
  { key: 'last4Weeks', days: 28 },
  { key: 'last8Weeks', days: 56 },
  { key: 'last3Months', days: 91 },
  { key: 'last6Months', days: 182 },
] as const

export function ReportsPage() {
  const { t } = useTranslation()
  const [preset, setPreset] = useState(1) // default: last 8 weeks

  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - PRESETS[preset].days)

  const fromStr = toISODate(from)
  const toStr = toISODate(to)

  const { data, isLoading } = useSessionPeriodReport(fromStr, toStr)

  const byCollaborator = data?.sessionsByCollaborator
    ? Object.entries(data.sessionsByCollaborator).sort(([, a], [, b]) => b - a)
    : []

  return (
    <Box>
      <PageHeader title={t('reports.title')} description={t('reports.description')} />

      <Stack spacing={3}>
        {/* Period selector */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {PRESETS.map((p, i) => (
            <Button
              key={p.key}
              size="small"
              variant={preset === i ? 'contained' : 'outlined'}
              onClick={() => setPreset(i)}
            >
              {t(`reports.presets.${p.key}`)}
            </Button>
          ))}
        </Box>

        {/* Sessions chart */}
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{t('reports.sessionsOverTime.title')}</Typography>
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mt: 0.25 }}>
              {from.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              {' — '}
              {to.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </Typography>
          </Box>
          {isLoading ? (
            <Skeleton variant="rounded" height={192} />
          ) : data ? (
            <SessionsBarChart weeks={data.weeks} />
          ) : null}
        </Paper>

        {/* Sessions by collaborator (Admin/Owner only) */}
        {byCollaborator.length > 0 && (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{t('reports.byCollaborator.title')}</Typography>
              <Chip label={byCollaborator.length} size="small" />
            </Box>
            {byCollaborator.map(([name, count], i) => (
              <Box
                key={name}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderTop: i === 0 ? 0 : 1, borderColor: 'divider' }}
              >
                <Typography sx={{ fontSize: 14 }}>{name}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{count}</Typography>
              </Box>
            ))}
          </Paper>
        )}
      </Stack>
    </Box>
  )
}
