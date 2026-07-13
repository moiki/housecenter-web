import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import type { AttachmentPayload } from 'core/types/attachment.types'

// Outcome discriminator so the caller (AttachmentsSection, PR1b) can show a graceful Spanish
// alert on permission denial (R7) without duplicating the OS permission dance itself.
export type PickAndUploadResult = 'uploaded' | 'canceled' | 'permission-denied'

// UI-layer helper: pick → ALWAYS manipulate → build the AttachmentPayload. No apiClient/axios
// import here — this stays a pure RN pick/manipulate helper; the caller passes in the
// core `useUploadAttachment` mutation object so nothing under apps/mobile touches
// getApiClient() directly (design.md "Layering held").
export async function pickAndUpload(
  source: 'camera' | 'library',
  upload: { mutateAsync: (v: { file: AttachmentPayload; onProgress?: (p: number) => void }) => Promise<unknown> },
  onProgress: (p: number | null) => void,
): Promise<PickAndUploadResult> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return 'permission-denied' // caller shows a Spanish permission-denied alert (PR1b)

  const res =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
  if (res.canceled) return 'canceled'

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

  const payload: AttachmentPayload = { uri: out.uri, name: 'photo.jpg', type: 'image/jpeg' }
  onProgress(0)
  try {
    await upload.mutateAsync({ file: payload, onProgress })
  } finally {
    onProgress(null)
  }
  return 'uploaded'
}
