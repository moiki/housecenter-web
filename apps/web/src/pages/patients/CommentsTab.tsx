import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import AddOutlined from '@mui/icons-material/AddOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined'
import { usePatientFullSummary } from 'core/hooks/patients/usePatients'
import { useCreatePatientComment, useDeletePatientComment } from 'core/hooks/patients/useTreatments'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RichTextView } from '@/components/shared/RichTextView'
import { RHFRichText, RHFSelect } from '@/components/shared/form'
import type { PatientCommentDto } from 'core/types/patient.types'
import { commentSchema, type CommentFormData } from 'core/schemas/comment.schema'

type ChipColor = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
const TYPE_COLOR: Record<string, ChipColor> = { Simple: 'default', Medical: 'info', Route: 'primary' }
const STATUS_COLOR: Record<string, ChipColor> = { Pending: 'warning', Accepted: 'success', Rejected: 'error' }

type FormData = CommentFormData

export function CommentsTab({ patientId }: { patientId: string }) {
  const { t } = useTranslation()
  const { data: summary } = usePatientFullSummary(patientId)
  const createComment = useCreatePatientComment(patientId)
  const deleteComment = useDeletePatientComment(patientId)

  const [toDelete, setToDelete] = useState<PatientCommentDto | null>(null)
  const [adding, setAdding] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: '', type: 'Simple' },
  })

  const COMMENT_TYPE_OPTIONS = [
    { value: 'Simple', label: t('enums.commentType.Simple') },
    { value: 'Medical', label: t('enums.commentType.Medical') },
    { value: 'Route', label: t('enums.commentType.Route') },
  ]

  const onSubmit = async (data: FormData) => {
    await createComment.mutateAsync(data)
    reset()
    setAdding(false)
  }

  const comments = summary?.comments ?? []

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant={adding ? 'outlined' : 'contained'}
          color={adding ? 'inherit' : 'primary'}
          startIcon={adding ? <CloseOutlined /> : <AddOutlined />}
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? t('common.actions.cancel') : t('patients.comments.addButton')}
        </Button>
      </Box>

      {adding && (
        <Paper
          component="form"
          variant="outlined"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ p: 2, borderRadius: 2, borderStyle: 'dashed', display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <RHFSelect control={control} name="type" label={t('patients.fields.type')} options={COMMENT_TYPE_OPTIONS} />
          <RHFRichText control={control} name="body" label={t('patients.comments.bodyLabel')} placeholder={t('patients.comments.bodyPlaceholder')} />
          <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
            {t('patients.comments.postButton')}
          </Button>
        </Paper>
      )}

      {!comments.length ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <ChatBubbleOutlineOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>{t('patients.comments.empty')}</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {comments.map((c) => (
            <Paper key={c.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Chip label={t(`enums.commentType.${c.type}`)} size="small" variant="outlined" color={TYPE_COLOR[c.type] ?? 'default'} />
                  <Chip label={t(`enums.commentStatus.${c.status}`)} size="small" color={STATUS_COLOR[c.status] ?? 'default'} />
                  <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                    {new Date(c.createdDate).toLocaleDateString()}
                  </Typography>
                </Box>
                <Tooltip title={t('common.actions.delete')}>
                  <IconButton size="small" color="error" onClick={() => setToDelete(c)} aria-label={t('patients.comments.deleteTitle')}>
                    <DeleteOutlineOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <RichTextView content={c.body} sx={{ mt: 1, fontSize: 14 }} />
            </Paper>
          ))}
        </Stack>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={t('patients.comments.deleteTitle')}
        description={t('patients.comments.deleteDescription')}
        confirmLabel={t('common.actions.delete')}
        loading={deleteComment.isPending}
        onConfirm={async () => {
          if (toDelete) {
            await deleteComment.mutateAsync(toDelete.id)
            setToDelete(null)
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </Stack>
  )
}
