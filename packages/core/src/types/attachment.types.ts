export type AttachmentOwnerType = 'Patient' | 'Treatment' | 'AttentionSession' | 'ConsultationMessage'

// Platform-agnostic multipart payload. Web passes a DOM Blob/File; React Native passes
// { uri, name, type }. See attachments.api.ts for why the union needs one localized cast.
export type AttachmentPayload = Blob | { uri: string; name: string; type: string }

// Not a PagedResult — the backend's ListAttachments endpoint returns a plain array.
export interface AttachmentResponse {
  id: string
  ownerType: AttachmentOwnerType
  ownerId: string
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedByUserId: string
  createdDate: string
  downloadUrl: string
}
