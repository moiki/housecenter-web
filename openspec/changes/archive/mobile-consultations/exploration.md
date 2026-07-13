# Exploration — Mobile Consultations: Escalate to Doctor (Change #8)

## Summary

Change #8 is a **pure mobile UI change wrapped around two non-obvious wiring problems**. Every hook/api/type the consultation screens need already exists, complete and correct, in `packages/core` (list/detail/create/postMessage/updateStatus, full query-key factory, DTOs matching the API 1:1) — nothing missing, same as #6. The real work is entirely in `apps/mobile`: three new screens + one new bottom tab, plus reconciling two things only visible by reading both repos:

1. **The `attachmentUrl` string field on `CreateConsultationRequest`/`PostMessageRequest` is dead code, not a mechanism.** Nobody — not even web — populates it (both web forms hardcode `attachmentUrl: null`; web never renders it). The real mechanism is #7's polymorphic `POST /attachments?ownerType=ConsultationMessage&ownerId={messageId}` flow, which `AttachmentAuthorizer` + core's `AttachmentOwnerType` union already support (added in #7, deferred to #8). It needs the message to exist first (ownerId = message id) → awkward extra round-trip for the FIRST message.
2. **No DTO exposes a patient's `Collaborators` to the frontend.** Mobile cannot client-side-gate the "escalate" entry point for a patient the Member doesn't attend — the API's 403 (`consultations.not_patient_collaborator`) is the only gate; the UI must handle it gracefully, not prevent it.

