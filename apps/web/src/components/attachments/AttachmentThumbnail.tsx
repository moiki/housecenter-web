import { useEffect, useState } from 'react'
import { Box, Skeleton } from '@mui/material'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import { attachmentsApi } from 'core/api/modules/attachments.api'

// Images can't use <img src={downloadUrl}> directly — the endpoint requires a Bearer
// token that a plain <img> tag has no way to send. Fetch the blob through apiClient
// (which does attach it) and render an object URL instead.
export function AttachmentThumbnail({ id, contentType, fileName }: { id: string; contentType: string; fileName: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const isImage = contentType.startsWith('image/')

  useEffect(() => {
    if (!isImage) return
    let objectUrl: string | null = null
    let cancelled = false

    attachmentsApi.downloadBlob(id).then((blob) => {
      if (cancelled) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id, isImage])

  if (!isImage) {
    return (
      <Box
        sx={{
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          borderRadius: 1.5,
          flexShrink: 0,
        }}
      >
        <InsertDriveFileOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
      </Box>
    )
  }

  if (!url) return <Skeleton variant="rounded" width={44} height={44} sx={{ flexShrink: 0 }} />

  return (
    <Box
      component="img"
      src={url}
      alt={fileName}
      sx={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 1.5, flexShrink: 0 }}
    />
  )
}
