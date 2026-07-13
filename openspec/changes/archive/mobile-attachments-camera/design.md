# SDD Design — Mobile Attachments & Camera

## Change name
`mobile-attachments-camera`

## Status
`design` (2026-07-13) — depends on `proposal.md` + `spec.md` (both ratified).

---

## Target structure

Two work surfaces: a shared **core payload fix** (compiled by three independent tsc programs —
web/core have `DOM` lib, mobile does not) and an **additive mobile feature**.

```
packages/core/src/
├── types/attachment.types.ts            MODIFY  + export type AttachmentPayload
├── api/modules/attachments.api.ts       MODIFY  upload() param retype + one `as any` cast
└── hooks/attachments/useAttachments.ts  MODIFY  useUploadAttachment variable retype (KEEP key `file`)

apps/web/src/pages/patients/AttachmentsTab.tsx   NO CHANGE  (shared-code regression gate: build+lint)

apps/mobile/
├── package.json                         MODIFY  + expo-image-picker, expo-image-manipulator, expo-image
├── app.config.ts                        MODIFY  + expo-image-picker plugin (Spanish permission strings)
└── src/
    ├── components/attachments/
    │   ├── AttachmentsSection.tsx        NEW  (ownerType, ownerId) — list + upload + delete
    │   ├── AuthedImage.tsx               NEW  Bearer-gated expo-image thumbnail
    │   └── pickAndUpload.ts              NEW  pick → manipulate → payload helper (UI-layer, no apiClient)
    ├── screens/patients/PatientDetailScreen.tsx   MODIFY  add 5th "Fotos" tab to TABS
    └── i18n/locales/es.json             MODIFY  patients.tab.photos + attachments.* keys
```

Layering held: mobile screens/components call **core hooks only**; `pickAndUpload` receives the
mutation object as a param, so nothing under `apps/mobile` touches `getApiClient()`/axios directly.
`AttachmentsSection`, `AuthedImage`, `pickAndUpload`, `useOnline` are RN-only and MUST stay under
`apps/mobile` (never `packages/core`).

---

## Architecture decisions

