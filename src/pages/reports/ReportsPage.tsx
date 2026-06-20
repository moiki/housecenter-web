import { useState } from 'react'
import { Box, Button, Chip, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { useSessionPeriodReport } from '@/hooks/reports/useReports'
import { PageHeader } from '@/components/shared/PageHeader'
import { SessionsBarChart } from '@/components/shared/SessionsBarChart'

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]
}

const PRESETS = [
  { label: 'Last 4 weeks', days: 28 },
  { label: 'Last 8 weeks', days: 56 },
  { label: 'Last 3 months', days: 91 },
  { label: 'Last 6 months', days: 182 },
]

export function ReportsPage() {
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
      <PageHeader title="Reports" description="Session activity and performance metrics." />

      <Stack spacing={3}>
        {/* Period selector */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {PRESETS.map((p, i) => (
            <Button
              key={p.label}
              size="small"
              variant={preset === i ? 'contained' : 'outlined'}
              onClick={() => setPreset(i)}
            >
              {p.label}
            </Button>
          ))}
        </Box>

        {/* Sessions chart */}
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 600 }}>Sessions over time</Typography>
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
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Sessions by collaborator</Typography>
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
