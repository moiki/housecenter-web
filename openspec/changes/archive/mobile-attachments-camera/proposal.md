# SDD Proposal — Mobile Attachments & Camera

## Change name
`mobile-attachments-camera`

## Status
`proposed` (2026-07-13)

## Problem

Change #7 of the master plan: field Members need to capture and attach **photos** of
patients/treatments from a phone at the point of care. Two things block this today:

1. **Core File-debt (blocking prerequisite).** `packages/core/src/api/modules/attachments.api.ts`
   types `upload()`'s param as a browser `File` and does `formData.append('file', file)`. Core's
   own `tsc -b` passes (its `lib` includes `DOM`), but `apps/mobile`'s program has no `DOM` lib —
   React Native's ambient `FormData.append(key, value: FormDataValue)` accepts
   `string | { uri; name?; type? }`, so a `File`/`Blob` (no `uri`) does **not** type-check. Any
   mobile code that imports the attachments layer fails to compile. Flagged in the master plan as
   blocking for #7.
2. **No mobile capture/upload/gallery surface.** `apps/mobile` has no image-picker, no HEIC→JPEG
   step, and no way to render Bearer-gated attachment images (the download endpoint 401s a bare
   `<Image>` URI without an `Authorization` header).

Members work in rural Nicaragua on intermittent connectivity, so uploads must be downscaled
(low-bandwidth lever) and gated on being online.

## Proposed change

Two-part change: a small **cross-cutting core fix** that makes `attachments.api` payloads
platform-agnostic (web `File`/`Blob` **and** RN `{uri,name,type}`), then a focused **mobile
feature** — pick (camera/library) → force JPEG + downscale → multipart-upload via the existing
core axios client → render a Bearer-gated thumbnail gallery. v1 surfaces a **"Fotos"** tab on the
patient detail screen (`ownerType='Patient'`, any-staff authorized). Screens call **core hooks
only**, Spanish-first, writes gated on connectivity.

## Core fix

Make the shared attachments layer accept both platforms' multipart payload shapes.

| File | Change |
|---|---|
| `packages/core/src/types/attachment.types.ts` | Add `export type AttachmentPayload = Blob \| { uri: string; name: string; type: string }` |
| `packages/core/src/api/modules/attachments.api.ts` | `upload()` param `file: File` → `payload: AttachmentPayload`; keep the single `formData.append('file', payload as any)` + an explanatory comment (neither DOM's `string\|Blob` nor RN's `string\|{uri,name,type}` ambient `append` accepts the union naturally, hence one localized cast) |
| `packages/core/src/hooks/attachments/useAttachments.ts` | `useUploadAttachment` input type `file: File` → `payload: AttachmentPayload` |

Web `apps/web/src/pages/patients/AttachmentsTab.tsx` compiles unchanged: a DOM `File` is
assignable to `Blob`. Because this is shared code, PR1 carries a **web build/lint regression gate**.

## Mobile pipeline

`pick → manipulate → upload → gallery`, all reusing core/mobile foundations:

1. **Pick** — `expo-image-picker`, camera + library, `mediaTypes: ['images']`, runtime
   `requestCamera/MediaLibraryPermissionsAsync`. Entry points gated behind `useOnline()`.
2. **Manipulate (ALWAYS)** — `expo-image-manipulator` new context API:
   `ImageManipulator.manipulate(uri).resize({ width: 1600 }).renderAsync()` →
   `.saveAsync({ format: SaveFormat.JPEG, compress: ~0.75 })`. Runs on every pick regardless of
   source format — guarantees JPEG (kills iOS HEIC, which the API rejects) and downscales
   (low-bandwidth lever; result well under the 10MB cap). Verify exact method names against the
   installed package (`manipulateAsync` is deprecated).
3. **Upload** — build payload `{ uri, name: 'photo.jpg', type: 'image/jpeg' }` → core
   `attachmentsApi.upload` over **axios** (`getApiClient()` + FormData + `onUploadProgress`),
   reusing the existing Bearer interceptor + single-flight 401-refresh queue.
4. **Gallery** — a small mobile `AuthedImage`/thumbnail reads
   `useAuthStore((s) => s.accessToken)` and renders
   `<Image source={{ uri: env.API_BASE_URL + downloadUrl, headers: { Authorization: 'Bearer …' } }} />`
   (expo-image **component** `source.headers`, NOT `loadAsync`/`prefetch` — headers unreliable
   there). `downloadUrl` is relative, so prefix with `env.API_BASE_URL`. Thumbnail-first; expo-image
   disk cache handles repeat views.

UI: one reusable `apps/mobile/src/components/attachments/AttachmentsSection.tsx` `(ownerType,
ownerId)` — list (via `useAttachments`) + upload + delete, wrapped in `QueryBoundary`/`EmptyState`
and gated on `useOnline()`. v1 wires it as a 5th **"Fotos"** tab on `PatientDetailScreen`'s
segmented control (`ownerType='Patient'`). Spanish i18n throughout.

## Scope

- Core fix: `AttachmentPayload` type + `attachmentsApi.upload` + `useUploadAttachment` (+ web
  regression gate).
- Mobile deps via `npx expo install expo-image-picker expo-image-manipulator expo-image`.
- `app.config.ts`: add `expo-image-picker` plugin with Spanish `cameraPermission`/`photosPermission`
  strings (no plugin needed for manipulator/expo-image).
