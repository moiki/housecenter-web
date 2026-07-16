import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import AddOutlined from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined'
import { useSessions, useCreateSession, usePatchSessionStatus, useDeleteSession } from 'core/hooks/patients/useSessions'
import { useCollaborators } from 'core/hooks/collaborators/useCollaborators'
import { useClinics } from 'core/hooks/clinics/useClinics'
import { useWorkRoutes } from 'core/hooks/workroutes/useWorkRoutes'
import { DROPDOWN_PAGE_SIZE } from 'core/lib/constants'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { HelpTooltip } from '@/components/shared/HelpTooltip'
import { RHFTextField, RHFSelect } from '@/components/shared/form'
import type { AttentionSessionResponse, SessionStatus } from 'core/types/session.types'
import {
  createSessionSchema,
  sessionStatusSchema,
  type CreateSessionFormData,
  type SessionStatusFormData,
} from 'core/schemas/session.schema'

// ── Schemas ──────────────────────────────────────────────────────────────────
type CreateForm = CreateSessionFormData
type StatusForm = SessionStatusFormData

// ── Helpers ──────────────────────────────────────────────────────────────────
type ChipColor = 'default' | 'info' | 'success' | 'error'
const STATUS_COLOR: Record<SessionStatus, ChipColor> = { Scheduled: 'info', Completed: 'success', Missed: 'error' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const NEW_SESSION_FORM_ID = 'new-session-form'

// ── Create form (inside SlideOver) ────────────────────────────────────────────
// The mutation lives in the tab component (below) so the SlideOver's pinned footer
// button can read its `isPending` state; this form only owns the fields + validation.
function CreateSessionForm({ formId, onSubmit }: { formId: string; onSubmit: (data: CreateForm) => Promise<void> }) {
  const { t } = useTranslation()
  // Dropdowns need the full list; capped at the backend's clamp max (100 rows).
  const { data: collaboratorsData } = useCollaborators(1, DROPDOWN_PAGE_SIZE)
  const { data: clinicsData } = useClinics(1, DROPDOWN_PAGE_SIZE)
  const { data: workRoutesData } = useWorkRoutes(1, DROPDOWN_PAGE_SIZE)

  const TYPE_OPTIONS = [
    { value: 'Medical', label: t('enums.attentionType.Medical') },
    { value: 'EducationalReinforcement', label: t('enums.attentionType.EducationalReinforcement') },
  ]

  const LOCATION_MODE_OPTIONS = [
    { value: 'clinic', label: t('patients.sessions.clinicLabel') },
    { value: 'workRoute', label: t('patients.sessions.workRouteLabel') },
  ]

  const { control, handleSubmit } = useForm<CreateForm>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      collaboratorId: '',
      attentionType: 'Medical',
      sessionDate: '',
      durationMinutes: '',
      notes: '',
      locationMode: 'clinic',
      clinicId: '',
      workRouteId: '',
    },
  })

  const locationMode = useWatch({ control, name: 'locationMode' })

  const collaboratorOptions = collaboratorsData?.items.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` })) ?? []
  const clinicOptions = clinicsData?.items.map((c) => ({ value: c.id, label: c.name })) ?? []
  const workRouteOptions = workRoutesData?.items.map((w) => ({ value: w.id, label: w.routeName })) ?? []

  return (
    <Box
      component="form"
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <RHFSelect control={control} name="collaboratorId" label={t('patients.sessions.collaboratorLabel')} options={collaboratorOptions} />
      <RHFSelect control={control} name="attentionType" label={t('patients.sessions.attentionTypeLabel')} options={TYPE_OPTIONS} />
      <RHFTextField
        control={control}
        name="sessionDate"
        label={t('patients.sessions.sessionDateLabel')}
        type="datetime-local"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <RHFSelect
          control={control}
          name="locationMode"
          label={t('patients.sessions.locationTypeLabel')}
          options={LOCATION_MODE_OPTIONS}
          sx={{ flex: 1 }}
        />
        <HelpTooltip topicKey="sessions.clinic-or-route" />
      </Box>
      {locationMode === 'clinic' && <RHFSelect control={control} name="clinicId" label={t('patients.sessions.clinicLabel')} options={clinicOptions} />}
      {locationMode === 'workRoute' && (
        <RHFSelect control={control} name="workRouteId" label={t('patients.sessions.workRouteLabel')} options={workRouteOptions} />
      )}
      <RHFTextField control={control} name="durationMinutes" label={t('patients.sessions.durationMinutesLabel')} type="number" placeholder={t('patients.sessions.optionalPlaceholder')} />
      <RHFTextField control={control} name="notes" label={t('patients.sessions.notesLabel')} placeholder={t('patients.sessions.optionalPlaceholder')} multiline minRows={2} />
    </Box>
  )
}

// ── Status patch form (inline below row) ─────────────────────────────────────
function StatusPatchForm({
  session,
  patientId,
  onClose,
}: {
  session: AttentionSessionResponse
  patientId: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const patchStatus = usePatchSessionStatus(patientId)

  const STATUS_OPTIONS = [
    { value: 'Scheduled', label: t('enums.sessionStatus.Scheduled') },
    { value: 'Completed', label: t('enums.sessionStatus.Completed') },
    { value: 'Missed', label: t('enums.sessionStatus.Missed') },
  ]

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<StatusForm>({
    resolver: zodResolver(sessionStatusSchema),
    defaultValues: {
      status: session.status,
      durationMinutes: session.durationMinutes?.toString() ?? '',
      notes: session.notes ?? '',
    },
  })

  const onSubmit = async (data: StatusForm) => {
    await patchStatus.mutateAsync({
      sessionId: session.id,
      data: {
        status: data.status,
        durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes, 10) : null,
        notes: data.notes || null,
      },
    })
    onClose()
  }

  return (
    <Paper
      component="form"
      variant="outlined"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ mt: 1.5, p: 2, borderRadius: 2, borderStyle: 'dashed', display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <RHFSelect control={control} name="status" label={t('patients.fields.status')} options={STATUS_OPTIONS} sx={{ flex: 1 }} />
          <HelpTooltip topicKey="sessions.status-lifecycle" />
        </Box>
        <RHFTextField control={control} name="durationMinutes" label={t('patients.sessions.durationMinLabel')} type="number" />
        <RHFTextField control={control} name="notes" label={t('patients.sessions.notesLabel')} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button size="small" color="inherit" onClick={onClose}>
          {t('common.actions.cancel')}
        </Button>
        <Button size="small" type="submit" variant="contained" loading={isSubmitting}>
          {t('patients.sessions.saveButton')}
        </Button>
      </Box>
    </Paper>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────
interface Props {
  patientId: string
}

export function SessionsTab({ patientId }: Props) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AttentionSessionResponse | null>(null)

  const { data, isLoading } = useSessions(patientId, { page, pageSize: 10 })
  const createSession = useCreateSession(patientId)
  const deleteSession = useDeleteSession(patientId)

  const sessions = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  const handleCreate = async (data: CreateForm) => {
    await createSession.mutateAsync({
      collaboratorId: data.collaboratorId,
      clinicId: data.locationMode === 'clinic' ? data.clinicId || null : null,
      workRouteId: data.locationMode === 'workRoute' ? data.workRouteId || null : null,
      attentionType: data.attentionType,
      sessionDate: new Date(data.sessionDate).toISOString(),
      durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes, 10) : null,
      notes: data.notes || null,
    })
    setCreateOpen(false)
  }

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{t('patients.sessions.title')}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <HelpTooltip topicKey="sessions.recording" />
          <Button size="small" variant="contained" startIcon={<AddOutlined />} onClick={() => setCreateOpen(true)}>
            {t('patients.sessions.newButton')}
          </Button>
        </Box>
      </Box>

      {/* List */}
      {isLoading ? (
        <Stack spacing={1.5}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Stack>
      ) : sessions.length === 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <Typography sx={{ fontSize: 14 }}>{t('patients.sessions.empty')}</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {sessions.map((session) => (
            <Paper key={session.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
                <Box
                  onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                  sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', minWidth: 0 }}
                >
                  <ExpandMoreOutlined
                    fontSize="small"
                    sx={{
                      color: 'text.secondary',
                      transition: 'transform 0.2s',
                      transform: expandedId === session.id ? 'rotate(180deg)' : 'none',
                    }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{formatDate(session.sessionDate)}</Typography>
                      <Chip label={t(`enums.sessionStatus.${session.status}`)} size="small" color={STATUS_COLOR[session.status] ?? 'default'} />
                      <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                        {t(`enums.attentionType.${session.attentionType}`)}
                      </Typography>
                    </Box>
                    <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                      {session.collaboratorName}
                      {session.durationMinutes ? t('patients.sessions.durationSuffix', { minutes: session.durationMinutes }) : ''}
                    </Typography>
                  </Box>
                </Box>
                <Tooltip title={t('common.actions.delete')}>
                  <IconButton size="small" color="error" onClick={() => setDeleteTarget(session)} aria-label={t('patients.sessions.deleteAriaLabel')}>
                    <DeleteOutlineOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Collapse in={expandedId === session.id} unmountOnExit>
                <Box sx={{ px: 2, pb: 2 }}>
                  <StatusPatchForm session={session} patientId={patientId} onClose={() => setExpandedId(null)} />
                </Box>
              </Collapse>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Box>
      )}

      {/* Create slide-over */}
      <SlideOver
        title={t('patients.sessions.newDialogTitle')}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        description={t('patients.sessions.newDialogDescription')}
        footer={
          <>
            <Button variant="text" color="inherit" onClick={() => setCreateOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" form={NEW_SESSION_FORM_ID} variant="contained" loading={createSession.isPending}>
              {t('patients.sessions.createButton')}
            </Button>
          </>
        }
      >
        <CreateSessionForm formId={NEW_SESSION_FORM_ID} onSubmit={handleCreate} />
      </SlideOver>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('patients.sessions.deleteDialogTitle')}
        description={t('patients.sessions.deleteDialogDescription')}
        confirmLabel={t('common.actions.delete')}
        loading={deleteSession.isPending}
        onConfirm={async () => {
          if (deleteTarget) await deleteSession.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </Stack>
  )
}
