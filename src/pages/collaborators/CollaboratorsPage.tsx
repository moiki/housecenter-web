import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Avatar,
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
  Tooltip,
  Typography,
} from '@mui/material'
import AddOutlined from '@mui/icons-material/AddOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import WorkOutlined from '@mui/icons-material/WorkOutlined'
import { collaboratorSchema, type CollaboratorFormData } from '@/schemas/collaborator.schema'
import {
  useCollaborators,
  useCreateCollaborator,
  useUpdateCollaborator,
  useDeactivateCollaborator,
} from '@/hooks/collaborators/useCollaborators'
import { useClinics } from '@/hooks/clinics/useClinics'
import { useWorkRoutes } from '@/hooks/workroutes/useWorkRoutes'
import { DROPDOWN_PAGE_SIZE } from '@/lib/constants'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RHFTextField, RHFSelect } from '@/components/shared/form'
import type { CollaboratorResponse } from '@/types/collaborator.types'

function CollaboratorForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: CollaboratorResponse
  onSubmit: (data: CollaboratorFormData) => Promise<void>
  submitLabel: string
}) {
  // Dropdowns need the full list; capped at the backend's clamp max (100 rows).
  const { data: clinicsData } = useClinics(1, DROPDOWN_PAGE_SIZE)
  const { data: routesData } = useWorkRoutes(1, DROPDOWN_PAGE_SIZE)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CollaboratorFormData>({
    resolver: zodResolver(collaboratorSchema),
    defaultValues: defaultValues
      ? {
          firstName: defaultValues.firstName,
          lastName: defaultValues.lastName,
          email: defaultValues.email,
          phoneNumber: defaultValues.phoneNumber,
          address: defaultValues.address,
          country: defaultValues.country,
          state: defaultValues.state,
          city: defaultValues.city,
          profilePicture: defaultValues.profilePicture,
          clinicId: defaultValues.clinicId,
          workRouteId: defaultValues.workRouteId,
          positions: defaultValues.positions.map((p) => p.name),
        }
      : {
          firstName: '', lastName: '', email: '', phoneNumber: '',
          address: '', country: null, state: null, city: null,
          profilePicture: null, clinicId: '', workRouteId: null,
          positions: [''],
        },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    // @ts-expect-error positions is string[]; useFieldArray expects object[]
    name: 'positions',
  })

  const clinicOptions = (clinicsData?.items ?? []).map((c) => ({ value: c.id, label: c.name }))
  // Empty-string option => Zod transforms '' -> null (replaces the legacy '__none__' sentinel).
  const routeOptions = [
    { value: '', label: 'No route assigned' },
    ...(routesData?.items ?? []).map((r) => ({ value: r.id, label: r.routeName })),
  ]

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <RHFTextField control={control} name="firstName" label="First name" placeholder="Jane" />
        <RHFTextField control={control} name="lastName" label="Last name" placeholder="Smith" />
      </Box>

      <RHFTextField control={control} name="email" label="Email" type="email" placeholder="jane@example.com" />
      <RHFTextField control={control} name="phoneNumber" label="Phone" placeholder="+1 555 0000" />
      <RHFTextField control={control} name="address" label="Address" placeholder="Full address" />

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
        <RHFTextField control={control} name="country" label="Country" placeholder="US" />
        <RHFTextField control={control} name="state" label="State" placeholder="CA" />
        <RHFTextField control={control} name="city" label="City" placeholder="LA" />
      </Box>

      <RHFSelect control={control} name="clinicId" label="Clinic" options={clinicOptions} />
      <RHFSelect control={control} name="workRouteId" label="Work route (optional)" options={routeOptions} />

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Positions</Typography>
          <Button size="small" startIcon={<AddOutlined />} onClick={() => append('')}>
            Add position
          </Button>
        </Box>

        {errors.positions?.root && (
          <Typography color="error" sx={{ fontSize: 12, mb: 1 }}>
            {errors.positions.root.message}
          </Typography>
        )}

        <Stack spacing={1.5}>
          {fields.map((f, i) => (
            <Box key={f.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <RHFTextField
                control={control}
                name={`positions.${i}` as `positions.${number}`}
                placeholder={`Position ${i + 1}`}
              />
              {fields.length > 1 && (
                <IconButton size="small" color="error" onClick={() => remove(i)} aria-label="Remove position" sx={{ mt: 0.5 }}>
                  <DeleteOutlineOutlined fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
        </Stack>
      </Box>

      <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
        {submitLabel}
      </Button>
    </Box>
  )
}

export function CollaboratorsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useCollaborators(page)
  const createCollaborator = useCreateCollaborator()
  const deactivateCollaborator = useDeactivateCollaborator()

  const [slideMode, setSlideMode] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<CollaboratorResponse | null>(null)
  const [toDeactivate, setToDeactivate] = useState<CollaboratorResponse | null>(null)

  const updateCollaborator = useUpdateCollaborator(selected?.id ?? '')

  const openCreate = () => { setSelected(null); setSlideMode('create') }
  const openEdit = (c: CollaboratorResponse) => { setSelected(c); setSlideMode('edit') }
  const closeSlide = () => { setSlideMode(null); setSelected(null) }

  const handleCreate = async (data: CollaboratorFormData) => {
    await createCollaborator.mutateAsync(data)
    closeSlide()
  }

  const handleUpdate = async (data: CollaboratorFormData) => {
    await updateCollaborator.mutateAsync(data)
    closeSlide()
  }

  const handleDeactivate = async () => {
    if (!toDeactivate) return
    await deactivateCollaborator.mutateAsync(toDeactivate.id)
    setToDeactivate(null)
  }

  return (
    <Box>
      <PageHeader
        title="Collaborators"
        description="Staff directory — nurses, doctors, and field workers."
        action={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={openCreate}>
            New Collaborator
          </Button>
        }
      />

      {isLoading ? (
        <Stack spacing={1.5}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : !data?.items.length ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <WorkOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>No collaborators yet. Add the first one.</Typography>
        </Paper>
      ) : (
        <>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Collaborators</Typography>
              <Chip label={data.totalCount} size="small" />
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Clinic</TableCell>
                    <TableCell>Positions</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: 'primary.main' }}>
                            {c.firstName[0]}{c.lastName[0]}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                              {c.firstName} {c.lastName}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{c.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{c.clinicName}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {c.positions.map((p) => (
                            <Chip key={p.id} label={p.name} size="small" color="primary" variant="outlined" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{c.phoneNumber}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(c)} aria-label="Edit">
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deactivate">
                          <IconButton size="small" color="error" onClick={() => setToDeactivate(c)} aria-label="Deactivate">
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
                {data.totalCount} collaborators — page {data.page} of {data.totalPages}
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
        open={slideMode !== null}
        onClose={closeSlide}
        title={slideMode === 'edit' ? `Edit — ${selected?.firstName} ${selected?.lastName}` : 'New Collaborator'}
      >
        {slideMode === 'edit' && selected ? (
          <CollaboratorForm defaultValues={selected} onSubmit={handleUpdate} submitLabel="Save changes" />
        ) : (
          <CollaboratorForm onSubmit={handleCreate} submitLabel="Create collaborator" />
        )}
      </SlideOver>

      <ConfirmDialog
        open={!!toDeactivate}
        title="Deactivate collaborator"
        description={`${toDeactivate?.firstName} ${toDeactivate?.lastName} will be deactivated.`}
        confirmLabel="Deactivate"
        loading={deactivateCollaborator.isPending}
        onConfirm={handleDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </Box>
  )
}