**Confidence: High** on the core data layer (file:line below), the API contract/validation/status lifecycle (read the C# handlers + integration tests), and web's reference flow (incl. its real gaps). Medium only on two v1 scope calls that are propose's to ratify: the nav-surface tradeoff and whether the Doctor "resolve" control ships in v1.

## Confirmed

1. **Core consultations data layer COMPLETE — nothing missing.**
   - `hooks/consultations/useConsultations.ts:10-63` — key factory `keys.all/list(filters)/detail(id)`; `useConsultations(filters)` (paged, keepPreviousData), `useConsultationDetail(id)`, `useCreateConsultation()` (invalidates all), `usePostMessage(consultationId)` (invalidates detail), `useUpdateConsultationStatus(consultationId)` (invalidates detail+all).
   - `api/modules/consultations.api.ts:15-34` — list/getDetail/create/postMessage/updateStatus, thin wrappers, `BASE='/consultations'` (unversioned).
   - `types/consultation.types.ts:1-46` — `ConsultationStatus='Open'|'UnderReview'|'Resolved'`; `ConsultationResponse{id,patientId,treatmentId,openedByUserId,assignedDoctorId,title,status,resolvedAt,isActive}`; `ConsultationMessageResponse{id,consultationId,authorId,authorName,body,attachmentUrl,createdDate}`; `ConsultationDetailResponse{consultation,messages}`; `CreateConsultationRequest{patientId,treatmentId,assignedDoctorId,title,firstMessage,attachmentUrl}`; `PostMessageRequest{body,attachmentUrl}`; `UpdateConsultationStatusRequest{status}`. Match the API C# records exactly.
   - **#8 needs ZERO new core hooks/api/types** (only one new Zod schema).

2. **API contract — two-layered policy (coarse ASP.NET + fine handler business rule).**
   - `ConsultationEndpoints.cs:16-18`: whole `/consultations` group = `StaffOnly` (Sponsor 403). `POST /` also `MemberOrAbove` (:30) — necessary not sufficient.
   - `OpenConsultation.cs:39-41`: a Member may open only if in `patient.Collaborators` (or admin) → `consultations.not_patient_collaborator` (403).
   - `OpenConsultation.cs:43-45`: `AssignedDoctorId` must be in `patient.AssignedDoctors` → `consultations.doctor_not_assigned` (400).
   - `OpenConsultation.cs:47-51`: optional `TreatmentId` must belong to the same patient.
   - `PostConsultationMessage.cs:32-36`: only opener/assigned-doctor/admin may post (`not_participant`, 403). `:38-40`: posting on `Resolved` → 409. `:51-56`: **auto Open→UnderReview when the assigned DOCTOR posts** (never any other auto-transition).
   - `UpdateConsultationStatus.cs:25-27`: the ONLY manually-requestable status is `Resolved` (Open/UnderReview → 400). `:37-39`: only assigned doctor/admin may resolve (`not_assigned_doctor`, 403) — **a Member can NEVER resolve, even their own opened case.**
   - `GetConsultationDetail.cs:28`: messages `OrderBy(CreatedDate)` ascending; participant-only view gate.
   - `ListConsultations.cs:31-38`: **role-filtered** — Member sees only ones they opened (`OpenedByUserId==userId`); Doctor only ones assigned to them; Admin/Owner all.
   - (All the above proven by `ConsultationFlowTests.cs`.)

3. **Attachment mechanism (key question, resolved).**
   - `ConsultationMessage.cs:12`: plain `AttachmentUrl` string column, set only from the request DTOs at write time; never derived from `FileAttachments`.
   - `apps/web/src/pages/consultations/{ConsultationsPage.tsx:112, ConsultationDetailPage.tsx:91}`: both **hardcode `attachmentUrl: null`**; web renders `msg.attachmentUrl` NOWHERE. **Web ships zero consultation-attachment UI.**
   - `AttachmentAuthorizer.cs:35,43-52`: `ConsultationMessage` is a first-class owner type; `AuthorizeConsultationMessage` looks up the message by id, allows opener/assigned-doctor/admin — **requires the message to exist.**
   - `attachment.types.ts:1`: `ConsultationMessage` already in the `AttachmentOwnerType` union (added in #7 for this change).
   - **Conclusion: use the polymorphic flow (send `attachmentUrl:null`, reuse #7's `useUploadAttachment('ConsultationMessage', messageId)` + `AuthedImage`).** Round-trip problem: `OpenConsultation.cs:78` returns only `ConsultationResponse` (NO message id) → attaching to the FIRST message needs create → re-fetch detail for `messages[0].id` → upload; attaching to a REPLY is simple — `PostConsultationMessage.cs:69-71` returns the new `ConsultationMessageResponse` (with id) directly.

4. **Web reference flow (2 gaps NOT to copy).**
   - `ConsultationsPage.tsx:59-90` create form: patient picker (`usePatients(1,200)` — the >100 clamp bug, out of scope); **doctor picker = `useUsers(1,100)` filtered by role Doctor — a GLOBAL list, NOT patient-scoped** (latent bug: unassigned doctor 400s). Do NOT reuse.
   - `ConsultationDetailPage.tsx:114-141`: status `select` lets ANY viewer attempt any status, relying on server 403/400 — no client role gating.
   - `ConsultationDetailPage.tsx:192-211`: reply box hidden once `Resolved` — GOOD pattern to mirror.

5. **Doctor-picker source confirmed: `usePatientFullSummary`.** `patient.types.ts:63-75` — `DoctorSummaryDto{id,firstName,lastName,email}`, `PatientFullSummaryResponse{patient,treatments,comments,assignedDoctors}` (NO `collaborators` field — confirms #2). `usePatientFullSummary(id)` already fetched by `PatientDetailScreen.tsx:40`; `assignedDoctors` on the wire, unrendered (OverviewTab documents it's intentionally not shown — a new picker consumer is legitimate). Members can't assign doctors (Owner-only) — only pick from already-assigned.

6. **RN foundation ready; nothing consultations-specific yet.** `TabNavigator.tsx:35-51` — 2 tabs (Pacientes, More), untyped `Tab.Navigator`. `PatientsStack.tsx:7-38` — `CreateSession` `presentation:'modal'` taking `{patientId}` from `PatientDetailScreen` — the create-screen precedent. `CreateSessionScreen.tsx` — RHFSelect pill row, `useOnline()`-gated submit, `goBack()` on success. `components/attachments/{AttachmentsSection,pickAndUpload,AuthedImage}` + `useAttachments` reusable. `QueryBoundary`/`EmptyState`/`useOnline` reusable. No Consultas tab/screens/schema exist.

7. **Master plan confirms surface + role scope.** Line 103: "Consultas — lista + crear (escalar a Doctor) + hilo de mensajes" (dedicated tab). Line 47: Member StaffOnly includes consultations. Lines 192-193: **Doctor is an explicit v1 secondary role for this feature** ("Doctor → consultas asignadas + responder") — Doctor reply/resolve IS in scope, the one place Admin/Doctor/Sponsor parity is intentionally granted (general parity deferred, risk #7). Line 170: #8 depends on #6+#7, ~2 PRs.

## Discrepancies / corrections

- **`attachmentUrl` string is inert/vestigial** — not the mechanism; the polymorphic `ownerType=ConsultationMessage` flow is. Contradicts a naive DTO reading.
- **Mobile cannot client-side-gate the escalate entry point** on collaborator membership (no DTO exposes it) — show unconditionally, handle the 403 with a friendly Spanish error.
- **Web's doctor picker is a bug, not a pattern** (global list, not patient-scoped) — mobile does it correctly (`assignedDoctors`), which is LESS work.
- **Web renders zero consultation-message attachments** — mobile is the sole renderer; "synced to web" can't be visually verified — verify via the API directly.
- **A Member can never resolve** (only assigned doctor/admin) — UI must not offer a status control to a Member, unlike web.
- **OpenConsultation response has no message id** — attach-on-first-message is a 3-call round trip; attach-on-reply is 1 call → argues for reply-only attach in v1.

## Additional considerations for the proposal

- **New core schema (only core touch)**: `core/schemas/consultation.schema.ts` (`createConsultationSchema` — title/firstMessage/assignedDoctorId required, treatmentId null in v1; `postMessageSchema` — body required), mirroring #6's comment/session schema hoist. Don't touch web's inline schemas.
- **Attachment UX — recommend reply-only in v1 (Option B)**: attach-on-create (Option A) needs create → re-fetch detail for `messages[0].id` → upload (+1 call + cross-screen staged payload); reply attach = post (returns id) → upload (0 extra, self-contained in the compose bar). Goal satisfied (photos attach to messages), simpler; Option A = fast-follow.
- **New mobile helper**: split `pickAndUpload.ts` into `pickPhoto(source)` (permission+pick+manipulate → `AttachmentPayload`, no upload) + keep `pickAndUpload` as a thin wrapper (zero change for existing Patient/Treatment callers). Compose bar: `pickPhoto` → stage thumbnail → on Send: `postMessage.mutateAsync` → if staged, `useUploadAttachment('ConsultationMessage', newMessage.id).mutateAsync({file:staged})` → clear → invalidate detail.
- **Read-only `MessageAttachmentThumb({messageId})`** for historical bubbles (`useAttachments('ConsultationMessage', messageId)` + `AuthedImage`, silent when empty) — do NOT reuse the full `AttachmentsSection` (its capture/delete affordances are wrong for a past message). One `useAttachments` per bubble — acceptable N+1 for tens-of-messages threads.
- **Doctor picker**: `RHFSelect` (pill row) fed by `usePatientFullSummary(patientId).assignedDoctors`. Handle `assignedDoctors.length===0` → disable/hide "Escalar a Doctor" with an explanatory message.
- **Role-conditional resolve**: render "Marcar resuelta" only when `user.id === consultation.assignedDoctorId`; never offer manual Open/UnderReview; disable compose on `Resolved` (mirror web:192). (Admin parity also out of v1 → exclude.)
- **Nav — recommend colocate-in-PatientsStack (Option A)**: new 3rd bottom tab **Consultas** (`ConsultationsListScreen` → `ConsultationDetailScreen`); `CreateConsultationScreen` colocated in `PatientsStack` (like `CreateSession`, always `{patientId}`, reached via an "Escalar a Doctor" button on `PatientDetailScreen`, `goBack()` on success). Avoids the app's first cross-tab typed navigation. No patient picker inside create; no standalone "+" on the list in v1.
- **Offline/write-gating**: reads persist via existing PersistQueryClientProvider; gate create/reply/status/attach behind `useOnline()` + `OfflineBanner`.
- **Suggested PR shape (~2 PRs)**: PR1 = core schema hoist + Consultas tab + ConsultationsListScreen + ConsultationDetailScreen (thread + compose + role-conditional resolve, no attachments). PR2 = CreateConsultationScreen (in PatientsStack, "Escalar a Doctor" button) + reply-time photo attach (pickPhoto split + MessageAttachmentThumb).
- **Verification**: core tsc (schema) + web build/lint (regression) + mobile tsc + expo-doctor + expo export. Human/EAS smoke vs :5080: (1) Member escalates a patient they attend w/ assigned doctor → 201, appears Open; (2) escalate a patient the Member does NOT attend → 403 surfaces as friendly error, no crash; (3) reply as assigned Doctor → auto Under Review; (4) attach photo to a reply → thumbnail renders in-thread + retrievable via API directly; (5) resolve as assigned doctor → compose disables, further replies 409; (6) offline: cached list/thread render, writes blocked + banner.

## Recommendation

1. **No core hook/api/type changes.** Add one schema: `core/schemas/consultation.schema.ts` (create + post-message); leave web's inline schemas untouched.
2. **Attachments**: ignore `attachmentUrl` (send null, like web); build on #7's polymorphic `ownerType=ConsultationMessage`. **Reply-only in v1** (Option B); defer attach-on-create.
3. **Doctor picker**: `RHFSelect` from `usePatientFullSummary().assignedDoctors` (patient-scoped, correcting web); handle zero-doctors edge case.
4. **Collaborator gating**: none client-side; show the entry point, handle the 403 gracefully.
5. **Status**: "Marcar resuelta" only for `user.id===assignedDoctorId`; never manual Open/UnderReview; disable compose on Resolved.
6. **Screens/nav**: 3rd bottom tab `Consultas` (list→thread); `CreateConsultationScreen` in `PatientsStack` via "Escalar a Doctor" on `PatientDetailScreen`.
7. **Reuse** #4/#6 primitives + #6 RHFSelect + #7 attachments (split `pickPhoto` + read-only `MessageAttachmentThumb`).
8. **Verify** core tsc + web build/lint + mobile tsc + expo-doctor + expo export; Human/EAS smoke for the thread/create/attach round-trip, the 403 path, and the role-conditional resolve.

**Ready for Proposal: Yes.** Ratify: (a) attach-on-replies-only v1 (Option B); (b) colocate-in-PatientsStack nav (Option A); (c) Doctor-can-resolve-own-assigned-consultation as a scoped exception to "no Admin/Doctor parity in v1"; (d) hoist one new core schema.
