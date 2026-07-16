import dayjs, { type Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Tooltip, Typography, useTheme } from '@mui/material'
import { keyframes } from '@mui/material/styles'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import LocationOn from '@mui/icons-material/LocationOn'
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined'
import type { WorkRouteResponse, WorkRouteStopDto } from 'core/types/workroute.types'

interface Props {
  open: boolean
  date: string | null // 'YYYY-MM-DD'
  routes: WorkRouteResponse[] // this day's route occurrences, each carrying its own .stops
  onClose: () => void
  onRouteClick: (route: WorkRouteResponse) => void
  onPatientClick: (patientId: string) => void
}

type StopStatus = 'completed' | 'upcoming'

// A day can have several independent routes running at once (different teams/times) — each
// is its own "lane" with its own map-style waypoint path below, rather than mixing every
// route's stops into one line. A route's stops ARE its patients (Patient.workRouteId +
// Patient.routeVisitTime) — a real relationship, not an inferred one. A stop with no
// visitTime set yet (nobody's entered one) is treated as "upcoming" unless the whole day
// has already passed, since there's nothing to compare against the clock.
function stopStatus(date: Dayjs, visitTime: string | null, now: Dayjs): StopStatus {
  if (date.isBefore(now, 'day')) return 'completed'
  if (date.isAfter(now, 'day')) return 'upcoming'
  if (!visitTime) return 'upcoming'
  const [h, m] = visitTime.split(':').map(Number)
  return now.isAfter(date.hour(h).minute(m).second(0)) ? 'completed' : 'upcoming'
}

// Map-style waypoint layout: points alternate between a top and bottom row (a simple
// winding "road") instead of sitting on one straight line. No real geo-coordinates exist
// for patients/routes, so this is a deliberately abstract route path, not an actual map.
const STEP_X = 110
const PAD_X = 34
const TOP_Y = 34
const BOTTOM_Y = 74
const SVG_HEIGHT = 130
const ICON_SIZE = 26
const LABEL_WIDTH = 100

function pointFor(i: number) {
  return { x: PAD_X + i * STEP_X, y: i % 2 === 0 ? TOP_Y : BOTTOM_Y }
}

// Symmetric S-curve between two waypoints — reads as a curved road rather than a
// straight connector between the zig-zagging points.
function curvePath(p0: { x: number; y: number }, p1: { x: number; y: number }) {
  const midX = (p0.x + p1.x) / 2
  return `M ${p0.x} ${p0.y} C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`
}

// `pathLength={1}` normalizes the path to length 1 regardless of its real geometry, so
// a dasharray/dashoffset of exactly 1 is "one full dash" — offset 1 hides it completely
// (shifted a full cycle past the path start), offset 0 reveals all of it. Animating
// dashoffset 1 -> 0 is the standard SVG "line drawing itself in" technique.
const routeDraw = keyframes`
  to { stroke-dashoffset: 0; }
`
const markerIn = keyframes`
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
`

interface LaneProps {
  route: WorkRouteResponse
  date: Dayjs
  now: Dayjs
  onRouteClick: (route: WorkRouteResponse) => void
  onPatientClick: (patientId: string) => void
}

