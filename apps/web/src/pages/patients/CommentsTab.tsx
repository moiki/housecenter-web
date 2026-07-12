import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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

const COMMENT_TYPE_OPTIONS = [
  { value: 'Simple', label: 'Simple' },
  { value: 'Medical', label: 'Medical' },
  { value: 'Route', label: 'Route' },
]

type ChipColor = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
const TYPE_COLOR: Record<string, ChipColor> = { Simple: 'default', Medical: 'info', Route: 'primary' }
const STATUS_COLOR: Record<string, ChipColor> = { Pending: 'warning', Accepted: 'success', Rejected: 'error' }

const schema = z.object({
  body: z.string().min(1, 'Comment is required'),
  type: z.enum(['Route', 'Medical', 'Simple']),
})
type FormData = z.infer<typeof schema>

export function CommentsTab({ patientId }: { patientId: string }) {
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
    resolver: zodResolver(schema),
    defaultValues: { body: '', type: 'Simple' },
  })

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
          {adding ? 'Cancel' : 'Add comment'}
        </Button>
      </Box>

      {adding && (
        <Paper
          component="form"
          variant="outlined"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ p: 2, borderRadius: 2, borderStyle: 'dashed', display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <RHFSelect control={control} name="type" label="Type" options={COMMENT_TYPE_OPTIONS} />
          <RHFRichText control={control} name="body" label="Comment" placeholder="Write your observation…" />
          <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
            Post comment
          </Button>
        </Paper>
      )}

      {!comments.length ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <ChatBubbleOutlineOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>No comments yet.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {comments.map((c) => (
            <Paper key={c.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Chip label={c.type} size="small" variant="outlined" color={TYPE_COLOR[c.type] ?? 'default'} />
                  <Chip label={c.status} size="small" color={STATUS_COLOR[c.status] ?? 'default'} />
                  <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                    {new Date(c.createdDate).toLocaleDateString()}
                  </Typography>
                </Box>
                <Tooltip title="Delete">
                  <IconButton size="small" color="error" onClick={() => setToDelete(c)} aria-label="Delete comment">
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
        title="Delete comment"
        description="This comment will be permanently removed."
        confirmLabel="Delete"
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
