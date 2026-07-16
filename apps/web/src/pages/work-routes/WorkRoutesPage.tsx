import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  Chip,
  IconButton,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import AddOutlined from '@mui/icons-material/AddOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import RouteOutlined from '@mui/icons-material/RouteOutlined'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import ViewListOutlined from '@mui/icons-material/ViewListOutlined'
import { workRouteSchema, type WorkRouteFormData } from 'core/schemas/workroute.schema'
import { useWorkRoutes, useCreateWorkRoute, useDeactivateWorkRoute } from 'core/hooks/workroutes/useWorkRoutes'
import { useClinics } from 'core/hooks/clinics/useClinics'
import { DROPDOWN_PAGE_SIZE } from 'core/lib/constants'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowLink } from '@/components/shared/RowLink'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { WorkRouteFormFields } from '@/pages/work-routes/WorkRouteFormFields'
import { WorkRouteCalendar } from '@/pages/work-routes/WorkRouteCalendar'
import { DayProgressModal } from '@/pages/work-routes/DayProgressModal'
import type { WorkRouteResponse } from 'core/types/workroute.types'

const NEW_ROUTE_FORM_ID = 'new-work-route-form'

// Stops are no longer entered here — they're derived from patients assigned to this
// route (each patient's own "Work route" field, on the Patients page). This form only
// covers the route itself: name, clinic, recurrence.
function WorkRouteForm({ formId, onSubmit }: { formId: string; onSubmit: (data: WorkRouteFormData) => Promise<void> }) {
  // Dropdown needs the full clinic list; capped at the backend's clamp max (100 rows).
  const { data: clinicsData } = useClinics(1, DROPDOWN_PAGE_SIZE)

  const { control, handleSubmit } = useForm<WorkRouteFormData>({
    resolver: zodResolver(workRouteSchema),
    defaultValues: {
      routeName: '',
      description: '',
      featuredImage: null,
      clinicId: '',
      recurrenceDays: [],
      recurrenceStartDate: '',
      recurrenceEndDate: null,
      isRecurrenceIndefinite: true,
    },
  })

  const clinicOptions = (clinicsData?.items ?? []).map((c) => ({ value: c.id, label: c.name }))

  return (
    <Box
      component="form"
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}
    >
      <WorkRouteFormFields control={control} isCreate clinicOptions={clinicOptions} />
    </Box>
  )
}

