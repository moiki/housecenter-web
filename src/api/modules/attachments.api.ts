import { apiClient } from '@/api/client'
import type { AttachmentResponse, AttachmentOwnerType } from '@/types/attachment.types'

// Unversioned, like /auth/* and /notifications — see the CLAUDE.md route-versioning gotcha.
const BASE = '/attachments'

export const attachmentsApi = {
  list: (ownerType: AttachmentOwnerType, ownerId: string) =>
    apiClient.get<AttachmentResponse[]>(BASE, { params: { ownerType, ownerId } }).then((r) => r.data),

  upload: (ownerType: AttachmentOwnerType, ownerId: string, file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient
      .post<AttachmentResponse>(BASE, formData, {
        params: { ownerType, ownerId },
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
        },
      })
      .then((r) => r.data)
  },

  delete: (id: string) => apiClient.delete<void>(`${BASE}/${id}`).then((r) => r.data),

  // Downloading requires the Bearer token, so <img>/<a href> can't hit this directly —
  // fetch as a blob through apiClient and hand callers an object URL instead.
  downloadBlob: (id: string) =>
    apiClient.get<Blob>(`${BASE}/${id}`, { responseType: 'blob' }).then((r) => r.data),
}
