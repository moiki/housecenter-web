import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
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
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import PeopleOutlined from '@mui/icons-material/PeopleOutlined'
import { patientSchema, type PatientFormData } from '@/schemas/patient.schema'
import { usePatients, useCreatePatient, useDeactivatePatient } from '@/hooks/patients/usePatients'
import { useClinics } from '@/hooks/clinics/useClinics'
import { useWorkRoutes } from '@/hooks/workroutes/useWorkRoutes'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RHFTextField, RHFSelect, RHFDatePicker } from '@/components/shared/form'
import type { PatientResponse } from '@/types/patient.types'

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
]
const TYPE_OPTIONS = [
  { value: 'Medical', label: 'Medical' },
  { value: 'EducationalReinforcement', label: 'Educational Reinforcement' },
]

function PatientForm({ onSubmit, submitLabel }: { onSubmit: (d: PatientFormData) => Promise<void>; submitLabel: string }) {
  const { data: clinics } = useClinics()
  const { data: routes } = useWorkRoutes()

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: '', lastName: '', profile: null,
      birthDate: '', gender: 'Male',
      country: null, state: null, city: null,
      address: '', description: null,
      primaryAttentionType: 'Medical',
      clinicId: null, workRouteId: null,
    },
  })

  // Empty-string option => Zod transforms '' -> null (replaces the legacy '__none__' sentinel).
  const clinicOptions = [
    { value: '', label: 'No clinic' },
    ...(clinics ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]
  const routeOptions = [
    { value: '', label: 'No route' },
    ...(routes ?? []).map((r) => ({ value: r.id, label: r.routeName })),
  ]

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <RHFTextField control={control} name="firstName" label="First name" placeholder="Jane" />
        <RHFTextField control={control} name="lastName" label="Last name" placeholder="Doe" />
      </Box>

      <RHFDatePicker control={control} name="birthDate" label="Birth date" />

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <RHFSelect control={control} name="gender" label="Gender" options={GENDER_OPTIONS} />
        <RHFSelect control={control} name="primaryAttentionType" label="Attention type" options={TYPE_OPTIONS} />
      </Box>

      <RHFTextField control={control} name="address" label="Address" placeholder="Full address" />

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
        <RHFTextField control={control} name="country" label="Country" placeholder="NI" />
        <RHFTextField control={control} name="state" label="State" />
        <RHFTextField control={control} name="city" label="City" />
      </Box>

      <RHFSelect control={control} name="clinicId" label="Clinic (optional)" options={clinicOptions} />
      <RHFSelect control={control} name="workRouteId" label="Work route (optional)" options={routeOptions} />

      <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
        {submitLabel}
      </Button>
    </Box>
  )
}

function calcAge(birthDate: string) {
  const diff = Date.now() - new Date(birthDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

export function PatientsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching } = usePatients(page)
  const createPatient = useCreatePatient()
  const deactivatePatient = useDeactivatePatient()

  const [slideOpen, setSlideOpen] = useState(false)
  const [toDeactivate, setToDeactivate] = useState<PatientResponse | null>(null)

  const handleCreate = async (d: PatientFormData) => {
    await createPatient.mutateAsync(d)
    setSlideOpen(false)
  }

  const handleDeactivate = async () => {
    if (!toDeactivate) return
    await deactivatePatient.mutateAsync(toDeactivate.id)
    setToDeactivate(null)
  }

  return (
    <Box>
      <PageHeader
        title="Patients"
        description="Full patient registry."
        action={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setSlideOpen(true)}>
            New Patient
          </Button>
        }
      />

      {isLoading ? (
        <Stack spacing={1.5}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : !data?.items.length ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <PeopleOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>No patients registered yet.</Typography>
        </Paper>
      ) : (
        <>
          <Paper
            variant="outlined"
            sx={{ borderRadius: 2, overflow: 'hidden', opacity: isFetching ? 0.6 : 1, transition: 'opacity 150ms' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Patients</Typography>
              <Chip label={data.totalCount} size="small" />
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Patient</TableCell>
                    <TableCell>Age</TableCell>
                    <TableCell>Gender</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: 'primary.main' }}>
                            {p.firstName[0]}{p.lastName[0]}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                              {p.firstName} {p.lastName}
                            </Typography>
                            <Typography
                              sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {p.address}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{calcAge(p.birthDate)} yrs</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{p.gender}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={p.primaryAttentionType === 'Medical' ? 'info' : 'primary'}
                          label={p.primaryAttentionType === 'EducationalReinforcement' ? 'Educational' : p.primaryAttentionType}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View">
                          <IconButton size="small" onClick={() => navigate(`/patients/${p.id}`)} aria-label="View">
                            <VisibilityOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deactivate">
                          <IconButton size="small" color="error" onClick={() => setToDeactivate(p)} aria-label="Deactivate">
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
                {data.totalCount} patients — page {data.page} of {data.totalPages}
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

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title="New Patient">
        <PatientForm onSubmit={handleCreate} submitLabel="Create patient" />
      </SlideOver>

      <ConfirmDialog
        open={!!toDeactivate}
        title="Deactivate patient"
        description={`${toDeactivate?.firstName} ${toDeactivate?.lastName} will be deactivated.`}
        confirmLabel="Deactivate"
        loading={deactivatePatient.isPending}
        onConfirm={handleDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </Box>
  )
}
