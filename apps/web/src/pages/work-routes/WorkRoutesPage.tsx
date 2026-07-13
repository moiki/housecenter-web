import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFieldArray, useForm } from 'react-hook-form'
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
import { workRouteSchema, type WorkRouteFormData } from '@/schemas/workroute.schema'
import { useWorkRoutes, useCreateWorkRoute, useDeactivateWorkRoute } from '@/hooks/workroutes/useWorkRoutes'
import { useClinics } from '@/hooks/clinics/useClinics'
import { DROPDOWN_PAGE_SIZE } from '@/lib/constants'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FormSection } from '@/components/shared/FormSection'
import { RHFTextField } from '@/components/shared/form'
import { WorkRouteFormFields } from '@/pages/work-routes/WorkRouteFormFields'
import { WorkRouteCalendar } from '@/pages/work-routes/WorkRouteCalendar'
import type { WorkRouteResponse } from '@/types/workroute.types'

const NEW_ROUTE_FORM_ID = 'new-work-route-form'
const EMPTY_DESTINATION = { name: '', description: '', picture: null, googleMapUrl: null }

function WorkRouteForm({ formId, onSubmit }: { formId: string; onSubmit: (data: WorkRouteFormData) => Promise<void> }) {
  // Dropdown needs the full clinic list; capped at the backend's clamp max (100 rows).
  const { data: clinicsData } = useClinics(1, DROPDOWN_PAGE_SIZE)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkRouteFormData>({
    resolver: zodResolver(workRouteSchema),
    defaultValues: {
      routeName: '',
      description: '',
      featuredImage: null,
      clinicId: '',
      destinations: [EMPTY_DESTINATION],
      recurrenceDays: [],
      recurrenceStartDate: '',
      recurrenceEndDate: null,
      isRecurrenceIndefinite: true,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'destinations' })
  const clinicOptions = (clinicsData?.items ?? []).map((c) => ({ value: c.id, label: c.name }))

  return (
    <Box
      component="form"
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}
    >
      <WorkRouteFormFields control={control} isCreate clinicOptions={clinicOptions} />

      <FormSection title="Destinations">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: -0.5 }}>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Stops visited along this route</Typography>
          <Button size="small" startIcon={<AddOutlined />} onClick={() => append(EMPTY_DESTINATION)}>
            Add destination
          </Button>
        </Box>

        {errors.destinations?.root && (
          <Typography color="error" sx={{ fontSize: 12 }}>
            {errors.destinations.root.message}
          </Typography>
        )}

        <Stack spacing={2}>
          {fields.map((f, i) => (
            <Paper key={f.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
                  Destination {i + 1}
                </Typography>
                {fields.length > 1 && (
                  <IconButton size="small" color="error" onClick={() => remove(i)} aria-label="Remove destination">
                    <DeleteOutlineOutlined fontSize="small" />
                  </IconButton>
                )}
              </Box>
              <Stack spacing={2}>
                <RHFTextField control={control} name={`destinations.${i}.name`} label="Name" placeholder="e.g. Community Center" />
                <RHFTextField control={control} name={`destinations.${i}.description`} label="Description" placeholder="Brief description" />
                <RHFTextField control={control} name={`destinations.${i}.googleMapUrl`} label="Google Maps URL (optional)" placeholder="https://maps.google.com/..." />
              </Stack>
            </Paper>
          ))}
        </Stack>
      </FormSection>
    </Box>
  )
}

export function WorkRoutesPage() {
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

  const isCalendar = view === 'calendar'
  const activeLoading = isCalendar ? calendarLoading : isLoading

  const emptyState = (
    <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
      <RouteOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
      <Typography sx={{ mt: 1, fontSize: 14 }}>No work routes yet. Create the first one.</Typography>
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
        title="Work Routes"
        description="Routes assigned to home-visit teams."
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ToggleButtonGroup
              value={view}
              exclusive
              size="small"
              onChange={(_, next: 'calendar' | 'list' | null) => next && setView(next)}
            >
              <ToggleButton value="calendar" aria-label="Calendar view">
                <CalendarMonthOutlined fontSize="small" sx={{ mr: 0.75 }} />
                Calendar
              </ToggleButton>
              <ToggleButton value="list" aria-label="List view">
                <ViewListOutlined fontSize="small" sx={{ mr: 0.75 }} />
                List
              </ToggleButton>
            </ToggleButtonGroup>
            <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setSlideOpen(true)}>
              New Route
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
          />
        )
      ) : !data?.items.length ? (
        emptyState
      ) : (
        <>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Work Routes</Typography>
              <Chip label={data.totalCount} size="small" />
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Route</TableCell>
                    <TableCell>Clinic</TableCell>
                    <TableCell>Recurrence</TableCell>
                    <TableCell>Destinations</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((route) => (
                    <TableRow key={route.id} hover>
                      <TableCell>
                        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{route.routeName}</Typography>
                        <Typography
                          sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {route.description}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{route.clinicName}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {route.recurrenceDays.length === 0 ? (
                          <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Not scheduled</Typography>
                        ) : (
                          <Typography sx={{ fontSize: 12 }}>
                            {route.recurrenceDays.map((d) => d.slice(0, 3)).join(', ')}
                            {route.isRecurrenceIndefinite ? ' · ongoing' : ` · until ${route.recurrenceEndDate}`}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {route.destinations.length} stop{route.destinations.length !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => navigate(`/work-routes/${route.id}`)} aria-label="Edit">
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deactivate">
                          <IconButton size="small" color="error" onClick={() => setToDeactivate(route)} aria-label="Deactivate">
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
                {data.totalCount} work routes — page {data.page} of {data.totalPages}
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
        title="New Work Route"
        description="Assign a route and set its weekly recurrence."
        footer={
          <>
            <Button variant="text" color="inherit" onClick={() => setSlideOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form={NEW_ROUTE_FORM_ID} variant="contained" loading={createRoute.isPending}>
              Create work route
            </Button>
          </>
        }
      >
        <WorkRouteForm formId={NEW_ROUTE_FORM_ID} onSubmit={handleCreate} />
      </SlideOver>

      <ConfirmDialog
        open={!!toDeactivate}
        title="Deactivate work route"
        description={`"${toDeactivate?.routeName}" will be deactivated.`}
        confirmLabel="Deactivate"
        loading={deactivateRoute.isPending}
        onConfirm={handleDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </Box>
  )
}
