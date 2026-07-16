import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Alert,
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
import { useConsultations, useCreateConsultation } from 'core/hooks/consultations/useConsultations'
import { usePatients } from 'core/hooks/patients/usePatients'
import { useUsers } from 'core/hooks/users/useUsers'
import { DROPDOWN_PAGE_SIZE } from 'core/lib/constants'
import { isApiError } from 'core/types/common.types'
import { translateErrorCode } from 'core/i18n'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { RHFTextField, RHFSelect, RHFRichText } from '@/components/shared/form'
import type { ConsultationStatus } from 'core/types/consultation.types'

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const NEW_CONSULTATION_FORM_ID = 'new-consultation-form'

// ── Create form ───────────────────────────────────────────────────────────────
// The mutation lives in the page component (below) so the SlideOver's pinned footer
// button can read its `isPending` state; this form only owns the fields + validation.
function CreateConsultationForm({ formId, onSubmit }: { formId: string; onSubmit: (data: CreateForm) => Promise<void> }) {
  const { t } = useTranslation()
  // NOTE: usePatients(1, 200) is a pre-existing, separately-tracked bug — the backend
  // clamps pageSize to 100, so this silently drops patients beyond row 100 in orgs with
  // >100 patients. Out of scope for this change; left as-is intentionally.
  const { data: patients } = usePatients(1, 200)
  // Dropdown needs the full user list; capped at the backend's clamp max (100 rows).
  const { data: usersData } = useUsers(1, DROPDOWN_PAGE_SIZE)

  const { control, handleSubmit } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { patientId: '', assignedDoctorId: '', title: '', firstMessage: '', treatmentId: '' },
  })

  const patientOptions = patients?.items.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })) ?? []
  const doctorOptions = (usersData?.items ?? [])
    .filter((u) => u.roles.includes('Doctor'))
    .map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))

  return (
    <Box
      component="form"
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <RHFSelect control={control} name="patientId" label={t('consultations.form.patientLabel')} options={patientOptions} />
      <RHFSelect control={control} name="assignedDoctorId" label={t('consultations.form.doctorLabel')} options={doctorOptions} />
      <RHFTextField
        control={control}
        name="title"
        label={t('consultations.form.titleLabel')}
        placeholder={t('consultations.form.titlePlaceholder')}
      />
      <RHFRichText
        control={control}
        name="firstMessage"
        label={t('consultations.form.firstMessageLabel')}
        placeholder={t('consultations.form.firstMessagePlaceholder')}
      />
    </Box>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ConsultationsPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | undefined>()
  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const createConsultation = useCreateConsultation()

  const { data, isLoading } = useConsultations({ page, pageSize: 15, status: statusFilter })

  const consultations = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  const STATUS_FILTER_OPTIONS = [
    { value: '', label: t('consultations.filters.allStatuses') },
    { value: 'Open', label: t('enums.consultationStatus.Open') },
    { value: 'UnderReview', label: t('enums.consultationStatus.UnderReview') },
    { value: 'Resolved', label: t('enums.consultationStatus.Resolved') },
  ]

  const handleCreate = async (data: CreateForm) => {
    setCreateError(null)
    try {
      await createConsultation.mutateAsync({
        patientId: data.patientId,
        assignedDoctorId: data.assignedDoctorId,
        title: data.title,
        firstMessage: data.firstMessage,
        treatmentId: data.treatmentId || null,
        attachmentUrl: null,
      })
      setCreateOpen(false)
    } catch (err) {
      setCreateError(translateErrorCode(isApiError(err) ? err.code : undefined, lang))
    }
  }

  return (
    <Box>
      <PageHeader
        title={t('consultations.title')}
        description={t('consultations.description')}
        action={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setCreateOpen(true)}>
            {t('consultations.newConsultationButton')}
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
            <Typography sx={{ fontSize: 14 }}>{t('consultations.empty')}</Typography>
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
                      label={t(`enums.consultationStatus.${c.status}`)}
                      size="small"
                      color={STATUS_COLOR[c.status as ConsultationStatus] ?? 'default'}
                    />
                  </Box>
                  {c.resolvedAt && (
                    <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                      {t('consultations.resolvedOn', { date: formatDate(c.resolvedAt) })}
                    </Typography>
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
      <SlideOver
        title={t('consultations.newConsultationDialog.title')}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        description={t('consultations.newConsultationDialog.description')}
        footer={
          <>
            <Button variant="text" color="inherit" onClick={() => setCreateOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" form={NEW_CONSULTATION_FORM_ID} variant="contained" loading={createConsultation.isPending}>
              {t('consultations.newConsultationDialog.createButton')}
            </Button>
          </>
        }
      >
        {createError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCreateError(null)}>
            {createError}
          </Alert>
        )}
        <CreateConsultationForm formId={NEW_CONSULTATION_FORM_ID} onSubmit={handleCreate} />
      </SlideOver>
    </Box>
  )
}
