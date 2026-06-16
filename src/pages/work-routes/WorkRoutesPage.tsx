import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import AddOutlined from '@mui/icons-material/AddOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import RouteOutlined from '@mui/icons-material/RouteOutlined'
import { workRouteSchema, type WorkRouteFormData } from '@/schemas/workroute.schema'
import { useWorkRoutes, useCreateWorkRoute, useDeactivateWorkRoute } from '@/hooks/workroutes/useWorkRoutes'
import { useClinics } from '@/hooks/clinics/useClinics'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RHFTextField, RHFSelect } from '@/components/shared/form'
import type { WorkRouteResponse } from '@/types/workroute.types'

const EMPTY_DESTINATION = { name: '', description: '', picture: null, googleMapUrl: null }

function WorkRouteForm({ onSubmit }: { onSubmit: (data: WorkRouteFormData) => Promise<void> }) {
  const { data: clinics } = useClinics()

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WorkRouteFormData>({
    resolver: zodResolver(workRouteSchema),
    defaultValues: {
      routeName: '',
      description: '',
      featuredImage: null,
      clinicId: '',
      destinations: [EMPTY_DESTINATION],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'destinations' })
  const clinicOptions = (clinics ?? []).map((c) => ({ value: c.id, label: c.name }))

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
    >
      <RHFTextField control={control} name="routeName" label="Route name" placeholder="e.g. North District" />
      <RHFTextField control={control} name="description" label="Description" placeholder="Brief description of this route" multiline rows={2} />
      <RHFSelect control={control} name="clinicId" label="Clinic" options={clinicOptions} />
      <RHFTextField control={control} name="featuredImage" label="Featured image URL (optional)" placeholder="https://..." />

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Destinations</Typography>
          <Button size="small" startIcon={<AddOutlined />} onClick={() => append(EMPTY_DESTINATION)}>
            Add destination
          </Button>
        </Box>

        {errors.destinations?.root && (
          <Typography color="error" sx={{ fontSize: 12, mb: 1 }}>
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
      </Box>

      <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
        Create work route
      </Button>
    </Box>
  )
}

export function WorkRoutesPage() {
  const navigate = useNavigate()
  const { data: routes, isLoading } = useWorkRoutes()
  const createRoute = useCreateWorkRoute()
  const deactivateRoute = useDeactivateWorkRoute()

  const [slideOpen, setSlideOpen] = useState(false)
  const [toDeactivate, setToDeactivate] = useState<WorkRouteResponse | null>(null)

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
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setSlideOpen(true)}>
            New Route
          </Button>
        }
      />

      {isLoading ? (
        <Stack spacing={1.5}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : !routes?.length ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <RouteOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>No work routes yet. Create the first one.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Work Routes</Typography>
            <Chip label={routes.length} size="small" />
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Route</TableCell>
                  <TableCell>Clinic</TableCell>
                  <TableCell>Destinations</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {routes.map((route) => (
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
      )}

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title="New Work Route">
        <WorkRouteForm onSubmit={handleCreate} />
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
