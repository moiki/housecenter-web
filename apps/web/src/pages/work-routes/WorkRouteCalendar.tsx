import { useMemo, useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'
import { Box, Button, Chip, IconButton, Paper, Tooltip, Typography } from '@mui/material'
import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined'
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined'
import AddOutlined from '@mui/icons-material/AddOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import { expandOccurrences } from 'core/lib/recurrence'
import type { WorkRouteResponse, Weekday } from 'core/types/workroute.types'

// Grid weeks start on Sunday (dayjs' default `startOf('week')`), so the header order
// mirrors that — translated via `workRoutes.weekday.*` and sliced to 3 chars, same
// treatment as the recurrence-days list on WorkRoutesPage.
const WEEKDAY_ORDER: Weekday[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface Props {
  routes: WorkRouteResponse[]
  onDayClick?: (isoDate: string) => void
  onRouteClick?: (route: WorkRouteResponse) => void
  onViewDay?: (isoDate: string, dayRoutes: WorkRouteResponse[]) => void
}

// Custom month grid (not MUI-X DateCalendar — that's a single-select picker with no
// room for N chips/day). dayjs is used for date math only, never for rendering "now"
// outside of the initial cursor / today-highlight (both fine — the purity rule only
// bans `Date.now()`/`new Date()`, not dayjs()); the actual occurrence expansion stays
// a pure function fed explicit date-string bounds (src/lib/recurrence.ts).
export function WorkRouteCalendar({ routes, onDayClick, onRouteClick, onViewDay }: Props) {
  const { t } = useTranslation()
  const [cursor, setCursor] = useState<Dayjs>(() => dayjs().startOf('month'))
  const today = dayjs()
  const weekdayHeaders = WEEKDAY_ORDER.map((d) => t(`workRoutes.weekday.${d}`).slice(0, 3))

  const gridStart = cursor.startOf('month').startOf('week')
  const gridEnd = cursor.endOf('month').endOf('week')

  const occurrences = useMemo(
    () => expandOccurrences(routes, gridStart.format('YYYY-MM-DD'), gridEnd.format('YYYY-MM-DD')),
    [routes, gridStart, gridEnd],
  )

  const days: Dayjs[] = []
  for (let d = gridStart; !d.isAfter(gridEnd, 'day'); d = d.add(1, 'day')) {
    days.push(d)
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{cursor.format('MMMM YYYY')}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Button size="small" onClick={() => setCursor(dayjs().startOf('month'))}>
            {t('workRoutes.calendar.today')}
          </Button>
          <IconButton size="small" onClick={() => setCursor((c) => c.subtract(1, 'month'))} aria-label={t('workRoutes.calendar.previousMonth')}>
            <ChevronLeftOutlined fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => setCursor((c) => c.add(1, 'month'))} aria-label={t('workRoutes.calendar.nextMonth')}>
            <ChevronRightOutlined fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: 1, borderColor: 'divider' }}>
        {weekdayHeaders.map((h) => (
          <Box key={h} sx={{ py: 1, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {h}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((d) => {
          const iso = d.format('YYYY-MM-DD')
          const isCurrentMonth = d.isSame(cursor, 'month')
          const isToday = d.isSame(today, 'day')
          const dayRoutes = occurrences.get(iso) ?? []

          return (
            <Box
              key={iso}
              sx={{
                minHeight: 92,
                p: 0.75,
                borderRight: 1,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: isCurrentMonth ? 'transparent' : 'action.hover',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                // The cell itself is no longer clickable — only the Add button (below) adds a
                // route on this day. Hover still reveals the action buttons.
                '&:hover .day-actions': { opacity: 1 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: isToday ? 'primary.main' : 'transparent',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? 'primary.contrastText' : isCurrentMonth ? 'text.primary' : 'text.disabled',
                    }}
                  >
                    {d.date()}
                  </Typography>
                </Box>

                {/* Hidden until the cell is hovered (className targeted by the cell's own
                    sx below) so the day grid doesn't look cluttered with 42 pairs of icons
                    at rest. */}
                <Box className="day-actions" sx={{ display: 'flex', gap: 0.25, opacity: 0, transition: 'opacity 120ms' }}>
                  <Tooltip title={t('workRoutes.calendar.addRouteTooltip')}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDayClick?.(iso)
                      }}
                      aria-label={t('workRoutes.calendar.addRouteAriaLabel', { date: iso })}
                      sx={{ p: 0.25, color: 'success.main', '&:hover': { bgcolor: 'success.main', color: 'success.contrastText' } }}
                    >
                      <AddOutlined sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  {dayRoutes.length > 0 && (
                    <Tooltip title={t('workRoutes.calendar.viewProgressTooltip')}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewDay?.(iso, dayRoutes)
                        }}
                        aria-label={t('workRoutes.calendar.viewProgressAriaLabel', { date: iso })}
                        sx={{ p: 0.25, color: 'primary.main', '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' } }}
                      >
                        <VisibilityOutlined sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                {dayRoutes.map((r) => (
                  <Chip
                    key={r.id}
                    label={r.routeName}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRouteClick?.(r)
                    }}
                    sx={{
                      fontSize: 11,
                      height: 20,
                      justifyContent: 'flex-start',
                      '& .MuiChip-label': { px: 0.75, overflow: 'hidden', textOverflow: 'ellipsis' },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )
        })}
      </Box>
    </Paper>
  )
}
