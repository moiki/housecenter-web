import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { useSessions, useCreateSession, usePatchSessionStatus, useDeleteSession } from '@/hooks/patients/useSessions'
import { useCollaborators } from '@/hooks/collaborators/useCollaborators'
import { useClinics } from '@/hooks/clinics/useClinics'
import { useWorkRoutes } from '@/hooks/workroutes/useWorkRoutes'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { HelpTooltip } from '@/components/shared/HelpTooltip'
import { RHFTextField, RHFSelect } from '@/components/shared/form'
import type { AttentionSessionResponse, SessionStatus } from '@/types/session.types'

// ── Schemas ──────────────────────────────────────────────────────────────────
const createSchema = z
  .object({
    collaboratorId: z.string().min(1, 'Collaborator is required'),
    attentionType: z.enum(['Medical', 'EducationalReinforcement']),
    sessionDate: z.string().min(1, 'Date is required'),
    durationMinutes: z.string().optional(),
    notes: z.string().optional(),
    locationMode: z.enum(['clinic', 'workRoute']),
    clinicId: z.string().optional(),
    workRouteId: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.locationMode === 'clinic' && !d.clinicId) {
      ctx.addIssue({ code: 'custom', path: ['clinicId'], message: 'Clinic is required' })
    }
    if (d.locationMode === 'workRoute' && !d.workRouteId) {
      ctx.addIssue({ code: 'custom', path: ['workRouteId'], message: 'Work route is required' })
    }
  })
type CreateForm = z.infer<typeof createSchema>

const statusSchema = z.object({
  status: z.enum(['Scheduled', 'Completed', 'Missed']),
  durationMinutes: z.string().optional(),
  notes: z.string().optional(),
})
type StatusForm = z.infer<typeof statusSchema>

// ── Helpers ──────────────────────────────────────────────────────────────────
type ChipColor = 'default' | 'info' | 'success' | 'error'
const STATUS_COLOR: Record<SessionStatus, ChipColor> = { Scheduled: 'info', Completed: 'success', Missed: 'error' }

const STATUS_OPTIONS = [
  { value: 'Scheduled', label: 'Scheduled' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Missed', label: 'Missed' },
]

const TYPE_OPTIONS = [
  { value: 'Medical', label: 'Medical' },
  { value: 'EducationalReinforcement', label: 'Educational Reinforcement' },
]

const LOCATION_MODE_OPTIONS = [
  { value: 'clinic', label: 'Clinic' },
  { value: 'workRoute', label: 'Work Route' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Create form (inside SlideOver) ────────────────────────────────────────────
function CreateSessionForm({ patientId, onSuccess }: { patientId: string; onSuccess: () => void }) {
  const { data: collaboratorsData } = useCollaborators()
  const { data: clinics } = useClinics()
  const { data: workRoutesData } = useWorkRoutes()
  const createSession = useCreateSession(patientId)

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
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

  const collaboratorOptions = collaboratorsData?.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` })) ?? []
  const clinicOptions = clinics?.map((c) => ({ value: c.id, label: c.name })) ?? []
  const workRouteOptions = workRoutesData?.map((w) => ({ value: w.id, label: w.routeName })) ?? []

  const onSubmit = async (data: CreateForm) => {
    await createSession.mutateAsync({
      collaboratorId: data.collaboratorId,
      clinicId: data.locationMode === 'clinic' ? data.clinicId || null : null,
      workRouteId: data.locationMode === 'workRoute' ? data.workRouteId || null : null,
      attentionType: data.attentionType,
      sessionDate: new Date(data.sessionDate).toISOString(),
      durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes, 10) : null,
      notes: data.notes || null,
    })
    onSuccess()
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <RHFSelect control={control} name="collaboratorId" label="Collaborator" options={collaboratorOptions} />
      <RHFSelect control={control} name="attentionType" label="Attention Type" options={TYPE_OPTIONS} />
      <RHFTextField
        control={control}
        name="sessionDate"
        label="Session Date"
        type="datetime-local"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <RHFSelect
          control={control}
          name="locationMode"
          label="Location Type"
          options={LOCATION_MODE_OPTIONS}
          sx={{ flex: 1 }}
        />
        <HelpTooltip topicKey="sessions.clinic-or-route" />
      </Box>
      {locationMode === 'clinic' && <RHFSelect control={control} name="clinicId" label="Clinic" options={clinicOptions} />}
      {locationMode === 'workRoute' && (
        <RHFSelect control={control} name="workRouteId" label="Work Route" options={workRouteOptions} />
      )}
      <RHFTextField control={control} name="durationMinutes" label="Duration (minutes)" type="number" placeholder="Optional" />
      <RHFTextField control={control} name="notes" label="Notes" placeholder="Optional" multiline minRows={2} />
      <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
        Create Session
      </Button>
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
  const patchStatus = usePatchSessionStatus(patientId)

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<StatusForm>({
    resolver: zodResolver(statusSchema),
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
          <RHFSelect control={control} name="status" label="Status" options={STATUS_OPTIONS} sx={{ flex: 1 }} />
          <HelpTooltip topicKey="sessions.status-lifecycle" />
        </Box>
        <RHFTextField control={control} name="durationMinutes" label="Duration (min)" type="number" />
        <RHFTextField control={control} name="notes" label="Notes" />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button size="small" color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button size="small" type="submit" variant="contained" loading={isSubmitting}>
          Save
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
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AttentionSessionResponse | null>(null)

  const { data, isLoading } = useSessions(patientId, { page, pageSize: 10 })
  const deleteSession = useDeleteSession(patientId)

  const sessions = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Attention Sessions</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <HelpTooltip topicKey="sessions.recording" />
          <Button size="small" variant="contained" startIcon={<AddOutlined />} onClick={() => setCreateOpen(true)}>
            New Session
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
          <Typography sx={{ fontSize: 14 }}>No sessions recorded yet.</Typography>
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
                      <Chip label={session.status} size="small" color={STATUS_COLOR[session.status] ?? 'default'} />
                      <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                        {session.attentionType === 'EducationalReinforcement' ? 'Educational' : session.attentionType}
                      </Typography>
                    </Box>
                    <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                      {session.collaboratorName}
                      {session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}
                    </Typography>
                  </Box>
                </Box>
                <Tooltip title="Delete">
                  <IconButton size="small" color="error" onClick={() => setDeleteTarget(session)} aria-label="Delete session">
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
      <SlideOver title="New Attention Session" open={createOpen} onClose={() => setCreateOpen(false)}>
        <CreateSessionForm patientId={patientId} onSuccess={() => setCreateOpen(false)} />
      </SlideOver>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete session?"
        description="This action cannot be undone."
        confirmLabel="Delete"
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
