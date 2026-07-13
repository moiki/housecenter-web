# Exploration — Mobile Attachments & Camera (Change #7)

## Summary

Change #7 is a **cross-cutting core fix + a focused mobile feature**. The blocking prerequisite is real: `packages/core/src/api/modules/attachments.api.ts` types its `upload()` param as a browser `File` and does `formData.append('file', file)` — under mobile's TypeScript program this fails on the wrong *shape* (RN's ambient `FormData.append` wants `{uri,name,type}`, DOM's wants `Blob`). Beyond the fix, the mobile feature is straightforward: `expo-image-picker` (camera+library) → `expo-image-manipulator`'s new context API (JPEG + resize) → axios multipart reusing core's existing interceptor → `expo-image` with a `headers` source prop for the Bearer-gated gallery. The one real design risk: **AttentionSession's stricter ownership check** (collaborator-only) colliding with #6's still-unresolved "collaboratorId resolves to self" assumption.

**Confidence: Medium-High.** High on the core File/FormData debt shape (read RN's ambient type declarations), the API contract (read the C#), the mobile foundation reuse, and expo-image header support (confirmed via current docs). Medium on exact `expo-image-manipulator` new-API method names (docs summarized, package not yet installed) and the AttentionSession-ownership UX interaction (inherits #6's open question).

## Confirmed

1. **Core File/FormData debt is a shape mismatch, and it's real.**
   - `packages/core/src/api/modules/attachments.api.ts:11-23` — `upload(ownerType, ownerId, file: File, onProgress)` → `formData.append('file', file)`.
   - `packages/core/tsconfig.json:5` `"lib": ["ES2023","DOM"]` → core's own `tsc -b` resolves `File`/`FormData`/`Blob` to DOM shapes; fine in isolation.
   - `apps/mobile/tsconfig.json:5` `"lib": ["ES2023"]` (no DOM). But every mobile screen imports `react-native`, whose ambient globals (`node_modules/react-native/src/types/globals.d.ts`, `types_generated/Libraries/Network/FormData.d.ts`) declare `FormData.append(key, value: FormDataValue)` where `FormDataValue = string | { name?; type?; uri: string }`. So `file: File` RESOLVES (RN declares File too), but `formData.append('file', file)` does NOT type-check (a File/Blob has no `uri`). Confirmed at the shape level — the "browser-only File" debt is real. (No root tsconfig/project-refs — 3 independent tsc programs.)
   - `packages/core/src/hooks/attachments/useAttachments.ts:17-24` (`useUploadAttachment`) has the same `file: File` — same fix radius.
   - `packages/core/src/types/attachment.types.ts:1-14` — `AttachmentOwnerType='Patient'|'Treatment'|'AttentionSession'|'ConsultationMessage'`; `AttachmentResponse{id,ownerType,ownerId,fileName,contentType,sizeBytes,uploadedByUserId,createdDate,downloadUrl}`. No File usage — clean.

2. **Web callers to keep working**: `apps/web/src/pages/patients/AttachmentsTab.tsx:48-61` (`upload.mutateAsync({file,onProgress})` from an `<input type=file>`) and `components/attachments/AttachmentThumbnail.tsx` (calls `downloadBlob(id)`, unaffected). A web `File` is assignable to `Blob`, so a payload type that includes `Blob` needs no web behavior change.

3. **API contract (HouseCenter.Api)** — `AttachmentEndpoints.cs`: `POST /attachments?ownerType=&ownerId=` (single `IFormFile file`, `.DisableAntiforgery()`); `GET /attachments?ownerType=&ownerId=` (plain array); `GET /attachments/{id}` streams via `Results.File` (**Bearer-gated — a bare expo-image uri without headers 401s**); `DELETE /attachments/{id}`. `UploadAttachment.cs` validates size>0, ≤10MB (`FileStorageOptions.cs`), contentType ∈ **{image/jpeg, image/png, image/webp, application/pdf} — NO HEIC**. `DownloadUrl = "/attachments/{id}"` (relative). Storage local-disk (Phase 1).

