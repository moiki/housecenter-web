import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  MenuItem,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddOutlined from '@mui/icons-material/AddOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined'
import MedicalServicesOutlined from '@mui/icons-material/MedicalServicesOutlined'
import {
  useTreatments,
  useCreateTreatment,
  useUpdateTreatment,
  usePatchTreatmentStatus,
  useDeactivateTreatment,
  useCreateTreatmentDetail,
  useCreateTreatmentComment,
} from '@/hooks/patients/useTreatments'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RHFTextField, RHFSelect, RHFDatePicker, RHFRichText } from '@/components/shared/form'
import type { TreatmentResponse } from '@/types/patient.types'

// ── Schemas ──────────────────────────────────────────────────────────────────
const treatmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  type: z.enum(['Medical', 'EducationalReinforcement']).nullable(),
  profile: z.string().url().nullable().or(z.literal('')).transform((v) => v || null),
})
type TreatmentForm = z.infer<typeof treatmentSchema>

const detailSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  treatmentDate: z.string().min(1),
  profile: z.string().url().nullable().or(z.literal('')).transform((v) => v || null),
})
type DetailForm = z.infer<typeof detailSchema>

const commentSchema = z.object({
  body: z.string().min(1, 'Comment is required'),
  type: z.enum(['Route', 'Medical', 'Simple']),
})
type CommentForm = z.infer<typeof commentSchema>

// ── Options & colors ───────────────────────────────────────────────────────────
type ChipColor = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
const STATUS_COLOR: Record<string, ChipColor> = { Active: 'success', Completed: 'info', Paused: 'warning' }

const STATUS_ITEMS = [
  { id: 'Active', label: 'Active' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Paused', label: 'Paused' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Inherit from patient' },
  { value: 'Medical', label: 'Medical' },
  { value: 'EducationalReinforcement', label: 'Educational Reinforcement' },
]

const COMMENT_TYPE_OPTIONS = [
  { value: 'Simple', label: 'Simple' },
  { value: 'Medical', label: 'Medical' },
  { value: 'Route', label: 'Route' },
]

