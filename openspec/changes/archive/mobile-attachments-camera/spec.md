# SDD Spec — Mobile Attachments & Camera

## Requirements

| # | Requirement |
|---|---|
| R1 | `packages/core/src/types/attachment.types.ts` MUST add `export type AttachmentPayload = Blob \| { uri: string; name: string; type: string }`. |
| R2 | `packages/core/src/api/modules/attachments.api.ts`'s `upload()` MUST retype its payload param `file: File` → `payload: AttachmentPayload`, keeping a single `formData.append('file', payload as any)` with an explanatory comment (neither DOM's `string\|Blob` nor RN's `string\|{uri,name,type}` ambient `append` signature accepts the union naturally — one localized cast). |
| R3 | `packages/core/src/hooks/attachments/useAttachments.ts`'s `useUploadAttachment` input MUST retype `file: File` → `payload: AttachmentPayload`. |
| R4 | `apps/web/src/pages/patients/AttachmentsTab.tsx` MUST compile and behave unchanged (a DOM `File` is assignable to `Blob`); `pnpm --filter web build`/`lint` MUST stay green (shared-code regression gate). |
| R5 | `apps/mobile/package.json` MUST add `expo-image-picker`, `expo-image-manipulator`, `expo-image` via `npx expo install`. |
| R6 | `apps/mobile/app.config.ts` MUST add the `expo-image-picker` config plugin with Spanish `cameraPermission`/`photosPermission` strings; no config plugin is required for manipulator/expo-image. |
| R7 | Capture MUST use `expo-image-picker` for camera OR library selection, `mediaTypes: ['images']` only, with runtime `requestCamera/MediaLibraryPermissionsAsync` and graceful handling when permission is denied. |
| R8 | The pipeline MUST ALWAYS run `expo-image-manipulator`'s new context API (`manipulate(uri).resize({width:1600}).renderAsync()` → `.saveAsync({format: SaveFormat.JPEG, compress: 0.75})`, NOT the deprecated `manipulateAsync`) on every picked image regardless of source format, forcing JPEG output, ~1600px longest-edge resize, and ~0.75 compression. |
| R9 | Upload MUST call the fixed `attachmentsApi.upload` over axios (`getApiClient()`) with FormData payload `{uri, name:'photo.jpg', type:'image/jpeg'}` and `onUploadProgress`, hitting `POST /attachments?ownerType=&ownerId=`, and MUST be gated on `useOnline()` with `OfflineBanner` shown when offline. |
| R10 | The authed gallery MUST render via a mobile `AuthedImage` component using expo-image's `<Image source.headers>` component prop (NOT `Image.loadAsync`/`prefetch`), reading the Bearer token from `useAuthStore((s)=>s.accessToken)` and resolving the absolute URL as `env.API_BASE_URL + downloadUrl` (relative). |
| R11 | A reusable `AttachmentsSection.tsx` `(ownerType, ownerId)` component MUST provide list (via `useAttachments`) + upload + delete, wrapped in `QueryBoundary`/`EmptyState` and reusing `useOnline()`. |
| R12 | v1 UI MUST surface a 5th "Fotos" tab on `PatientDetailScreen` (`ownerType='Patient'`); a Treatment-nested section (`ownerType='Treatment'`) is an OPTIONAL PR2 stretch; NO attachment affordance MUST exist for `ownerType='AttentionSession'` anywhere in the mobile app (explicitly deferred, not silent). |
| R13 | All new mobile strings MUST be Spanish-first (i18n `es`); no test runner exists (`strict_tdd:false`) — verification MUST rely on `tsc`/`expo-doctor`/`expo export`/web build plus code trace, with camera/upload/download/HEIC-conversion round-trips verified via Human/EAS smoke. |

## Scenarios

#### Scenario: core-payload-typechecks
Traces: R1, R2, R3
- GIVEN `AttachmentPayload` is added and `attachmentsApi.upload`/`useUploadAttachment` are retyped
- WHEN `pnpm --filter core exec tsc -b` runs
- THEN it exits 0 with no type errors

#### Scenario: web-build-unbroken
Traces: R2, R4
- GIVEN `AttachmentsTab.tsx` is unchanged and still calls `upload.mutateAsync({file, onProgress})` with a DOM `File`
- WHEN `pnpm --filter web build` and `pnpm --filter web lint` run
- THEN both pass with no regressions (DOM `File` is assignable to `Blob` under the new `AttachmentPayload` union)