4. **AttachmentAuthorizer.cs ownership differs by owner type**: Sponsors always denied. **Patient/Treatment = `ExistsThenAllowStaff`** (any staff once the owner exists — no ownership check). **AttentionSession = `AuthorizeSession`** — requires `collaboratorId == userId || isAdmin` (ONLY the session's collaborator or Owner/Admin). ConsultationMessage checks opener/assigned-doctor — out of scope (#8).

5. **Mobile stack facts (verified live)**: Expo `~55`, RN `0.83.6`, axios `^1.17`; no picker/manipulator/expo-image deps yet.
   - `expo-image-picker` — SDK 55 compat; camera+library; config-plugin `cameraPermission`/`photosPermission` set iOS usage strings; runtime `requestCamera/MediaLibraryPermissionsAsync`.
   - `expo-image-manipulator` — **`manipulateAsync` is DEPRECATED.** New API: `ImageManipulator.manipulate(uri).resize({width}).renderAsync()` → `.saveAsync({format: SaveFormat.JPEG, compress: 0.7-0.8})`. Same capability (JPEG + resize ~1600px + compress), different call shape. Verify exact method names against the installed package.
   - `expo-image` — `source={{ uri, headers: { Authorization } }}` IS supported on `<Image>`. `Image.loadAsync` does NOT reliably send headers (docs gap, issues #33412/#34723). Use the `<Image>` component's `source.headers` directly; do NOT build a manual prefetch/loadAsync path.
   - `app.config.ts:21` plugins = `['expo-localization','@react-native-community/datetimepicker']`; no camera/photo permission strings yet.

6. **Auth/token plumbing for the gallery**: `apps/mobile/src/store/auth.store.ts` (core `createAuthStore`) exposes reactive `accessToken`. A mobile component does `useAuthStore((s)=>s.accessToken)` for expo-image's `headers` (live across refresh-rotation). `downloadUrl` is RELATIVE → prefix with `env.API_BASE_URL` (`config/env.ts`) since expo-image hits the URL directly, not via axios. `api/client.ts` (shared createApiClient with Bearer interceptor + 401 queue) is reusable for multipart upload with `onUploadProgress`.

7. **Mobile UI foundation reusable**: `components/shared/{QueryBoundary,EmptyState}`, `hooks/useOnline.ts`, `PatientDetailScreen.tsx` (`TABS` array + segmented-control — a 5th tab is low-risk), `TreatmentsTab`/`SessionsTab` (expand-card → inline nested section idiom).

8. **`AttentionSessionResponse` exposes `collaboratorId`**, and `SessionsTab` lists ALL sessions for the patient (no "my sessions only" filter). Combined with #4 above, a Member could attempt to attach to another collaborator's session → API denies.

9. **No test runner** anywhere (`strict_tdd:false`, `testing.layers.unit.available:false`). Verify via typecheck+lint+build+doctor/export + human/EAS smoke for hardware.

## Discrepancies / corrections

- **`expo-image-manipulator` API name outdated in the brief** — target `ImageManipulator.manipulate().resize().renderAsync().saveAsync({format:JPEG,compress})`, not `manipulateAsync`.
- **The core fix is NOT a simple rename** — needs re-typing the payload (`Blob | {uri,name,type}`) + an explicit cast at `formData.append`, because neither DOM's (`string|Blob`) nor RN's (`string|{uri,name,type}`) ambient signature accepts the union naturally. The single most important shape decision for propose.
- **AttentionSession attach-ownership is stricter and mobile has no client signal** (NEW, not in #6): #6's SessionsTab shows all collaborators' sessions; #7 must (a) hide "attach" unless `session.collaboratorId===user.id` (inherits #6's unverified self-id), (b) surface denial gracefully, or (c) scope AttentionSession attachment OUT of v1. **Recommend (c)**, revisit after #6's smoke confirms self-id.

## Additional considerations for the proposal

- **`AttachmentPayload` (core fix)**: `export type AttachmentPayload = Blob | { uri: string; name: string; type: string }` in `attachment.types.ts`; change `upload()`'s `file: File` → `payload: AttachmentPayload`; single `formData.append('file', payload as any)` cast + explanatory comment (web File/Blob vs RN {uri,name,type}). Update `useUploadAttachment` input type. Web `AttachmentsTab.tsx` compiles unchanged (File→Blob assignable).
- **Mobile upload pipeline**: `expo-image-picker` (`mediaTypes:['images']`) → ALWAYS `expo-image-manipulator` (new API) forcing JPEG + ~1600px resize + ~0.75 compress (guards iOS HEIC + is the low-bandwidth lever) → payload `{uri, name:'photo.jpg', type:'image/jpeg'}` → fixed core `attachmentsApi.upload`.
- **Transport: axios (NOT expo-file-system)** — reuses `api/client.ts`'s Bearer interceptor + single-flight 401-refresh queue for free; `onUploadProgress` via RN XHR. expo-file-system.uploadAsync would forfeit the refresh-retry logic. Downscaled JPEGs are well under 10MB.
- **Authed gallery**: a small mobile `AuthedImage`/thumbnail reading `useAuthStore((s)=>s.accessToken)`, `<Image source={{ uri: env.API_BASE_URL + downloadUrl, headers: accessToken ? { Authorization: 'Bearer '+accessToken } : undefined }} />`. Thumbnail-first; expo-image's own disk cache handles repeat views.
- **UI surface v1**: one reusable `components/attachments/AttachmentsSection.tsx` `(ownerType, ownerId)` (list+upload+delete, QueryBoundary/EmptyState/useOnline). Primary: add a 5th **"Fotos"** tab to `PatientDetailScreen`'s `TABS` (`ownerType='Patient'` — any-staff authorized, matches segmented-control pattern). Treatment (`ownerType='Treatment'`, same any-staff) = reasonable stretch nested in TreatmentsTab. **DEFER AttentionSession** (stricter ownership + #6's unverified self-id) — explicit scope decision, not silent.
- **Config/permissions**: add `expo-image-picker` to `app.config.ts` plugins with Spanish `cameraPermission`/`photosPermission` strings; no plugin for manipulator/expo-image. `npx expo install expo-image-picker expo-image-manipulator expo-image`.
- **Offline**: attachment LIST reads persist via the existing MMKV persister; binary images cached by expo-image's own disk cache. Gate "Tomar foto"/"Elegir" behind `useOnline()`. No offline upload queue in v1 (online-first-write policy).
- **Suggested PR shape (~2 PRs)**: PR1 = core `AttachmentPayload` fix (+web regression) + mobile deps + pick→manipulate→upload pipeline in a reusable `AttachmentsSection`, used on the Patient "Fotos" tab. PR2 (stretch, only if budget) = Treatment-level attachment nested in TreatmentsTab.

## Recommendation

1. Fix core: `AttachmentPayload = Blob | {uri,name,type}` replacing `file: File` in `attachmentsApi.upload` + `useUploadAttachment`; cast at the single `formData.append`; verify web builds unchanged.
2. Mobile pipeline: `expo-image-picker` → ALWAYS `expo-image-manipulator` (new API) JPEG + ~1600px + ~0.75 → axios multipart via the existing core interceptor with `onUploadProgress`.
3. Authed gallery via `expo-image` `source.headers` (component prop, not loadAsync), token from `useAuthStore((s)=>s.accessToken)`, absolute URL `env.API_BASE_URL + downloadUrl`.
4. UI v1: Patient "Fotos" tab (5th tab) is the safe default; Treatment nested section = stretch; **defer AttentionSession attachment** pending #6's collaboratorId-self verification + its stricter ownership.
5. Add `expo-image-picker` to `app.config.ts` plugins with Spanish permission strings; no plugin for manipulator/expo-image.
6. Verify: `pnpm --filter core exec tsc -b` (payload fix) + `pnpm --filter web build`/`lint` (regression — core shared) + `pnpm --filter mobile exec tsc --noEmit` + `expo-doctor` + `expo export`. Human/EAS smoke: real iPhone HEIC photo converts + uploads <10MB, progress renders, Bearer-gated gallery thumbnail displays, attachments scoped correctly on web.

**Ready for Proposal: Yes.** Ratify: (a) the `AttachmentPayload` type + cast (core-shared, affects web), (b) axios over expo-file-system, (c) expo-image `source.headers` (not loadAsync/prefetch), (d) v1 UI = Patient (+ optional Treatment stretch), AttentionSession deferred pending #6's collaboratorId-self confirmation.
