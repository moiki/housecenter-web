import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { attachmentsApi } from 'core/api/modules/attachments.api'
import type { AttachmentOwnerType, AttachmentPayload } from 'core/types/attachment.types'

const keys = {
  all: (ownerType: AttachmentOwnerType, ownerId: string) => ['attachments', ownerType, ownerId] as const,
}

export function useAttachments(ownerType: AttachmentOwnerType, ownerId: string) {
  return useQuery({
    queryKey: keys.all(ownerType, ownerId),
    queryFn: () => attachmentsApi.list(ownerType, ownerId),
    enabled: !!ownerId,
  })
}

export function useUploadAttachment(ownerType: AttachmentOwnerType, ownerId: string) {
  const qc = useQueryClient()
  return useMutation({
    // KEEP the key `file` (retype only) so web's upload.mutateAsync({file,onProgress}) still
    // compiles — a DOM File is assignable to AttachmentPayload's Blob branch (D1b).
    mutationFn: ({ file, onProgress }: { file: AttachmentPayload; onProgress?: (percent: number) => void }) =>
      attachmentsApi.upload(ownerType, ownerId, file, onProgress),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(ownerType, ownerId) }),
  })
}

export function useDeleteAttachment(ownerType: AttachmentOwnerType, ownerId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => attachmentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(ownerType, ownerId) }),
  })
}
