import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, IconButton, Paper, Skeleton, Stack, Typography } from '@mui/material'
import AddOutlined from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import { updateWorkRouteSchema, type UpdateWorkRouteFormData } from '@/schemas/workroute.schema'
import { useWorkRoute, useUpdateWorkRoute } from '@/hooks/workroutes/useWorkRoutes'
import { PageHeader } from '@/components/shared/PageHeader'
import { RHFTextField } from '@/components/shared/form'

const EMPTY_DESTINATION = { name: '', description: '', picture: null, googleMapUrl: null }

function DestinationsEditor({ routeId }: { routeId: string }) {
  const { data: route } = useWorkRoute(routeId)
  const updateRoute = useUpdateWorkRoute(routeId)
  const [saved, setSaved] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<UpdateWorkRouteFormData>({
    resolver: zodResolver(updateWorkRouteSchema),
    values: route
      ? {
          routeName: route.routeName,
          description: route.description,
          featuredImage: route.featuredImage,
          destinations: route.destinations,
        }
      : undefined,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'destinations' })

  const onSubmit = async (data: UpdateWorkRouteFormData) => {
    await updateRoute.mutateAsync(data)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <RHFTextField control={control} name="routeName" label="Route name" />
        <RHFTextField control={control} name="featuredImage" label="Featured image URL (optional)" placeholder="https://..." />
      </Box>
      <RHFTextField control={control} name="description" label="Description" multiline rows={2} />

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Destination Points</Typography>
          <Button size="small" startIcon={<AddOutlined />} onClick={() => append(EMPTY_DESTINATION)}>
            Add destination
          </Button>
        </Box>

        {fields.length === 0 && (
          <Typography color="text.secondary" sx={{ fontSize: 13, textAlign: 'center', py: 2 }}>
            No destinations yet. Add the first stop.
          </Typography>
        )}

        <Stack spacing={2}>
          {fields.map((f, i) => (
            <Paper key={f.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
                  Stop #{i + 1}
                </Typography>
                <IconButton size="small" color="error" onClick={() => remove(i)} aria-label="Remove destination">
                  <DeleteOutlineOutlined fontSize="small" />
                </IconButton>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <RHFTextField control={control} name={`destinations.${i}.name`} label="Name" placeholder="Location name" />
                <RHFTextField control={control} name={`destinations.${i}.googleMapUrl`} label="Google Maps URL (optional)" placeholder="https://maps.google.com/..." />
              </Box>
              <RHFTextField control={control} name={`destinations.${i}.description`} label="Description" placeholder="Brief description of this stop" />
            </Paper>
          ))}
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button type="submit" variant="contained" disabled={!isDirty} loading={isSubmitting}>
          Save changes
        </Button>
        {saved && (
          <Typography color="success.main" sx={{ fontSize: 14, fontWeight: 500 }}>
            Saved!
          </Typography>
        )}
      </Box>
    </Box>
  )
}

export function WorkRouteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: route, isLoading } = useWorkRoute(id!)

  return (
    <Box>
      <PageHeader title={route?.routeName ?? 'Work Route'} description={route ? `Clinic: ${route.clinicName}` : ''} />

      {isLoading ? (
        <Stack spacing={1.5}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={48} />
          ))}
        </Stack>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          {id && <DestinationsEditor routeId={id} />}
        </Paper>
      )}
    </Box>
  )
}
