import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  useTreatmentDetails,
  useCreateTreatmentDetail,
  useDeleteTreatmentDetail,
  useTreatmentComments,
  useCreateTreatmentComment,
  useDeleteTreatmentComment,
} from 'core/hooks/patients/useTreatments'
import { SlideOver } from '@/components/shared/SlideOver'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { HelpTooltip } from '@/components/shared/HelpTooltip'
import { RichTextView } from '@/components/shared/RichTextView'
import { RHFTextField, RHFSelect, RHFDatePicker, RHFRichText } from '@/components/shared/form'
import type { TreatmentResponse, TreatmentDetailResponse, TreatmentCommentResponse } from 'core/types/patient.types'
import { treatmentDetailSchema, type TreatmentDetailFormData } from 'core/schemas/treatmentDetail.schema'
import { commentSchema, type CommentFormData } from 'core/schemas/comment.schema'

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

type DetailForm = TreatmentDetailFormData
type CommentForm = CommentFormData

// ── Options & colors ───────────────────────────────────────────────────────────
type ChipColor = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
const STATUS_COLOR: Record<string, ChipColor> = { Active: 'success', Completed: 'info', Paused: 'warning' }

const COMMENT_TYPE_COLOR: Record<string, ChipColor> = { Simple: 'default', Medical: 'info', Route: 'primary' }

const TREATMENT_FORM_ID = 'treatment-form'

