import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Alert, Box, Button, IconButton, LinearProgress, Paper, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import AttachFileOutlined from '@mui/icons-material/AttachFileOutlined'
import { useAttachments, useUploadAttachment, useDeleteAttachment } from '@/hooks/attachments/useAttachments'
import { useUsers } from '@/hooks/users/useUsers'
import { DROPDOWN_PAGE_SIZE } from 'core/lib/constants'
import { AttachmentThumbnail } from '@/components/attachments/AttachmentThumbnail'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { attachmentsApi } from 'core/api/modules/attachments.api'
import { isApiError } from 'core/types/common.types'
import type { AttachmentResponse } from 'core/types/attachment.types'

// Matches the backend's FileStorageOptions.AllowedContentTypes (Features/Attachments/UploadAttachment.cs)
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,application/pdf'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function triggerDownload(attachment: AttachmentResponse) {
  const blob = await attachmentsApi.downloadBlob(attachment.id)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = attachment.fileName
  a.click()
  URL.revokeObjectURL(url)
}

export function AttachmentsTab({ patientId }: { patientId: string }) {
  const { data: attachments, isLoading } = useAttachments('Patient', patientId)
  // Lookup needs the full user list; capped at the backend's clamp max (100 rows).
  const { data: usersData } = useUsers(1, DROPDOWN_PAGE_SIZE)
  const upload = useUploadAttachment('Patient', patientId)
  const deleteAttachment = useDeleteAttachment('Patient', patientId)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<AttachmentResponse | null>(null)

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProgress(0)
    setUploadError(null)
    try {
      await upload.mutateAsync({ file, onProgress: setProgress })
    } catch (err) {
      setUploadError(isApiError(err) ? err.detail : 'Upload failed. Please try again.')
    } finally {
      setProgress(null)
    }
  }

  const uploaderName = (userId: string) => {
    const match = usersData?.items.find((candidate) => candidate.id === userId)
    return match ? `${match.firstName} ${match.lastName}` : 'Unknown'
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} hidden onChange={handleFileSelect} />
        <Button
          variant="contained"
          startIcon={<UploadFileOutlined />}
          onClick={() => fileInputRef.current?.click()}
          loading={upload.isPending}
        >
          Upload file
        </Button>
      </Box>

      {uploadError && (
        <Alert severity="error" onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}

      {progress !== null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ flex: 1, borderRadius: 1, height: 6 }} />
          <Typography sx={{ fontSize: 12, color: 'text.secondary', minWidth: 32 }}>{progress}%</Typography>
        </Box>
      )}

      {isLoading ? (
        <Stack spacing={1.5}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : !attachments?.length ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <AttachFileOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>No attachments yet.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {attachments.map((a) => (
            <Paper key={a.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AttachmentThumbnail id={a.id} contentType={a.contentType} fileName={a.fileName} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 13, fontWeight: 500 }}>
                  {a.fileName}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {formatBytes(a.sizeBytes)} · {uploaderName(a.uploadedByUserId)} · {new Date(a.createdDate).toLocaleDateString()}
                </Typography>
              </Box>
              <Tooltip title="Download">
                <IconButton size="small" onClick={() => triggerDownload(a)} aria-label="Download attachment">
                  <DownloadOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => setToDelete(a)} aria-label="Delete attachment">
                  <DeleteOutlineOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
        </Stack>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete attachment"
        description={`"${toDelete?.fileName}" will be permanently removed.`}
        confirmLabel="Delete"
        loading={deleteAttachment.isPending}
        onConfirm={async () => {
          if (toDelete) {
            await deleteAttachment.mutateAsync(toDelete.id)
            setToDelete(null)
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </Stack>
  )
}