// ── Sub-components ────────────────────────────────────────────────────────────
function TreatmentFormPanel({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: TreatmentResponse
  onSubmit: (d: TreatmentForm) => Promise<void>
  submitLabel: string
}) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<TreatmentForm>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          description: defaultValues.description,
          startDate: defaultValues.startDate.slice(0, 10),
          endDate: defaultValues.endDate.slice(0, 10),
          type: defaultValues.type,
          profile: defaultValues.profile,
        }
      : { name: '', description: '', startDate: '', endDate: '', type: null, profile: null },
  })

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <RHFTextField control={control} name="name" label="Name" placeholder="Treatment name" />
      <RHFTextField control={control} name="description" label="Description" placeholder="Brief description" multiline minRows={2} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <RHFDatePicker control={control} name="startDate" label="Start date" />
        <RHFDatePicker control={control} name="endDate" label="End date" />
      </Box>
      {/* Nullable enum: the '' option maps to null at the field boundary, so the schema
          stays a plain nullable enum (no transform -> no RHF input/output type divergence). */}
      <Controller
        control={control}
        name="type"
        render={({ field, fieldState }) => (
          <TextField
            select
            fullWidth
            label="Type"
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
            onBlur={field.onBlur}
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
          >
            {TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
        {submitLabel}
      </Button>
    </Box>
  )
}

function ExpandedTreatment({ treatment, patientId }: { treatment: TreatmentResponse; patientId: string }) {
  const patchStatus = usePatchTreatmentStatus(patientId, treatment.id)
  const createDetail = useCreateTreatmentDetail(treatment.id, patientId)
  const createComment = useCreateTreatmentComment(treatment.id, patientId)

  const [addingDetail, setAddingDetail] = useState(false)
  const [addingComment, setAddingComment] = useState(false)

  const detailForm = useForm<DetailForm>({
    resolver: zodResolver(detailSchema),
    defaultValues: { name: '', description: '', treatmentDate: '', profile: null },
  })
  const commentForm = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: '', type: 'Simple' },
  })

  const onAddDetail = async (d: DetailForm) => {
    await createDetail.mutateAsync(d)
    detailForm.reset()
    setAddingDetail(false)
  }

  const onAddComment = async (d: CommentForm) => {
    await createComment.mutateAsync(d)
    commentForm.reset()
    setAddingComment(false)
  }

  return (
    <Box sx={{ bgcolor: 'action.hover', borderTop: 1, borderColor: 'divider', p: 2 }}>
      <Stack spacing={2.5}>
        {/* Status control */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Status
          </Typography>
          <Stack direction="row" spacing={1}>
            {STATUS_ITEMS.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                size="small"
                onClick={() => patchStatus.mutate(s.id)}
                color={treatment.status === s.id ? STATUS_COLOR[s.id] ?? 'default' : 'default'}
                variant={treatment.status === s.id ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </Box>

        {/* Details section */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Details
            </Typography>
            <Button
              size="small"
              startIcon={addingDetail ? <CloseOutlined /> : <AddOutlined />}
              onClick={() => setAddingDetail((v) => !v)}
            >
              {addingDetail ? 'Cancel' : 'Add detail'}
            </Button>
          </Box>

          {addingDetail && (
            <Paper
              component="form"
              variant="outlined"
              onSubmit={detailForm.handleSubmit(onAddDetail)}
              sx={{ p: 2, mb: 1.5, borderRadius: 2, borderStyle: 'dashed', display: 'flex', flexDirection: 'column', gap: 1.5 }}
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <RHFTextField control={detailForm.control} name="name" label="Name" placeholder="Detail name" />
                <RHFDatePicker control={detailForm.control} name="treatmentDate" label="Date" />
              </Box>
              <RHFRichText control={detailForm.control} name="description" label="Description" placeholder="Describe this detail…" />
              <Button type="submit" variant="contained" fullWidth loading={detailForm.formState.isSubmitting}>
                Save detail
              </Button>
            </Paper>
          )}

          {/* Detail items load from the treatment detail endpoints (T10) — list pending. */}
          <Typography sx={{ fontSize: 12, color: 'text.disabled', fontStyle: 'italic' }}>
            Details load from treatment detail endpoints (T10).
          </Typography>
        </Box>

        {/* Comments section */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Comments
            </Typography>
            <Button
              size="small"
              startIcon={addingComment ? <CloseOutlined /> : <AddOutlined />}
              onClick={() => setAddingComment((v) => !v)}
            >
              {addingComment ? 'Cancel' : 'Add comment'}
            </Button>
          </Box>

          {addingComment && (
            <Paper
              component="form"
              variant="outlined"
              onSubmit={commentForm.handleSubmit(onAddComment)}
              sx={{ p: 2, borderRadius: 2, borderStyle: 'dashed', display: 'flex', flexDirection: 'column', gap: 1.5 }}
            >
              <RHFSelect control={commentForm.control} name="type" label="Type" options={COMMENT_TYPE_OPTIONS} />
              <RHFRichText control={commentForm.control} name="body" label="Comment" placeholder="Write your comment…" />
              <Button type="submit" variant="contained" fullWidth loading={commentForm.formState.isSubmitting}>
                Post comment
              </Button>
            </Paper>
          )}
        </Box>
      </Stack>
    </Box>
  )
}

// ── Main tab ─────────────────────────────────────────────────────────────────
export function TreatmentsTab({ patientId }: { patientId: string }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useTreatments(patientId, page)
  const createTreatment = useCreateTreatment(patientId)
  const deactivateTreatment = useDeactivateTreatment(patientId)

  const [expanded, setExpanded] = useState<string | null>(null)
  const [slideMode, setSlideMode] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<TreatmentResponse | null>(null)
  const [toDelete, setToDelete] = useState<TreatmentResponse | null>(null)

  // Hook stays at the top level (was previously called inside handleUpdate — a
  // rules-of-hooks violation); it re-binds to the treatment being edited.
  const updateTreatment = useUpdateTreatment(patientId, editing?.id ?? '')

  const closeSlide = () => {
    setSlideMode(null)
    setEditing(null)
  }

  const handleCreate = async (d: TreatmentForm) => {
    await createTreatment.mutateAsync(d)
    closeSlide()
  }

  const handleUpdate = async (d: TreatmentForm) => {
    if (!editing) return
    await updateTreatment.mutateAsync(d)
    closeSlide()
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddOutlined />}
          onClick={() => {
            setEditing(null)
            setSlideMode('create')
          }}
        >
          New Treatment
        </Button>
      </Box>

      {isLoading ? (
        <Stack spacing={1.5}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Stack>
      ) : !data?.items.length ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <MedicalServicesOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>No treatments yet. Create the first one.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {data.items.map((t, i) => (
            <Box key={t.id} sx={{ borderTop: i === 0 ? 0 : 1, borderColor: 'divider' }}>
              <Box
                onClick={() => setExpanded((prev) => (prev === t.id ? null : t.id))}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 2,
                  py: 1.5,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ExpandMoreOutlined
                  fontSize="small"
                  sx={{
                    color: 'text.secondary',
                    transition: 'transform 0.2s',
                    transform: expanded === t.id ? 'rotate(180deg)' : 'none',
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 14, fontWeight: 500 }}>
                    {t.name}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {t.description}
                  </Typography>
                </Box>
                <Chip label={t.status} size="small" color={STATUS_COLOR[t.status] ?? 'default'} />
                <Box sx={{ display: 'flex' }} onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditing(t)
                        setSlideMode('edit')
                      }}
                      aria-label="Edit treatment"
                    >
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Deactivate">
                    <IconButton size="small" color="error" onClick={() => setToDelete(t)} aria-label="Deactivate treatment">
                      <DeleteOutlineOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Collapse in={expanded === t.id} unmountOnExit>
                <ExpandedTreatment treatment={t} patientId={patientId} />
              </Collapse>
            </Box>
          ))}
        </Paper>
      )}

      {data && data.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination count={data.totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Box>
      )}

      <SlideOver
        open={slideMode !== null}
        onClose={closeSlide}
        title={slideMode === 'edit' ? 'Edit Treatment' : 'New Treatment'}
      >
        {slideMode === 'edit' && editing ? (
          <TreatmentFormPanel defaultValues={editing} onSubmit={handleUpdate} submitLabel="Save changes" />
        ) : (
          <TreatmentFormPanel onSubmit={handleCreate} submitLabel="Create treatment" />
        )}
      </SlideOver>

      <ConfirmDialog
        open={!!toDelete}
        title="Deactivate treatment"
        description={`"${toDelete?.name}" will be deactivated.`}
        confirmLabel="Deactivate"
        loading={deactivateTreatment.isPending}
        onConfirm={async () => {
          if (toDelete) {
            await deactivateTreatment.mutateAsync(toDelete.id)
            setToDelete(null)
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </Stack>
  )
}
