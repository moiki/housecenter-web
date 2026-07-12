export type AttachmentOwnerType = 'Patient' | 'Treatment' | 'AttentionSession' | 'ConsultationMessage'

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