// ── Sub-components ────────────────────────────────────────────────────────────
function TreatmentFormPanel({
  formId,
  defaultValues,
  onSubmit,
}: {
  formId: string
  defaultValues?: TreatmentResponse
  onSubmit: (d: TreatmentForm) => Promise<void>
}) {
  const { t } = useTranslation()

  const TYPE_OPTIONS = [
    { value: '', label: t('patients.treatments.inheritFromPatient') },
    { value: 'Medical', label: t('enums.attentionType.Medical') },
    { value: 'EducationalReinforcement', label: t('enums.attentionType.EducationalReinforcement') },
  ]

  const { control, handleSubmit } = useForm<TreatmentForm>({
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
    <Box component="form" id={formId} onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <RHFTextField control={control} name="name" label={t('common.fields.name')} placeholder={t('patients.treatments.namePlaceholder')} />
      <RHFTextField control={control} name="description" label={t('common.fields.description')} placeholder={t('patients.treatments.descriptionPlaceholder')} multiline minRows={2} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <RHFDatePicker control={control} name="startDate" label={t('patients.treatments.startDateLabel')} />
        <RHFDatePicker control={control} name="endDate" label={t('patients.treatments.endDateLabel')} />
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
            label={t('patients.fields.type')}
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
    </Box>
  )
}

function ExpandedTreatment({ treatment, patientId }: { treatment: TreatmentResponse; patientId: string }) {
  const { t } = useTranslation()
  const patchStatus = usePatchTreatmentStatus(patientId, treatment.id)

  const STATUS_ITEMS = [
    { id: 'Active', label: t('enums.treatmentStatus.Active') },
    { id: 'Completed', label: t('enums.treatmentStatus.Completed') },
    { id: 'Paused', label: t('enums.treatmentStatus.Paused') },
  ]

  const COMMENT_TYPE_OPTIONS = [
    { value: 'Simple', label: t('enums.commentType.Simple') },
    { value: 'Medical', label: t('enums.commentType.Medical') },
    { value: 'Route', label: t('enums.commentType.Route') },
  ]
  const [detailsPage, setDetailsPage] = useState(1)
  const { data: details, isLoading: detailsLoading } = useTreatmentDetails(treatment.id, detailsPage)
  const createDetail = useCreateTreatmentDetail(treatment.id, patientId)
  const deleteDetail = useDeleteTreatmentDetail(treatment.id, patientId)
  const [commentsPage, setCommentsPage] = useState(1)
  const { data: comments, isLoading: commentsLoading } = useTreatmentComments(treatment.id, commentsPage)
  const createComment = useCreateTreatmentComment(treatment.id, patientId)
  const deleteComment = useDeleteTreatmentComment(treatment.id, patientId)

  const [addingDetail, setAddingDetail] = useState(false)
  const [addingComment, setAddingComment] = useState(false)
  const [detailToDelete, setDetailToDelete] = useState<TreatmentDetailResponse | null>(null)
  const [commentToDelete, setCommentToDelete] = useState<TreatmentCommentResponse | null>(null)

  const detailForm = useForm<DetailForm>({
    resolver: zodResolver(treatmentDetailSchema),
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
            {t('patients.fields.status')}
          </Typography>
          <HelpTooltip topicKey="treatments.status-lifecycle" />
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
              {t('patients.treatments.detailsTitle')}
            </Typography>
            <Button
              size="small"
              startIcon={addingDetail ? <CloseOutlined /> : <AddOutlined />}
              onClick={() => setAddingDetail((v) => !v)}
            >
              {addingDetail ? t('common.actions.cancel') : t('patients.treatments.addDetailButton')}
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
                <RHFTextField control={detailForm.control} name="name" label={t('common.fields.name')} placeholder={t('patients.treatments.detailNamePlaceholder')} />
                <RHFDatePicker control={detailForm.control} name="treatmentDate" label={t('patients.treatments.detailDateLabel')} />
              </Box>
              <RHFRichText control={detailForm.control} name="description" label={t('common.fields.description')} placeholder={t('patients.treatments.detailDescriptionPlaceholder')} />
              <Button type="submit" variant="contained" fullWidth loading={detailForm.formState.isSubmitting}>
                {t('patients.treatments.saveDetailButton')}
              </Button>
            </Paper>
          )}

          {detailsLoading ? (
            <Stack spacing={1}>
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} variant="rounded" height={52} />
              ))}
            </Stack>
          ) : !details?.items.length ? (
            <Typography sx={{ fontSize: 13, color: 'text.disabled', fontStyle: 'italic' }}>
              {t('patients.treatments.noDetails')}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {details.items.map((d) => (
                <Paper key={d.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{d.name}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                        {new Date(d.treatmentDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Tooltip title={t('common.actions.delete')}>
                      <IconButton size="small" color="error" onClick={() => setDetailToDelete(d)} aria-label={t('patients.treatments.deleteDetailTitle')}>
                        <DeleteOutlineOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <RichTextView content={d.description} sx={{ mt: 0.5, fontSize: 13 }} />
                </Paper>
              ))}
            </Stack>
          )}

          {details && details.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Pagination
                size="small"
                count={details.totalPages}
                page={detailsPage}
                onChange={(_, p) => setDetailsPage(p)}
                color="primary"
              />
            </Box>
          )}
        </Box>

        {/* Comments section */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('patients.tabs.comments')}
            </Typography>
            <Button
              size="small"
              startIcon={addingComment ? <CloseOutlined /> : <AddOutlined />}
              onClick={() => setAddingComment((v) => !v)}
            >
              {addingComment ? t('common.actions.cancel') : t('patients.comments.addButton')}
            </Button>
          </Box>

          {addingComment && (
            <Paper
              component="form"
              variant="outlined"
              onSubmit={commentForm.handleSubmit(onAddComment)}
              sx={{ p: 2, borderRadius: 2, borderStyle: 'dashed', display: 'flex', flexDirection: 'column', gap: 1.5 }}
            >
              <RHFSelect control={commentForm.control} name="type" label={t('patients.fields.type')} options={COMMENT_TYPE_OPTIONS} />
              <RHFRichText control={commentForm.control} name="body" label={t('patients.comments.bodyLabel')} placeholder={t('patients.treatments.commentBodyPlaceholder')} />
              <Button type="submit" variant="contained" fullWidth loading={commentForm.formState.isSubmitting}>
                {t('patients.comments.postButton')}
              </Button>
            </Paper>
          )}

          {commentsLoading ? (
            <Stack spacing={1}>
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} variant="rounded" height={52} />
              ))}
            </Stack>
          ) : !comments?.items.length ? (
            <Typography sx={{ fontSize: 13, color: 'text.disabled', fontStyle: 'italic' }}>
              {t('patients.comments.empty')}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {comments.items.map((c) => (
                <Paper key={c.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                    <Chip label={t(`enums.commentType.${c.type}`)} size="small" variant="outlined" color={COMMENT_TYPE_COLOR[c.type] ?? 'default'} />
                    <Tooltip title={t('common.actions.delete')}>
                      <IconButton size="small" color="error" onClick={() => setCommentToDelete(c)} aria-label={t('patients.comments.deleteTitle')}>
                        <DeleteOutlineOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <RichTextView content={c.body} sx={{ mt: 0.5, fontSize: 13 }} />
                </Paper>
              ))}
            </Stack>
          )}

          {comments && comments.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Pagination
                size="small"
                count={comments.totalPages}
                page={commentsPage}
                onChange={(_, p) => setCommentsPage(p)}
                color="primary"
              />
            </Box>
          )}
        </Box>
      </Stack>

      <ConfirmDialog
        open={!!detailToDelete}
        title={t('patients.treatments.deleteDetailTitle')}
        description={t('patients.treatments.deleteDetailDescription')}
        confirmLabel={t('common.actions.delete')}
        loading={deleteDetail.isPending}
        onConfirm={async () => {
          if (detailToDelete) {
            await deleteDetail.mutateAsync(detailToDelete.id)
            setDetailToDelete(null)
          }
        }}
        onCancel={() => setDetailToDelete(null)}
      />

      <ConfirmDialog
        open={!!commentToDelete}
        title={t('patients.comments.deleteTitle')}
        description={t('patients.comments.deleteDescription')}
        confirmLabel={t('common.actions.delete')}
        loading={deleteComment.isPending}
        onConfirm={async () => {
          if (commentToDelete) {
            await deleteComment.mutateAsync(commentToDelete.id)
            setCommentToDelete(null)
          }
        }}
        onCancel={() => setCommentToDelete(null)}
      />
    </Box>
  )
}