function RouteLane({ route, date, now, onRouteClick, onPatientClick }: LaneProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const stops = route.stops
  const statuses = stops.map((s) => stopStatus(date, s.visitTime, now))
  const completedCount = statuses.filter((s) => s === 'completed').length
  const svgWidth = PAD_X * 2 + STEP_X * Math.max(stops.length - 1, 0)
  const statusLabel = (status: StopStatus) =>
    status === 'completed' ? t('workRoutes.dayProgress.status.completed') : t('workRoutes.dayProgress.status.upcoming')

  return (
    <Box sx={{ mb: 3, '&:last-child': { mb: 0 } }}>
      <Box
        role="button"
        tabIndex={0}
        onClick={() => onRouteClick(route)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onRouteClick(route)
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 1,
          width: 'fit-content',
          cursor: 'pointer',
          borderRadius: 0.5,
          '&:hover': { textDecoration: 'underline' },
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{route.routeName}</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          {stops.length === 0
            ? t('workRoutes.dayProgress.noPatientsAssigned')
            : t('workRoutes.dayProgress.visitsCompleted', { completed: completedCount, total: stops.length })}
        </Typography>
      </Box>

      {stops.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', py: 1.5 }}>
          {t('workRoutes.dayProgress.assignPatientsHint')}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', py: 2 }}>
          <Box sx={{ position: 'relative', width: svgWidth, height: SVG_HEIGHT, flexShrink: 0 }}>
            <svg width={svgWidth} height={SVG_HEIGHT} aria-hidden style={{ position: 'absolute', inset: 0 }}>
              {stops.slice(0, -1).map((_, i) => (
                <path
                  key={`road-${i}`}
                  d={curvePath(pointFor(i), pointFor(i + 1))}
                  fill="none"
                  stroke={theme.palette.divider}
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                />
              ))}
              {stops.slice(0, -1).map((_, i) =>
                statuses[i] === 'completed' ? (
                  <path
                    key={`traveled-${i}`}
                    d={curvePath(pointFor(i), pointFor(i + 1))}
                    fill="none"
                    stroke={theme.palette.success.main}
                    strokeWidth={3}
                    strokeLinecap="round"
                    pathLength={1}
                    style={{
                      strokeDasharray: 1,
                      strokeDashoffset: 1,
                      animation: `${routeDraw} 550ms ease-out ${i * 300}ms forwards`,
                    }}
                  />
                ) : null,
              )}
            </svg>

            {/* Icon and label are positioned with plain left/top pixel math (not
                `transform`), so `transform` stays free for the entrance animation and
                the hover scale below without either one clobbering a centering offset. */}
            {stops.map((stop: WorkRouteStopDto, i) => {
              const { x, y } = pointFor(i)
              const status = statuses[i]
              const Icon = status === 'completed' ? LocationOn : LocationOnOutlined
              return (
                <Tooltip
                  key={stop.patientId}
                  title={`${stop.patientName} — ${statusLabel(status)}${stop.visitTime ? ` (${stop.visitTime.slice(0, 5)})` : ''}`}
                >
                  <Box
                    role="button"
                    tabIndex={0}
                    aria-label={`${stop.patientName} — ${statusLabel(status)}`}
                    onClick={() => onPatientClick(stop.patientId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onPatientClick(stop.patientId)
                      }
                    }}
                    sx={{
                      position: 'absolute',
                      left: x - ICON_SIZE / 2,
                      top: y - ICON_SIZE,
                      width: ICON_SIZE,
                      height: ICON_SIZE,
                      display: 'flex',
                      cursor: 'pointer',
                      borderRadius: '50%',
                      opacity: 0,
                      animation: `${markerIn} 350ms ease-out ${i * 300}ms forwards`,
                      transition: 'transform 120ms ease',
                      '&:hover': { transform: 'scale(1.15)' },
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                    }}
                  >
                    <Icon color={status === 'completed' ? 'success' : 'disabled'} sx={{ fontSize: ICON_SIZE }} />
                    <Box
                      sx={{
                        position: 'absolute',
                        left: ICON_SIZE / 2 - LABEL_WIDTH / 2,
                        top: ICON_SIZE + 8,
                        width: LABEL_WIDTH,
                        textAlign: 'center',
                      }}
                    >
                      <Typography sx={{ fontSize: 12, fontWeight: 500 }} noWrap>
                        {stop.patientName}
                      </Typography>
                      <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                        {stop.visitTime ? stop.visitTime.slice(0, 5) : t('workRoutes.detail.noVisitTime')}
                      </Typography>
                    </Box>
                  </Box>
                </Tooltip>
              )
            })}
          </Box>
        </Box>
      )}
    </Box>
  )
}

export function DayProgressModal({ open, date, routes, onClose, onRouteClick, onPatientClick }: Props) {
  const { t } = useTranslation()
  const parsedDate = date ? dayjs(date) : null
  const now = dayjs()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{parsedDate?.format('dddd, MMMM D, YYYY')}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>
            {routes.length === 0
              ? t('workRoutes.dayProgress.emptyDay')
              : t('workRoutes.dayProgress.routesScheduledCount', { count: routes.length })}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label={t('common.actions.close')}>
          <CloseOutlined fontSize="small" />
        </IconButton>
      </DialogTitle>

      {routes.length > 0 && parsedDate && (
        <DialogContent sx={{ pt: 1 }}>
          {routes.map((route) => (
            <RouteLane
              key={route.id}
              route={route}
              date={parsedDate}
              now={now}
              onRouteClick={onRouteClick}
              onPatientClick={onPatientClick}
            />
          ))}
        </DialogContent>
      )}
    </Dialog>
  )
}