### D1 — `AttachmentPayload` union + a single `as any` cast at `formData.append`
**Choice**: `export type AttachmentPayload = Blob | { uri: string; name: string; type: string }` in
`attachment.types.ts`; `upload()`'s third param `file: File` → `payload: AttachmentPayload`; keep
one `formData.append('file', payload as any)` with an explanatory comment.
**Alternatives**: (a) platform-fork the api module (`attachments.api.web.ts` / `.native.ts`) — two
copies of the same axios call to maintain; (b) a typed overload / conditional type — doesn't help
because the *runtime* `FormData.append` ambient signatures differ per platform, not the payload type.
**Rationale**: core's source is re-typechecked under **both** tsc programs (no project-refs / built
`.d.ts` isolation — mobile pulls core's `.ts` via path mapping). Under DOM, `FormData.append(key,
value: string | Blob)`; under RN, `string | { uri; name?; type? }`. **Neither ambient signature
accepts the union**, so exactly one localized cast at the single `append` seam beats forking. Web is
unaffected: a DOM `File extends Blob`, so it satisfies the `Blob` branch.

### D1b — Keep the `useUploadAttachment` mutation-variable **key** `file` (retype only)
**Choice**: hook stays `mutationFn: ({ file, onProgress }: { file: AttachmentPayload; onProgress? })`
— rename nothing, only widen the type.
**Alternatives**: rename the variable key to `payload` (reads cleaner, matches the api param name).
**Rationale**: the spec's `web-build-unbroken` scenario requires web to keep calling
`upload.mutateAsync({ file, onProgress })` **unchanged**. Renaming the key to `payload` would make
web's object literal fail (excess `file` / missing `payload`). The api module's *positional* third
param is renamed to `payload` freely (no caller impact); the hook's *variable object key* must stay
`file`. This is the one subtlety that could silently break the web regression gate.

### D2 — Upload transport: axios (`getApiClient()`), not `expo-file-system.uploadAsync`
**Choice**: reuse core's shared axios client for the multipart POST with `onUploadProgress`.
**Alternatives**: `expo-file-system.uploadAsync` (native multipart).
**Rationale**: axios reuses the existing Bearer request interceptor **and** the single-flight
401-refresh-and-retry queue (`createApiClient.ts`) for free; `expo-file-system` would forfeit
refresh-retry and re-implement auth. Downscaled JPEGs sit well under the 10MB cap, so streaming
isn't needed. Drop the explicit `Content-Type: multipart/form-data` header on this call — see D2b.

### D2b — Let axios/RN set the multipart boundary (remove the hardcoded `Content-Type`)
**Choice**: the upload call passes FormData with **no** manual `Content-Type` header (keep
`params: { ownerType, ownerId }` + `onUploadProgress`).
**Alternatives**: keep the current `headers: { 'Content-Type': 'multipart/form-data' }`.
**Rationale**: a hardcoded `multipart/form-data` has **no boundary token**. Browsers/axios auto-set
it correctly for FormData bodies (web behavior unchanged/improved), but RN's XHR, seeing a
pre-set Content-Type, will not inject the boundary → the API can't parse the parts (400). Removing
the header lets each platform emit `multipart/form-data; boundary=…`. This is a shared-code edit, so
it re-runs under the web regression gate. (If a real device still 400s, the fallback is to set the
boundary explicitly — flag for smoke.)

### D3 — Authed display: expo-image `<Image source.headers>`, reactive token
**Choice**: `AuthedImage` renders `<Image source={{ uri, headers: { Authorization } }} />` from
`expo-image`, reading the token via `useAuthStore((s) => s.accessToken)` and building
`uri = env.API_BASE_URL + downloadUrl`.
**Alternatives**: `Image.loadAsync`/`prefetch` (headers unreliable — docs gap, issues #33412/#34723);
fetch-blob-to-data-URL like web's `AttachmentThumbnail` (defeats expo-image's disk cache).
**Rationale**: the download endpoint is Bearer-gated — a bare `<Image uri>` 401s. The component
`source.headers` prop is the only reliable header path. Reading the store via selector keeps the
header **reactive** across 401-refresh token rotation. `downloadUrl` is relative, so it must be
prefixed with the runtime base URL (expo-image hits the URL directly, not via axios).

### D4 — ALWAYS manipulate: force JPEG + ~1600px resize + ~0.75 compress
**Choice**: run `expo-image-manipulator`'s new context API on **every** pick regardless of source
format: `ImageManipulator.manipulate(uri).resize({ width: 1600 }).renderAsync()` →
`.saveAsync({ format: SaveFormat.JPEG, compress: 0.75 })`.
**Alternatives**: manipulate only when the source is HEIC; skip resize; deprecated `manipulateAsync`.
**Rationale**: two levers in one always-on step — (1) **HEIC guard**: iOS native photos are HEIC,
which the API's allowlist (`image/jpeg|png|webp|application/pdf`) rejects; forcing JPEG kills that
class of 400s deterministically; (2) **bandwidth**: rural intermittent connectivity — downscaling
keeps payloads small and under 10MB. Always-on beats conditional branching on unreliable source
metadata. `manipulateAsync` is deprecated; verify exact method names against the installed package.

### D5 — Reusable `AttachmentsSection(ownerType, ownerId)` + `AuthedImage`
**Choice**: one component wraps `useAttachments`/`useUploadAttachment`/`useDeleteAttachment` in
`QueryBoundary`/`EmptyState`, gates writes on `useOnline()`, and renders `AuthedImage` thumbnails.
**Alternatives**: bespoke per-owner-type screens.
**Rationale**: the API contract is owner-agnostic (`?ownerType=&ownerId=`), and both v1 surfaces
(Patient now, Treatment stretch) need identical list+upload+delete. One parameterized component makes
PR2 (Treatment) a near-zero-code reuse and matches the mobile foundation's existing shared-wrapper
idiom.

### D6 — v1 surface: Patient "Fotos" tab; Treatment = PR2 stretch; AttentionSession DEFERRED
**Choice**: wire `AttachmentsSection ownerType="Patient"` as a 5th segmented-control tab on
`PatientDetailScreen`. Treatment-nested (`ownerType="Treatment"`) is optional PR2. **No** attachment
affordance anywhere for `ownerType="AttentionSession"`.
**Alternatives**: ship AttentionSession attachments in v1.
**Rationale**: `AttachmentAuthorizer` allows Patient/Treatment to **any staff** once the owner exists
(`ExistsThenAllowStaff`) — safe and matches what the mobile client can express. AttentionSession uses
`AuthorizeSession` (collaborator-only: `collaboratorId == userId || isAdmin`), which collides with
#6's still-unverified "`collaboratorId` resolves to self" assumption and with SessionsTab listing
**all** collaborators' sessions — a Member could attach to another's session and get denied. Defer
explicitly (not silently) until #6's smoke confirms self-id.

### D7 — Config: `expo-image-picker` plugin + Spanish permission strings
**Choice**: add `['expo-image-picker', { cameraPermission, photosPermission }]` to `app.config.ts`
plugins with Spanish strings; runtime `requestCamera/MediaLibraryPermissionsAsync` before launch.
**Alternatives**: no config plugin (relies on defaults / English strings).
**Rationale**: the plugin writes the iOS `NSCamera/PhotoLibraryUsageDescription` strings that
`expo prebuild`/EAS need; Spanish-first is a project convention. `expo-image-manipulator` and
`expo-image` need no config plugin. Install all three via `npx expo install` (SDK-55 version pinning).

### D8 — Connectivity policy: online-gated writes, offline reads
**Choice**: gate "Tomar foto"/"Elegir de galería"/upload/delete behind `useOnline()` + `OfflineBanner`;
lists render from the persisted MMKV query cache; image binaries served from expo-image's disk cache.
**Alternatives**: an offline upload queue.
**Rationale**: online-first-write matches every other mobile mutation (treatments, sessions). Reads
already survive offline via the existing `PersistQueryClientProvider`; expo-image's disk cache serves
repeat thumbnail views with no extra code. An offline upload queue is out of scope for v1.

---

## Upload pipeline sequence

```
[Fotos tab] ──tap "Tomar foto"/"Elegir"──▶ useOnline()? ──no──▶ disabled + OfflineBanner
      │ yes
      ▼
