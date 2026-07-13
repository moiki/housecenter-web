# Tasks: Mobile Attachments & Camera

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated reviewable lines | ~350–420 across design.md's "PR1" (core fix + full mobile pipeline); PR2 optional +10–20 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 3 stacked work units — **PR1a** (core fix + regression gate + deps/config + `AuthedImage`/`pickAndUpload`) → **PR1b** (`AttachmentsSection` + Fotos tab + i18n) → **PR2** optional (Treatment reuse) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

**Basis:** core diff is small (~25 lines: `attachment.types.ts` +4, `attachments.api.ts` ~12,
`useAttachments.ts` ~6) plus deps/config (~9: `package.json` +3, `app.config.ts` +6) plus
`AuthedImage.tsx` (new, ~25) + `pickAndUpload.ts` (new, ~50) ≈ **~110 lines for PR1a**.
`AttachmentsSection.tsx` is a new full CRUD component (list+upload+delete+progress+permission
alerts) sized against the closest precedent in this repo, `SessionsTab.tsx` (181 lines, list +
expand-panel + RHF form + pagination + styles) — plausible range 180–250 lines. Add
`PatientDetailScreen.tsx` tab wiring (~10, confirmed small by reading the current 87-line file:
one `TabId` union entry, one `TABS` push, one render line) + `es.json` (+12) ≈ **~220–270 lines
for PR1b**. design.md frames both as one "PR1" because the mobile feature cannot type-check
until the core fix lands (same tsc compile unit) — that *dependency* is preserved, but the
*review unit* is split into two stacked PRs so no single PR risks exceeding budget. PR2
(Treatment reuse, ~10–20 lines) stays a separate, optional, comfortably-small PR regardless.

**Risks:**
- **D1b** — the hook's mutation-variable key MUST stay `file` (retype only, never rename to
  `payload`); web's `AttachmentsTab.tsx` calls `upload.mutateAsync({file, onProgress})` verbatim —
  renaming breaks the mandatory web regression gate silently at review time if missed.
- **D2b** — dropping the hardcoded `Content-Type: multipart/form-data` header is a shared-code
  edit (re-runs under web regression); if a real RN device still 400s in the PR1b smoke, the
  fallback is an explicit `multipart/form-data; boundary=…` — flag, don't silently patch without
  re-verifying web.
- `expo-image-manipulator`'s exact new-API method names (`manipulate/resize/renderAsync/saveAsync`,
  `SaveFormat`) must be verified against the SDK-55-installed package at `npx expo install` time —
  the sketch in design.md is not guaranteed to match 1:1.
- `AttentionSession` attachment is explicitly OUT for v1 (deferred, not silent) — task 2.4 is a
  negative-space code-trace gate, easy to skip by accident.
- `strict_tdd:false` — no test runner; 5 of 14 scenarios (pick-camera, pick-library,
  heic-to-jpeg-downscale, upload-with-progress, authed-thumbnail-displays) are **Human/EAS
  smokes** requiring a real device + running API — `sdd-apply` should report these as
  "needs dev/CI env," not attempt to automate them.

## Phase 1: Core `AttachmentPayload` fix + regression gate + mobile deps/config — PR1a (~110 lines)

- [x] 1.1 `packages/core/src/types/attachment.types.ts` — add `export type AttachmentPayload = Blob | { uri: string; name: string; type: string }` with explanatory comment (R1)
- [x] 1.2 `packages/core/src/api/modules/attachments.api.ts` — retype `upload()`'s 3rd param `file: File` → `payload: AttachmentPayload`; keep single `formData.append('file', payload as any)` + comment; drop the hardcoded `Content-Type: multipart/form-data` header (R2, D1, D2b)
- [x] 1.3 `packages/core/src/hooks/attachments/useAttachments.ts` — retype `useUploadAttachment`'s mutationFn input `file: File` → `file: AttachmentPayload`, KEEP the object key `file` (R3, D1b)
- [x] 1.4 Run `pnpm --filter core exec tsc -b` — exits 0 (R1–R3 / scenario `core-payload-typechecks`)
- [x] 1.5 Run `pnpm --filter web build && pnpm --filter web lint` — both green, `AttachmentsTab.tsx` unchanged, still calls `{file, onProgress}` (R4 / scenario `web-build-unbroken`) — **MANDATORY regression gate**
- [x] 1.6 `apps/mobile/package.json` — `npx expo install expo-image-picker expo-image-manipulator expo-image` (R5)
- [x] 1.7 `apps/mobile/app.config.ts` — add `expo-image-picker` config plugin with Spanish `cameraPermission`/`photosPermission` strings (R6, D7)
- [x] 1.8 `apps/mobile/src/components/attachments/AuthedImage.tsx` — new: expo-image `<Image source={{uri, headers}}>`, Bearer token from `useAuthStore((s)=>s.accessToken)`, `uri = env.API_BASE_URL + downloadUrl` (R10, D3)
- [x] 1.9 `apps/mobile/src/components/attachments/pickAndUpload.ts` — new: `expo-image-picker` (camera/library, `mediaTypes:['images']`, permission requests) → ALWAYS `expo-image-manipulator` new API (`manipulate(uri).resize({width:1600}).renderAsync().saveAsync({format:SaveFormat.JPEG, compress:0.75})`) → builds `AttachmentPayload` (R7, R8, R9, D4)
- [x] 1.10 Verify `expo-image-manipulator`'s installed API surface matches `manipulate/resize/renderAsync/saveAsync`/`SaveFormat` exactly; adjust `pickAndUpload.ts` if the SDK-55 package differs (open question, D4)