export function WorkRoutesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useWorkRoutes(page)
  // Calendar view needs every route in the visible range, not just one paginated page,
  // so it gets its own full-list fetch (capped at the backend clamp max, 100). The List
  // view stays server-paginated via `data` above.
  const { data: calendarData, isLoading: calendarLoading } = useWorkRoutes(1, DROPDOWN_PAGE_SIZE)
  const createRoute = useCreateWorkRoute()
  const deactivateRoute = useDeactivateWorkRoute()

  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [slideOpen, setSlideOpen] = useState(false)
  const [toDeactivate, setToDeactivate] = useState<WorkRouteResponse | null>(null)
  const [progressDay, setProgressDay] = useState<{ iso: string; routes: WorkRouteResponse[] } | null>(null)

  const isCalendar = view === 'calendar'
  const activeLoading = isCalendar ? calendarLoading : isLoading

  const emptyState = (
    <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
      <RouteOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
      <Typography sx={{ mt: 1, fontSize: 14 }}>{t('workRoutes.empty')}</Typography>
    </Paper>
  )

  const handleCreate = async (data: WorkRouteFormData) => {
    await createRoute.mutateAsync(data)
    setSlideOpen(false)
  }

  const handleDeactivate = async () => {
    if (!toDeactivate) return
    await deactivateRoute.mutateAsync(toDeactivate.id)
    setToDeactivate(null)
  }

  return (
    <Box>
      <PageHeader
        title={t('workRoutes.title')}
        description={t('workRoutes.description')}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ToggleButtonGroup
              value={view}
              exclusive
              size="small"
              onChange={(_, next: 'calendar' | 'list' | null) => next && setView(next)}
            >
              <ToggleButton value="calendar" aria-label={t('workRoutes.view.calendarAriaLabel')}>
                <CalendarMonthOutlined fontSize="small" sx={{ mr: 0.75 }} />
                {t('workRoutes.view.calendar')}
              </ToggleButton>
              <ToggleButton value="list" aria-label={t('workRoutes.view.listAriaLabel')}>
                <ViewListOutlined fontSize="small" sx={{ mr: 0.75 }} />
                {t('workRoutes.view.list')}
              </ToggleButton>
            </ToggleButtonGroup>
            <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setSlideOpen(true)}>
              {t('workRoutes.newRouteButton')}
            </Button>
          </Box>
        }
      />

      {activeLoading ? (
        <Stack spacing={1.5}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : isCalendar ? (
        !calendarData?.items.length ? (
          emptyState
        ) : (
          <WorkRouteCalendar
            routes={calendarData.items}
            onDayClick={() => setSlideOpen(true)}
            onRouteClick={(route) => navigate(`/work-routes/${route.id}`)}
            onViewDay={(iso, dayRoutes) => setProgressDay({ iso, routes: dayRoutes })}
          />
        )
      ) : !data?.items.length ? (
        emptyState
      ) : (
        <>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{t('workRoutes.title')}</Typography>
              <Chip label={data.totalCount} size="small" />
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('workRoutes.table.route')}</TableCell>
                    <TableCell>{t('workRoutes.table.clinic')}</TableCell>
                    <TableCell>{t('workRoutes.table.recurrence')}</TableCell>
                    <TableCell>{t('workRoutes.table.patients')}</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((route) => (
                    <TableRow key={route.id} hover>
                      <TableCell>
                        <RowLink
                          onClick={() => navigate(`/work-routes/${route.id}`)}
                          aria-label={`${t('common.actions.view')} ${route.routeName}`}
                        >
                          <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{route.routeName}</Typography>
                          <Typography
                            sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {route.description}
                          </Typography>
                        </RowLink>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{route.clinicName}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {route.recurrenceDays.length === 0 ? (
                          <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{t('workRoutes.recurrence.notScheduled')}</Typography>
                        ) : (
                          <Typography sx={{ fontSize: 12 }}>
                            {route.recurrenceDays.map((d) => t(`workRoutes.weekday.${d}`).slice(0, 3)).join(', ')}
                            {route.isRecurrenceIndefinite
                              ? ` · ${t('workRoutes.recurrence.ongoing')}`
                              : ` · ${t('workRoutes.recurrence.until', { date: route.recurrenceEndDate })}`}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {t('workRoutes.table.patientsCount', { count: route.stops.length })}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('common.actions.edit')}>
                          <IconButton size="small" onClick={() => navigate(`/work-routes/${route.id}`)} aria-label={t('common.actions.edit')}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.actions.deactivate')}>
                          <IconButton size="small" color="error" onClick={() => setToDeactivate(route)} aria-label={t('common.actions.deactivate')}>
                            <DeleteOutlineOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {data.totalPages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {t('workRoutes.pageSummary', { count: data.totalCount, page: data.page, totalPages: data.totalPages })}
              </Typography>
              <Pagination
                count={data.totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                size="small"
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={t('workRoutes.newRouteDialog.title')}
        description={t('workRoutes.newRouteDialog.description')}
        footer={
          <>
            <Button variant="text" color="inherit" onClick={() => setSlideOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" form={NEW_ROUTE_FORM_ID} variant="contained" loading={createRoute.isPending}>
              {t('workRoutes.newRouteDialog.createButton')}
            </Button>
          </>
        }
      >
        <WorkRouteForm formId={NEW_ROUTE_FORM_ID} onSubmit={handleCreate} />
      </SlideOver>

      <ConfirmDialog
        open={!!toDeactivate}
        title={t('workRoutes.confirmDeactivate.title')}
        description={t('workRoutes.confirmDeactivate.description', { name: toDeactivate?.routeName })}
        confirmLabel={t('common.actions.deactivate')}
        loading={deactivateRoute.isPending}
        onConfirm={handleDeactivate}
        onCancel={() => setToDeactivate(null)}
      />

      <DayProgressModal
        open={!!progressDay}
        date={progressDay?.iso ?? null}
        routes={progressDay?.routes ?? []}
        onClose={() => setProgressDay(null)}
        onRouteClick={(route) => {
          setProgressDay(null)
          navigate(`/work-routes/${route.id}`)
        }}
        onPatientClick={(patientId) => {
          setProgressDay(null)
          navigate(`/patients/${patientId}`)
        }}
      />
    </Box>
  )
}