#### Scenario: mobile-typechecks
Traces: R5, R6, R7, R8, R9, R10, R11, R12
- GIVEN all mobile deps, config, components, pipeline, and the Fotos tab are implemented
- WHEN `pnpm --filter mobile exec tsc --noEmit` runs
- THEN it exits 0 with no type errors

#### Scenario: expo-doctor-clean
Traces: R5, R6
- GIVEN `expo-image-picker`/`expo-image-manipulator`/`expo-image` are installed and the picker config plugin + Spanish permission strings are added to `app.config.ts`
- WHEN `npx expo-doctor` runs in `apps/mobile`
- THEN no failing checks are reported

#### Scenario: expo-export-bundles
Traces: R5, R6, R7, R8, R9, R10, R11, R12
- GIVEN the full pick→manipulate→upload pipeline and Fotos tab are wired
- WHEN `npx expo export` runs in `apps/mobile`
- THEN the export succeeds with no bundling errors

#### Scenario: fotos-tab-renders
Traces: R11, R12
- GIVEN `AttachmentsSection` wraps `useAttachments(ownerType='Patient', ownerId)` in `QueryBoundary`/`EmptyState`
- WHEN code-traced against `PatientDetailScreen`'s segmented-control `TABS` array and `AppProviders`'s persisted query cache
- THEN "Fotos" renders as the 5th tab, and a previously-fetched attachment list displays from the MMKV-persisted cache while offline

#### Scenario: pick-camera **(Human/EAS smoke)**
Traces: R7
- GIVEN a Member taps "Tomar foto" on a dev client with camera permission not yet granted
- WHEN the OS permission prompt is accepted
- THEN `expo-image-picker` returns a captured image asset and the manipulate step begins; on deny, the flow surfaces a graceful message with no crash

#### Scenario: pick-library **(Human/EAS smoke)**
Traces: R7
- GIVEN a Member taps "Elegir de galería" with library permission not yet granted
- WHEN the OS permission prompt is accepted and an image is selected
- THEN `expo-image-picker` returns the selected image asset (images only) and the manipulate step begins

#### Scenario: heic-to-jpeg-downscale **(Human/EAS smoke)**
Traces: R8
- GIVEN an iPhone photo picked in native HEIC format
- WHEN `expo-image-manipulator`'s `manipulate(uri).resize({width:1600}).renderAsync().saveAsync({format:JPEG, compress:0.75})` runs (verified against the pipeline code, never the deprecated `manipulateAsync`)
- THEN the output is always JPEG, resized to ~1600px on the longest edge, and well under the API's 10MB cap and `{image/jpeg,image/png,image/webp,application/pdf}` allowlist

#### Scenario: upload-with-progress **(Human/EAS smoke)**
Traces: R9
- GIVEN a manipulated JPEG and a valid session against a running API
- WHEN payload `{uri,name:'photo.jpg',type:'image/jpeg'}` uploads via `attachmentsApi.upload` (axios, `getApiClient()`)
- THEN `POST /attachments?ownerType=Patient&ownerId=…` succeeds, `onUploadProgress` renders visible progress, and the existing Bearer interceptor/401-refresh queue is reused transparently

#### Scenario: authed-thumbnail-displays **(Human/EAS smoke)**
Traces: R10
- GIVEN an uploaded attachment with a relative `downloadUrl`
- WHEN `AuthedImage` renders `<Image source={{uri: env.API_BASE_URL+downloadUrl, headers:{Authorization:'Bearer '+accessToken}}} />`
- THEN the thumbnail displays with no 401, and expo-image's disk cache serves repeat views

#### Scenario: delete-attachment
Traces: R11
- GIVEN `AttachmentsSection` renders a delete affordance per attachment row
- WHEN code-traced against the delete handler
- THEN it invokes the attachments delete mutation gated on `useOnline()`, and the list refetches on success with no orphaned row left rendered

#### Scenario: offline-upload-blocked
Traces: R9
- GIVEN the device has no connectivity (`useOnline()===false`)
- WHEN a Member attempts "Tomar foto"/"Elegir de galería"/upload
- THEN `OfflineBanner` is visible and the capture/upload entry points are disabled (code trace of the gating guard)