// ── Main tab ─────────────────────────────────────────────────────────────────
export function TreatmentsTab({ patientId }: { patientId: string }) {
  const { t } = useTranslation()
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
          {t('patients.treatments.newButton')}
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
          <Typography sx={{ mt: 1, fontSize: 14 }}>{t('patients.treatments.empty')}</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {data.items.map((treatment, i) => (
            <Box key={treatment.id} sx={{ borderTop: i === 0 ? 0 : 1, borderColor: 'divider' }}>
              <Box
                onClick={() => setExpanded((prev) => (prev === treatment.id ? null : treatment.id))}
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
                    transform: expanded === treatment.id ? 'rotate(180deg)' : 'none',
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 14, fontWeight: 500 }}>
                    {treatment.name}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {treatment.description}
                  </Typography>
                </Box>
                <Chip label={t(`enums.treatmentStatus.${treatment.status}`)} size="small" color={STATUS_COLOR[treatment.status] ?? 'default'} />
                <Box sx={{ display: 'flex' }} onClick={(e) => e.stopPropagation()}>
                  <Tooltip title={t('common.actions.edit')}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditing(treatment)
                        setSlideMode('edit')
                      }}
                      aria-label={t('patients.treatments.editAriaLabel')}
                    >
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.actions.deactivate')}>
                    <IconButton size="small" color="error" onClick={() => setToDelete(treatment)} aria-label={t('patients.treatments.confirmDeactivate.title')}>
                      <DeleteOutlineOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Collapse in={expanded === treatment.id} unmountOnExit>
                <ExpandedTreatment treatment={treatment} patientId={patientId} />
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
        title={slideMode === 'edit' ? t('patients.treatments.editTitle') : t('patients.treatments.newButton')}
        description={
          slideMode === 'edit'
            ? t('patients.treatments.editDescription')
            : t('patients.treatments.newDescription')
        }
        footer={
          <>
            <Button variant="text" color="inherit" onClick={closeSlide}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              type="submit"
              form={TREATMENT_FORM_ID}
              variant="contained"
              loading={slideMode === 'edit' ? updateTreatment.isPending : createTreatment.isPending}
            >
              {slideMode === 'edit' ? t('common.actions.save') : t('patients.treatments.createButton')}
            </Button>
          </>
        }
      >
        {slideMode === 'edit' && editing ? (
          <TreatmentFormPanel formId={TREATMENT_FORM_ID} defaultValues={editing} onSubmit={handleUpdate} />
        ) : (
          <TreatmentFormPanel formId={TREATMENT_FORM_ID} onSubmit={handleCreate} />
        )}
      </SlideOver>

      <ConfirmDialog
        open={!!toDelete}
        title={t('patients.treatments.confirmDeactivate.title')}
        description={t('patients.treatments.confirmDeactivate.description', { name: toDelete?.name })}
        confirmLabel={t('common.actions.deactivate')}
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