requestCamera/MediaLibraryPermissionsAsync ──denied──▶ graceful Spanish alert, no crash
      │ granted
      ▼
launchCamera/ImageLibraryAsync({ mediaTypes: ['images'] }) ──canceled──▶ no-op
      │ asset.uri
      ▼
ImageManipulator.manipulate(uri).resize({width:1600}).renderAsync().saveAsync({JPEG, compress:0.75})
      │ out.uri  (always JPEG, ~1600px, «10MB)
      ▼
payload = { uri: out.uri, name: 'photo.jpg', type: 'image/jpeg' }
      ▼
upload.mutateAsync({ file: payload, onProgress: setProgress })
   └─ attachmentsApi.upload → axios POST /attachments?ownerType=Patient&ownerId=…  (Bearer + onUploadProgress)
      ▼ onSuccess
qc.invalidateQueries(['attachments','Patient',ownerId]) ──▶ list refetch ──▶ AuthedImage renders thumbnail
```

Gallery display is independent of the axios client: `AuthedImage` hits
`env.API_BASE_URL + downloadUrl` directly with a reactive Bearer header via expo-image.

---

## Code sketches

**`packages/core/src/types/attachment.types.ts`** (add)
```ts
// Platform-agnostic multipart payload. Web passes a DOM Blob/File; React Native passes
// { uri, name, type }. See attachments.api.ts for why the union needs one localized cast.
export type AttachmentPayload = Blob | { uri: string; name: string; type: string }
```

**`packages/core/src/api/modules/attachments.api.ts`** (upload diff)
```ts
upload: (ownerType: AttachmentOwnerType, ownerId: string, payload: AttachmentPayload,
         onProgress?: (percent: number) => void) => {
  const formData = new FormData()
  // Web DOM (string|Blob) vs RN (string|{uri,name,type}): neither ambient FormData.append
  // signature accepts this union — one localized cast beats platform-forking this module.
  formData.append('file', payload as any)
  return getApiClient()
    .post<AttachmentResponse>(BASE, formData, {
      params: { ownerType, ownerId },
      // No manual Content-Type: let axios/RN emit `multipart/form-data; boundary=…` (D2b).
      onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100)) },
    })
    .then((r) => r.data)
}
```

**`packages/core/src/hooks/attachments/useAttachments.ts`** (useUploadAttachment diff)
```ts
return useMutation({
  // KEEP the key `file` (retype only) so web's upload.mutateAsync({file,onProgress}) still
  // compiles — a DOM File is assignable to AttachmentPayload's Blob branch (D1b).
  mutationFn: ({ file, onProgress }: { file: AttachmentPayload; onProgress?: (percent: number) => void }) =>
    attachmentsApi.upload(ownerType, ownerId, file, onProgress),
  onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(ownerType, ownerId) }),
})
```

**`apps/web/.../AttachmentsTab.tsx`** — NO CHANGE. Line 55 stays
`await upload.mutateAsync({ file, onProgress: setProgress })`; `file` is a DOM `File`, assignable to
`AttachmentPayload`. Verified green via the build/lint regression gate (D1b).

**`apps/mobile/src/components/attachments/AuthedImage.tsx`** (new)
```tsx
import { Image, type ImageStyle } from 'expo-image'
import { useAuthStore } from '../../store/auth.store'
import { env } from '../../config/env'

