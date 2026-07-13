import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import type { AttachmentPayload } from 'core/types/attachment.types'

// Outcome discriminator so the caller (AttachmentsSection, PR1b) can show a graceful Spanish
// alert on permission denial (R7) without duplicating the OS permission dance itself.
export type PickAndUploadResult = 'uploaded' | 'canceled' | 'permission-denied'

// The RN-specific branch of the cross-platform `AttachmentPayload` union (web uses Blob/File).
// Narrowing to this literal shape (instead of the full union) lets callers that only ever run on
// RN — e.g. `ConsultationDetailScreen`'s staged reply-photo preview (PR2, R6) — read `.uri`
// without a Blob-branch type error, while the value stays directly assignable to
// `AttachmentPayload` wherever an upload call expects it.
export type PickedPhoto = { uri: string; name: string; type: string }

export type PickPhotoResult =
  | { status: 'picked'; payload: PickedPhoto }
  | { status: 'canceled' }
  | { status: 'permission-denied' }

// Pure pick/manipulate step (R6, D4): permission + pick + ALWAYS manipulate → `PickedPhoto`. NO
// upload here — split out of the original `pickAndUpload` so the compose bar (PR2) can stage a
// photo locally (preview it) before the reply-post determines which message id it attaches to.
// No apiClient/axios import — this stays a pure RN pick/manipulate helper (design.md "Layering
// held").
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickPhotoResult> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return { status: 'permission-denied' } // caller shows a Spanish permission-denied alert (PR1b)

  const res =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
  if (res.canceled) return { status: 'canceled' }

  // ALWAYS: force JPEG + downscale to ~1600px regardless of source format (D4).
  // (1) HEIC guard — iOS native photos are HEIC, which the API's content-type allowlist
  //     rejects; forcing JPEG kills that class of 400s deterministically.
  // (2) Bandwidth lever — rural intermittent connectivity; downscaling keeps payloads
  //     small and comfortably under the 10MB cap.
  // New context API (verified against the installed expo-image-manipulator@55.0.18):
  // manipulate(uri).resize({width}).renderAsync() -> ImageRef, then .saveAsync({format,compress})
  // -> ImageResult. NOT the deprecated `manipulateAsync`.
  const context = ImageManipulator.manipulate(res.assets[0].uri)
  context.resize({ width: 1600 })
  const rendered = await context.renderAsync()
  const out = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.75 })

  return { status: 'picked', payload: { uri: out.uri, name: 'photo.jpg', type: 'image/jpeg' } }
}

// UI-layer helper: pick → upload, for the existing Patient/Treatment "Fotos" tab callers
// (`AttachmentsSection`). Now a thin wrapper over `pickPhoto` (R6, D4) — signature and return
// contract are UNCHANGED so those callers need zero edits.
export async function pickAndUpload(
  source: 'camera' | 'library',
  upload: { mutateAsync: (v: { file: AttachmentPayload; onProgress?: (p: number) => void }) => Promise<unknown> },
  onProgress: (p: number | null) => void,
): Promise<PickAndUploadResult> {
  const picked = await pickPhoto(source)
  if (picked.status !== 'picked') return picked.status // 'canceled' | 'permission-denied'

  onProgress(0)
  try {
    await upload.mutateAsync({ file: picked.payload, onProgress })
  } finally {
    onProgress(null)
  }
  return 'uploaded'
}