- `AttachmentsSection` (list + upload + delete) + `AuthedImage` thumbnail.
- pick → manipulate → upload pipeline wired on the Patient **"Fotos"** tab.
- Treatment-level section (`ownerType='Treatment'`, same any-staff auth) nested in TreatmentsTab —
  **optional PR2 stretch**.
- Spanish-first i18n.

## Out of scope

- **AttentionSession attachment — DEFERRED** (see Open Q5): stricter collaborator-only ownership
  (`AttachmentAuthorizer` `AuthorizeSession`) collides with #6's unverified `collaboratorId===self`
  assumption and SessionsTab showing all collaborators' sessions. Revisit after #6's human smoke.
- ConsultationMessage attachments (→ #8).
- Push notifications (→ #9).
- Offline upload queue (online-first-write policy; LIST reads still work offline via MMKV, images
  via expo-image disk cache).
- Any backend/API change (contract already supports the flow).

## Open questions (positions taken)

| # | Question | Position taken |
|---|---|---|
| 1 | `AttachmentPayload` type + how to satisfy `formData.append` | **`Blob \| {uri,name,type}`** with a single localized `payload as any` cast at `formData.append` + explanatory comment. Neither DOM's (`string\|Blob`) nor RN's (`string\|{uri,name,type}`) ambient `append` signature accepts the union naturally; one cast beats platform-forking the api module. |
| 2 | Upload transport | **axios** (`getApiClient()`), NOT `expo-file-system.uploadAsync`. Reuses core's Bearer interceptor + single-flight 401-refresh queue + `onUploadProgress` for free; expo-file-system would forfeit refresh-retry. Downscaled JPEGs are well under 10MB. |
| 3 | Authed image display | **expo-image `<Image source.headers>`** (component prop), NOT `Image.loadAsync`/`prefetch` — headers are unreliable on those paths (docs gap, issues #33412/#34723). |
| 4 | HEIC→JPEG handling | **ALWAYS** run `expo-image-manipulator` (new `manipulate().resize().renderAsync().saveAsync` API, NOT deprecated `manipulateAsync`) forcing JPEG + ~1600px resize + ~0.75 compress, regardless of source format. Guards iOS HEIC (API rejects it) and is the low-bandwidth lever. |
| 5 | v1 UI scope | **Patient "Fotos" tab** (any-staff via `ExistsThenAllowStaff` — safe). Treatment nested = optional PR2 stretch (same any-staff auth). **AttentionSession attachment DEFERRED** — stricter ownership + #6's unverified self-id. Explicit, not silent. |
| 6 | Config/permissions | **`expo-image-picker` plugin** in `app.config.ts` with Spanish permission strings. No config plugin for manipulator/expo-image. |

## Affected files / packages

- `packages/core/src/types/attachment.types.ts` — **new** `AttachmentPayload` type.
- `packages/core/src/api/modules/attachments.api.ts` — `upload()` param retype + cast comment.
- `packages/core/src/hooks/attachments/useAttachments.ts` — `useUploadAttachment` input retype.
- `apps/web/src/pages/patients/AttachmentsTab.tsx` — no code change; **regression-gated** (build/lint).
- `apps/mobile/package.json` — add `expo-image-picker`, `expo-image-manipulator`, `expo-image`.
- `apps/mobile/app.config.ts` — add `expo-image-picker` plugin + Spanish permission strings.
- `apps/mobile/src/components/attachments/AttachmentsSection.tsx` — **new** (list + upload + delete).
- `apps/mobile/src/components/attachments/AuthedImage.tsx` — **new** (Bearer-gated thumbnail).
- `apps/mobile/src/screens/.../PatientDetailScreen.tsx` — add 5th "Fotos" tab.
- Reuse (no change): `components/shared/{QueryBoundary,EmptyState}`, `hooks/useOnline.ts`,
  `store/auth.store.ts`, `config/env.ts`, `api/client.ts`, i18n `es`.

## Delivery plan (chained PRs)

Two ordered, independently green PRs, each ≤400 lines.

| PR | Scope | Gate / smoke |
|---|---|---|
| **PR1 — Core `AttachmentPayload` fix + mobile capture/upload/gallery (Patient "Fotos")** | Core fix (type + api + hook); mobile deps; `expo-image-picker` config plugin; `AttachmentsSection` + `AuthedImage`; pick→manipulate→upload pipeline wired on the Patient "Fotos" tab | `core tsc -b` + **web build/lint regression** (shared); mobile `tsc --noEmit`, `expo-doctor`, `expo export`; human/EAS smoke: real iPhone HEIC photo → JPEG <10MB uploads, progress renders, Bearer-gated thumbnail displays |
| **PR2 — Treatment-level attachments (optional stretch)** | Reuse `AttachmentsSection` with `ownerType='Treatment'` nested in TreatmentsTab | typecheck/doctor/export; smoke: attach + view on a treatment. Only if PR1 fits budget with Patient alone (it should) |

No test runner (`strict_tdd:false`) — verify via `tsc` / `expo-doctor` / `expo export` / web build;
conventional commits, ≤400 lines/PR, one work unit per PR.

## Rollback plan

- **Core fix (PR1)** is backward-compatible: web's `File` is assignable to `Blob`, so
  `AttachmentsTab.tsx` compiles unchanged and no half-migrated state ships; reverting restores
  `file: File` atomically.
- **Mobile (PR1 pipeline + PR2)** is purely additive — new components + one new tab + additive deps
  and one config-plugin entry; no change to #5 auth or #6 patients runtime. Revert the branch
  (`feat/mobile-attachments-camera`) to remove the feature with no data or contract impact. Each
  chained PR reverts independently.