**PR1a done when:** `pnpm --filter core exec tsc -b` exits 0; `pnpm --filter web build`/`lint` green with `AttachmentsTab.tsx` unchanged; `pnpm --filter mobile exec tsc --noEmit` exits 0; `npx expo-doctor` clean; `npx expo export` succeeds with the new deps/config/`AuthedImage`/`pickAndUpload` present but unused by any screen yet.

## Phase 2: `AttachmentsSection` + Fotos tab wiring — PR1b (~230 lines, depends on PR1a merged)

- [x] 2.1 `apps/mobile/src/components/attachments/AttachmentsSection.tsx` — new `(ownerType, ownerId)`: `useAttachments` list in `QueryBoundary`/`EmptyState`, "Tomar foto"/"Elegir de galería" buttons calling `pickAndUpload`, both gated on `useOnline()` + `OfflineBanner`, per-row delete via `useDeleteAttachment` gated the same way, thumbnails via `AuthedImage` (R11, D5, D8)
- [x] 2.2 `apps/mobile/src/screens/patients/PatientDetailScreen.tsx` — extend `TabId` union with `'photos'`, push a 5th `TABS` entry (`labelKey: 'patients.tab.photos'`), render `<AttachmentsSection ownerType="Patient" ownerId={patientId} />` in the panel (R12, D6)
- [x] 2.3 `apps/mobile/src/i18n/locales/es.json` — add `patients.tab.photos` + `attachments.{empty,takePhoto,chooseFromLibrary,delete,deleteConfirm,permissionDenied,uploading}` (R13)
- [x] 2.4 Code-trace `SessionsTab.tsx` and the rest of the mobile app — confirm NO attachment affordance exists anywhere for `ownerType='AttentionSession'` (R12 / scenario `attentionsession-attach-absent`)
- [x] 2.5 Code-trace upload/delete submit handlers in `AttachmentsSection.tsx`/`pickAndUpload.ts` — confirm `useOnline()` guard + `OfflineBanner` precede every mutate call (R9 / scenario `offline-upload-blocked`)
- [x] 2.6 Run `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, `npx expo export` with the Fotos tab wired (scenarios `mobile-typechecks`, `expo-doctor-clean`, `expo-export-bundles`, `fotos-tab-renders`)
- [ ] 2.7 Human/EAS smoke on a real device against local API (`:5080`): pick-camera, pick-library, heic-to-jpeg-downscale, upload-with-progress, authed-thumbnail-displays (R7–R10) — **needs dev/CI env**, not automatable under `strict_tdd:false`

**PR1b done when:** `tsc --noEmit`/`expo-doctor`/`expo export` all green with Fotos tab live; code traces 2.4 and 2.5 pass; all 5 Human/EAS smokes pass on a real iPhone (HEIC photo → JPEG <10MB, visible progress, Bearer-gated thumbnail renders with no 401). If smoke access is unavailable, `sdd-apply` reports it as blocked-on-env, not skipped silently.

**PR1b status (2026-07-13 apply batch):** 6/7 tasks complete. Task 2.7 (Human/EAS smoke) is explicitly BLOCKED-ON-ENV — requires a real device + running API at `:5080`, not automatable under `strict_tdd:false`. Not skipped silently; reported as pending in apply-progress.

## Phase 3 (optional stretch): Treatment-level attachments — PR2 (~10–20 lines)

- [ ] 3.1 `apps/mobile/src/screens/patients/TreatmentsTab.tsx` — nest `<AttachmentsSection ownerType="Treatment" ownerId={treatment.id} />` inside the expanded-treatment section (R12 stretch, D5 reuse)
- [ ] 3.2 Run `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, `npx expo export`
- [ ] 3.3 Human/EAS smoke: attach + view a photo on a treatment row — **needs dev/CI env**

**PR2 done when:** typecheck/doctor/export green; treatment attach+view smoke passes. Only attempt if PR1a+PR1b already landed comfortably under budget on their own (they should — this stretch is a near-zero-code reuse of `AttachmentsSection`).