export function AuthedImage({ downloadUrl, style }: { downloadUrl: string; style?: ImageStyle }) {
  const token = useAuthStore((s) => s.accessToken) // reactive across 401-refresh rotation
  return (
    <Image
      style={style}
      contentFit="cover"
      source={{ uri: env.API_BASE_URL + downloadUrl, headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
    />
  )
}
```

**`apps/mobile/src/components/attachments/pickAndUpload.ts`** (new — UI-layer helper)
```ts
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator' // verify names vs installed pkg
import type { AttachmentPayload } from 'core/types/attachment.types'

export async function pickAndUpload(
  source: 'camera' | 'library',
  upload: { mutateAsync: (v: { file: AttachmentPayload; onProgress?: (p: number) => void }) => Promise<unknown> },
  onProgress: (p: number | null) => void,
): Promise<void> {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return // caller shows a Spanish permission-denied alert

  const res = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
  if (res.canceled) return

  // ALWAYS: force JPEG + downscale (HEIC guard + bandwidth lever, D4).
  const ctx = ImageManipulator.manipulate(res.assets[0].uri)
  ctx.resize({ width: 1600 })
  const rendered = await ctx.renderAsync()
  const out = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.75 })

  const payload: AttachmentPayload = { uri: out.uri, name: 'photo.jpg', type: 'image/jpeg' }
  onProgress(0)
  try { await upload.mutateAsync({ file: payload, onProgress }) }
  finally { onProgress(null) }
}
```

**`apps/mobile/src/components/attachments/AttachmentsSection.tsx`** (new — shape)
```tsx
export function AttachmentsSection({ ownerType, ownerId }: { ownerType: AttachmentOwnerType; ownerId: string }) {
  const { t } = useTranslation()
  const online = useOnline()
  const { data, isLoading, isError } = useAttachments(ownerType, ownerId)
  const upload = useUploadAttachment(ownerType, ownerId)
  const del = useDeleteAttachment(ownerType, ownerId)
  const [progress, setProgress] = useState<number | null>(null)
  // Two buttons ("Tomar foto"/"Elegir de galería") disabled when !online → pickAndUpload(source, upload, setProgress)
  return (
    <QueryBoundary isLoading={isLoading} isError={isError} data={data}
      isEmpty={(d) => d.length === 0} emptyMessageKey="attachments.empty">
      {(list) => /* grid of <AuthedImage downloadUrl={a.downloadUrl}/> + per-row delete gated on `online` */}
    </QueryBoundary>
  )
}
```

**`apps/mobile/.../PatientDetailScreen.tsx`** (Fotos tab wiring)
```tsx
type TabId = 'overview' | 'treatments' | 'sessions' | 'comments' | 'photos'
const TABS = [ /* …existing four… */ { id: 'photos', labelKey: 'patients.tab.photos' } ]
// inside the panel:
{tab === 'photos' && <AttachmentsSection ownerType="Patient" ownerId={patientId} />}
```

**`apps/mobile/app.config.ts`** (plugin entry)
```ts
plugins: [
  'expo-localization',
  '@react-native-community/datetimepicker',
  ['expo-image-picker', {
    cameraPermission: 'Permite a HouseCenter usar la cámara para adjuntar fotos.',
    photosPermission: 'Permite a HouseCenter acceder a tus fotos para adjuntarlas.',
  }],
],
```

**`i18n/locales/es.json`** — add `patients.tab.photos: "Fotos"` and an `attachments` namespace:
`empty`, `takePhoto` ("Tomar foto"), `chooseFromLibrary` ("Elegir de galería"), `delete`,
`deleteConfirm`, `permissionDenied`, `uploading`.

---

## Build/PR sequence

Two ordered, independently green PRs, each ≤400 lines, conventional commits, one work unit each.

| PR | Scope | Gate / smoke |
|----|-------|--------------|
| **PR1 — Core `AttachmentPayload` fix + mobile capture/upload/gallery (Patient "Fotos")** | core type + api cast + hook retype (D1/D1b/D2b); `npx expo install` deps; `expo-image-picker` plugin (D7); `AuthedImage` + `pickAndUpload` + `AttachmentsSection` (D3/D4/D5); Fotos tab wired on PatientDetailScreen (D6); es.json | `pnpm --filter core exec tsc -b`; **web regression** `pnpm --filter web build && lint` (shared code); `pnpm --filter mobile exec tsc --noEmit`; `npx expo-doctor`; `npx expo export`; Human/EAS smoke: real iPhone HEIC → JPEG «10MB uploads, progress renders, Bearer-gated thumbnail displays |
| **PR2 — Treatment-level attachments (optional stretch)** | reuse `AttachmentsSection ownerType="Treatment"` nested in TreatmentsTab's expanded card | mobile typecheck/doctor/export; smoke: attach + view on a treatment. Only if PR1 fits budget with Patient alone (it should) |

Core fix + mobile pipeline ship together in PR1 because the mobile feature cannot type-check until
the core payload fix lands (they are the same compile unit under mobile's tsc).

---

## Verification

No test runner (`strict_tdd: false`) — verify by typecheck/lint/build/export/doctor + code trace +
Human/EAS smoke.

| Check | Command | Expected |
|-------|---------|----------|
| Core typecheck | `pnpm --filter core exec tsc -b` | exits 0 |
| Web regression | `pnpm --filter web build && pnpm --filter web lint` | pass; `AttachmentsTab.tsx` unchanged, still `{file,onProgress}` |
| Mobile typecheck | `pnpm --filter mobile exec tsc --noEmit` | exits 0 |
| Expo config | `npx expo-doctor` (in `apps/mobile`) | no failing checks |
| Bundlable | `npx expo export` (in `apps/mobile`) | export succeeds |
| Cast localized | trace `attachments.api.ts` | exactly one `payload as any`, at `formData.append` only, commented |
| Manipulator API | trace pipeline | `manipulate().resize().renderAsync().saveAsync`, never `manipulateAsync` |
| Write-gating | trace upload/delete handlers | `useOnline()` guard + `OfflineBanner` before every mutate |
| No forbidden UI | trace SessionsTab / mobile app | no attachment affordance for `ownerType='AttentionSession'` |
| Human/EAS smoke | dev client vs local API, real device | pick-camera, pick-library, HEIC→JPEG downscale, upload-with-progress, authed-thumbnail all behave per spec |

---

## Rollback

- **Core fix (PR1)** is backward-compatible: web's `File` satisfies the `Blob` branch and the
  mutation key stays `file`, so `AttachmentsTab.tsx` compiles unchanged and no half-migrated state
  ships. Reverting restores `file: File` atomically. Web-regression gate guards this.
- **Mobile (PR1 pipeline + PR2)** is purely additive — new components + one new tab + additive deps +
  one config-plugin entry; no change to #5 auth or #6 patients runtime. Revert the branch
  (`feat/mobile-attachments-camera`) to remove the feature with no data or contract impact. Each
  chained PR reverts independently.

## Open questions

- [ ] **D2b RN boundary** — if a real device still 400s after removing the `Content-Type` header,
  set an explicit `multipart/form-data; boundary=…` for the RN path. Resolve via PR1 smoke.
- [ ] **D4 manipulator method names** — `manipulate/resize/renderAsync/saveAsync` + `SaveFormat`
  must be verified against the actually-installed `expo-image-manipulator` (SDK 55) — the new API
  shape shifted across recent versions. Resolve at `npx expo install` time.