#### Scenario: attentionsession-attach-absent
Traces: R12
- GIVEN `SessionsTab` renders AttentionSession rows
- WHEN code-traced for any attachment affordance
- THEN no "attach photo"/`AttachmentsSection` instance exists anywhere for `ownerType='AttentionSession'` (explicit v1 scope exclusion, not silent)

## Core fix contract

```ts
// packages/core/src/types/attachment.types.ts
export type AttachmentPayload = Blob | { uri: string; name: string; type: string }
```

```ts
// packages/core/src/api/modules/attachments.api.ts
upload: (
  ownerType: AttachmentOwnerType,
  ownerId: string,
  payload: AttachmentPayload,
  onProgress?: (pct: number) => void,
) => {
  const formData = new FormData()
  // Web DOM (`Blob`/`File`) vs RN (`{uri,name,type}`): neither ambient `FormData.append`
  // signature (DOM: string|Blob; RN: string|{uri,name,type}) accepts this union naturally —
  // one localized cast beats platform-forking this module.
  formData.append('file', payload as any)
  return getApiClient()
    .post<AttachmentResponse>(`/attachments?ownerType=${ownerType}&ownerId=${ownerId}`, formData, {
      onUploadProgress: onProgress ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total ?? e.loaded))) : undefined,
    })
    .then((r) => r.data)
}
```

`useUploadAttachment` (in `hooks/attachments/useAttachments.ts`) mirrors the same retype: input
`{ ownerType, ownerId, payload: AttachmentPayload, onProgress? }`, calling `attachmentsApi.upload`
unchanged otherwise.

## Mobile contracts

- **`AttachmentsSection.tsx`** — props `{ ownerType: AttachmentOwnerType; ownerId: string }`; renders
  `useAttachments(ownerType, ownerId)` list inside `QueryBoundary`/`EmptyState`, an upload
  entry-point (camera/library) gated on `useOnline()`, and a delete affordance per row.
- **`AuthedImage.tsx`** — props `{ downloadUrl: string }`; reads
  `useAuthStore((s) => s.accessToken)`; renders expo-image
  `<Image source={{ uri: env.API_BASE_URL + downloadUrl, headers: accessToken ? { Authorization: 'Bearer ' + accessToken } : undefined }} />`
  — component `source.headers`, never `loadAsync`/`prefetch`.
- **Pipeline** — `expo-image-picker` (camera or library, `mediaTypes:['images']`) → ALWAYS
  `expo-image-manipulator` new API (`manipulate(uri).resize({width:1600}).renderAsync().saveAsync({format:SaveFormat.JPEG, compress:0.75})`)
  → payload `{uri, name:'photo.jpg', type:'image/jpeg'}` → `attachmentsApi.upload` (axios).
- **"Fotos" tab** — a 5th entry added to `PatientDetailScreen`'s segmented-control `TABS` array;
  renders `<AttachmentsSection ownerType="Patient" ownerId={patientId} />`. Treatment-nested
  (`ownerType="Treatment"`) is an optional PR2 stretch using the same component. AttentionSession is
  out of scope for v1 (deferred, see R12).

## Verification rules

| Check | Command | Expected |
|---|---|---|
| Core typecheck | `pnpm --filter core exec tsc -b` | exits 0 |
| Web regression | `pnpm --filter web build && pnpm --filter web lint` | both pass; `AttachmentsTab.tsx` unchanged |
| Mobile typecheck | `pnpm --filter mobile exec tsc --noEmit` | exits 0 |
| Expo config sanity | `npx expo-doctor` (in `apps/mobile`) | no failing checks |
| Mobile bundlable | `npx expo export` (in `apps/mobile`) | export succeeds |
| Cast localization | code trace of `attachments.api.ts` | exactly one `payload as any` cast, at `formData.append` only, with explanatory comment |
| Manipulator API | code trace of the pipeline | uses `manipulate().resize().renderAsync().saveAsync`, never deprecated `manipulateAsync` |
| Write-gating | code trace of upload/delete submit handlers | `useOnline()` guard + `OfflineBanner` present before every mutate call |
| No forbidden UI | code trace of `SessionsTab`/mobile app | no attachment affordance for `ownerType='AttentionSession'` |
| Human/EAS smoke | manual dev-client run against local API (`:5080`) with real device camera/library | pick-camera, pick-library, heic-to-jpeg-downscale, upload-with-progress, authed-thumbnail-displays all behave per the Scenarios marked **(Human/EAS smoke)** |
