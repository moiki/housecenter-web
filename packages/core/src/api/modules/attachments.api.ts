import { getApiClient } from 'core/api/http/registry'
import type { AttachmentResponse, AttachmentOwnerType, AttachmentPayload } from 'core/types/attachment.types'

// Unversioned, like /auth/* and /notifications — see the CLAUDE.md route-versioning gotcha.
const BASE = '/attachments'

export const attachmentsApi = {
  list: (ownerType: AttachmentOwnerType, ownerId: string) =>
    getApiClient().get<AttachmentResponse[]>(BASE, { params: { ownerType, ownerId } }).then((r) => r.data),

  upload: (
    ownerType: AttachmentOwnerType,
    ownerId: string,
    payload: AttachmentPayload,
    onProgress?: (percent: number) => void,
  ) => {
    const formData = new FormData()
    // Web DOM (string|Blob) vs RN (string|{uri,name,type}): neither ambient FormData.append
    // signature accepts this union — one localized cast beats platform-forking this module.
    formData.append('file', payload as any)
    return getApiClient()
      .post<AttachmentResponse>(BASE, formData, {
        params: { ownerType, ownerId },
        // No manual Content-Type: let axios/RN emit `multipart/form-data; boundary=…` (D2b) —
        // a hardcoded header here has no boundary token and 400s on RN's XHR.
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
        },
      })
      .then((r) => r.data)
  },

  delete: (id: string) => getApiClient().delete<void>(`${BASE}/${id}`).then((r) => r.data),

  // Downloading requires the Bearer token, so <img>/<a href> can't hit this directly —
  // fetch as a blob through getApiClient() and hand callers an object URL instead.
  downloadBlob: (id: string) =>
    getApiClient().get<Blob>(`${BASE}/${id}`, { responseType: 'blob' }).then((r) => r.data),
}
