import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddOutlined from '@mui/icons-material/AddOutlined'
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined'
import { useConsultations, useCreateConsultation } from '@/hooks/consultations/useConsultations'
import { usePatients } from '@/hooks/patients/usePatients'
import { useUsers } from '@/hooks/users/useUsers'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { RHFTextField, RHFSelect, RHFRichText } from '@/components/shared/form'
import type { ConsultationStatus } from '@/types/consultation.types'

// ── Schema ────────────────────────────────────────────────────────────────────
const createSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  assignedDoctorId: z.string().min(1, 'Doctor is required'),
  title: z.string().min(1, 'Title is required'),
  firstMessage: z.string().min(1, 'First message is required'),
  treatmentId: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────
type ChipColor = 'default' | 'info' | 'warning' | 'success'
const STATUS_COLOR: Record<ConsultationStatus, ChipColor> = { Open: 'info', UnderReview: 'warning', Resolved: 'success' }

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'Open', label: 'Open' },
  { value: 'UnderReview', label: 'Under Review' },
  { value: 'Resolved', label: 'Resolved' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Create form ───────────────────────────────────────────────────────────────
function CreateConsultationForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: patients } = usePatients(1, 200)
  const { data: users } = useUsers()
  const createConsultation = useCreateConsultation()

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { patientId: '', assignedDoctorId: '', title: '', firstMessage: '', treatmentId: '' },
  })

  const patientOptions = patients?.items.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })) ?? []
  const doctorOptions = (users ?? [])
    .filter((u) => u.roles.includes('Doctor'))
    .map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))

  const onSubmit = async (data: CreateForm) => {
    await createConsultation.mutateAsync({
      patientId: data.patientId,
      assignedDoctorId: data.assignedDoctorId,
      title: data.title,
      firstMessage: data.firstMessage,
      treatmentId: data.treatmentId || null,
      attachmentUrl: null,
    })
    onSuccess()
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <RHFSelect control={control} name="patientId" label="Patient" options={patientOptions} />
      <RHFSelect control={control} name="assignedDoctorId" label="Assigned Doctor" options={doctorOptions} />
      <RHFTextField control={control} name="title" label="Title" placeholder="Subject of the consultation" />
      <RHFRichText control={control} name="firstMessage" label="First Message" placeholder="Describe the case…" />
      <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
        Open Consultation
      </Button>
    </Box>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ConsultationsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | undefined>()
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useConsultations({ page, pageSize: 15, status: statusFilter })

  const consultations = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <Box>
      <PageHeader
        title="Consultations"
        description="Medical inbox — open cases and threads"
        action={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setCreateOpen(true)}>
            New Consultation
          </Button>
        }
      />

      <Stack spacing={2}>
        {/* Filter bar */}
        <TextField
          select
          size="small"
          value={statusFilter ?? ''}
          onChange={(e) => {
            const v = e.target.value
            setStatusFilter(v === '' ? undefined : (v as ConsultationStatus))
            setPage(1)
          }}
          sx={{ width: 200 }}
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>

        {/* Inbox list */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={28} />
          </Box>
        ) : consultations.length === 0 ? (
          <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
            <Typography sx={{ fontSize: 14 }}>No consultations found.</Typography>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {consultations.map((c, i) => (
              <Box
                key={c.id}
                onClick={() => navigate(`/consultations/${c.id}`)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 2.5,
                  py: 2,
                  cursor: 'pointer',
                  borderTop: i === 0 ? 0 : 1,
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.25 }}>
                    <Typography noWrap sx={{ fontSize: 14, fontWeight: 500 }}>
                      {c.title}
                    </Typography>
                    <Chip
                      label={c.status === 'UnderReview' ? 'Under Review' : c.status}
                      size="small"
                      color={STATUS_COLOR[c.status as ConsultationStatus] ?? 'default'}
                    />
                  </Box>
                  {c.resolvedAt && (
                    <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Resolved {formatDate(c.resolvedAt)}</Typography>
                  )}
                </Box>
                <ChevronRightOutlined fontSize="small" sx={{ color: 'text.disabled' }} />
              </Box>
            ))}
          </Paper>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
          </Box>
        )}
      </Stack>

      {/* Create slide-over */}
      <SlideOver title="New Consultation" open={createOpen} onClose={() => setCreateOpen(false)}>
        <CreateConsultationForm onSuccess={() => setCreateOpen(false)} />
      </SlideOver>
    </Box>
  )
}
