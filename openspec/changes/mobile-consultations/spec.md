# SDD Spec — Mobile Consultations

## Requirements

### R1 — Core consultation schema (shared)
`packages/core/src/schemas/consultation.schema.ts` MUST be added, exporting `createConsultationSchema`
(Zod: `title`, `firstMessage`, `assignedDoctorId` all required non-empty strings; `treatmentId` fixed to
`null` in v1) and `postMessageSchema` (Zod: `body` required non-empty string). Web's existing inline
consultation schemas MUST remain untouched (no consumer migration forced).

### R2 — Consultas bottom tab
`apps/mobile/src/navigation/TabNavigator.tsx` MUST add a 3rd bottom tab **"Consultas"** (order:
Pacientes / Consultas / More) that navigates into a new `ConsultationsStack` (List → Detail).

### R3 — Consultations list screen
`ConsultationsListScreen` MUST call `useConsultations(filters)` (existing core hook), rely on
server-side role filtering (Member sees only consultations they opened; Doctor sees only consultations
assigned to them — no client-side re-filtering), display each row's status, wrap the list in
`QueryBoundary`/`EmptyState`, and navigate to `ConsultationDetailScreen` on row tap. No standalone "+"
entry point MUST exist on this screen in v1.

### R4 — Consultation detail / thread screen
`ConsultationDetailScreen` MUST render the message thread from `useConsultationDetail(id)` oldest-first
(author + timestamp per message, plus a `MessageAttachmentThumb` per message), provide a compose box
wired to `usePostMessage(id)` that MUST be disabled when `consultation.status === 'Resolved'`, and MUST
render a "Marcar resuelta" control wired to `useUpdateConsultationStatus(id)` ONLY when
`user.id === consultation.assignedDoctorId`. No manual Open/UnderReview control MUST ever be offered
(the API rejects it with 400).

### R5 — Create consultation screen ("Escalar a Doctor")
`CreateConsultationScreen` MUST be colocated in `PatientsStack` (reached via a new "Escalar a Doctor"
button on `PatientDetailScreen`, taking `{patientId}`), use React Hook Form + `createConsultationSchema`,
source its doctor picker (`RHFSelect`) from `usePatientFullSummary(patientId).assignedDoctors` (NOT a
global doctor list), require `title` + `firstMessage`, always send `treatmentId: null` and
`attachmentUrl: null`, call `useCreateConsultation()`, and `goBack()` on success. WHEN
`assignedDoctors.length === 0`, the screen/button MUST disable or hide the escalate action with an
explanatory Spanish message. No patient picker MUST exist inside this screen.

### R6 — Reply-time photo attachment (v1 attachment scope)
Photo attachment MUST be reply-only in v1: after `usePostMessage` resolves,
`useUploadAttachment('ConsultationMessage', newMessage.id)` uploads the staged photo, using a new
`pickPhoto` helper split out of `pickAndUpload.ts` (existing wrapper/callers unchanged). A new read-only
`MessageAttachmentThumb` (per message, via `useAttachments('ConsultationMessage', messageId)` +
`AuthedImage`) MUST render historical attachments in the thread. Attach-on-create MUST NOT be
implemented in v1 (deferred fast-follow).

### R7 — Collaborator gating (none client-side)
The mobile app MUST NOT client-side-gate the "Escalar a Doctor" entry point on patient-collaborator
membership (no DTO exposes `Collaborators`). WHEN the API returns 403
`consultations.not_patient_collaborator`, the UI MUST surface a friendly Spanish error message with no
crash.

### R8 — Doctor scoped exception (v1)
A Doctor-role user MUST be able to reply to and resolve consultations assigned to them on mobile — a
scoped exception to the "no general Admin/Doctor/Sponsor mobile parity" deferral. This exception MUST
NOT be generalized to any other Doctor/Admin mobile capability in v1.

### R9 — Offline write-gating
All consultation writes (create, reply, resolve, attach) MUST be gated on `useOnline()` and MUST show
`OfflineBanner`/disable the action when offline. Reads (list/detail) MUST continue to render from the
persisted TanStack Query cache while offline.

### R10 — Spanish-first + web regression gate
All new mobile strings MUST be Spanish-first (i18n `es`). Because `consultation.schema.ts` lives in
shared `packages/core`, `pnpm --filter web build` and `pnpm --filter web lint` MUST remain green. No
test runner exists (`strict_tdd:false`) — verification relies on `tsc`/`expo-doctor`/`expo export`/web
build plus code trace, with create/reply/resolve/attach/403/auto-transition round-trips verified via
Human/EAS smoke.

## Scenarios

#### Scenario: core-schema-typechecks
Traces: R1
- GIVEN `consultation.schema.ts` is added with `createConsultationSchema`/`postMessageSchema`
- WHEN `pnpm --filter core exec tsc -b` runs
- THEN it exits 0 with no type errors

#### Scenario: web-build-unbroken
Traces: R1, R10
- GIVEN web's inline consultation schemas are unchanged and the new core schema file is additive
- WHEN `pnpm --filter web build` and `pnpm --filter web lint` run
- THEN both pass with no regressions

#### Scenario: mobile-typechecks
Traces: R2, R3, R4, R5, R6, R7, R8, R9
- GIVEN the Consultas tab, list, detail, create screens, and attachment helpers are implemented
- WHEN `pnpm --filter mobile exec tsc --noEmit` runs
- THEN it exits 0 with no type errors

#### Scenario: expo-doctor-clean
Traces: R2, R6
- GIVEN no new native dependency is required (attachment picker deps already installed in #7)
- WHEN `npx expo-doctor` runs in `apps/mobile`
- THEN no failing checks are reported

#### Scenario: expo-export-bundles
Traces: R2, R3, R4, R5, R6, R7, R8, R9
- GIVEN the Consultas tab/stack and all four new/changed screens are wired
- WHEN `npx expo export` runs in `apps/mobile`
- THEN the export succeeds with no bundling errors

#### Scenario: consultas-tab-renders
Traces: R2, R3
- GIVEN `ConsultationsListScreen` wraps `useConsultations(filters)` in `QueryBoundary`/`EmptyState`
- WHEN code-traced against `TabNavigator`'s tab list and the persisted query cache
- THEN "Consultas" renders as the 3rd tab, and a previously-fetched, role-filtered list displays from
  the persisted cache while offline

#### Scenario: open-consultation-detail
Traces: R4
- GIVEN a consultation with multiple messages
- WHEN `ConsultationDetailScreen` renders via `useConsultationDetail(id)`
- THEN messages display oldest-first, each with author, timestamp, and `MessageAttachmentThumb`

#### Scenario: create-consultation **(Human/EAS smoke)**
Traces: R5
- GIVEN a Member on `PatientDetailScreen` for a patient they attend, with >=1 assigned doctor
- WHEN they tap "Escalar a Doctor", pick a doctor, fill title/firstMessage, and submit
- THEN `useCreateConsultation()` succeeds (201), the new consultation appears with status `Open`, and
  the screen navigates back

#### Scenario: escalate-not-collaborator-403 **(Human/EAS smoke)**
Traces: R7
- GIVEN a Member escalates a patient they do NOT attend
- WHEN the API responds 403 `consultations.not_patient_collaborator`
- THEN the UI surfaces a friendly Spanish error message with no crash

#### Scenario: doctor-reply-auto-under-review **(Human/EAS smoke)**
Traces: R4, R8
- GIVEN a consultation in status `Open`, assigned to the current Doctor user
- WHEN the Doctor posts a reply via the compose box
- THEN the server auto-transitions the consultation to `UnderReview` (no client-side status control
  involved) and the thread reflects the new status on refetch

#### Scenario: post-reply **(Human/EAS smoke)**
Traces: R4
- GIVEN a participant (opener, assigned doctor, or admin) on an active consultation thread
- WHEN they submit a reply via the compose box
- THEN `usePostMessage` succeeds, the new message appears in the thread, and the detail cache is
  invalidated/refetched

#### Scenario: attach-photo-to-reply **(Human/EAS smoke)**
Traces: R6
- GIVEN a participant stages a photo via `pickPhoto` before sending a reply
- WHEN the reply posts and `useUploadAttachment('ConsultationMessage', newMessage.id)` uploads
- THEN a thumbnail renders in-thread via `MessageAttachmentThumb` and the attachment is retrievable via
  the API directly

#### Scenario: resolve-only-assigned-doctor **(Human/EAS smoke)**
Traces: R4, R8
- GIVEN a Member who opened the consultation AND the assigned Doctor both view the same thread
- WHEN the screen renders
- THEN "Marcar resuelta" is visible ONLY for the assigned Doctor (code trace: hidden for the Member);
  AND WHEN the Doctor resolves it, further reply attempts (by any participant) return 409 and the
  compose box disables

#### Scenario: zero-assigned-doctors
Traces: R5
- GIVEN `usePatientFullSummary(patientId).assignedDoctors` is an empty array
- WHEN `PatientDetailScreen`/`CreateConsultationScreen` code-traces the escalate entry point
- THEN "Escalar a Doctor" is disabled or hidden with an explanatory Spanish message, and no doctor
  picker is rendered with zero options

#### Scenario: offline-write-blocked
Traces: R9
- GIVEN the device has no connectivity (`useOnline() === false`)
- WHEN a user attempts create/reply/resolve/attach on any consultation screen
- THEN `OfflineBanner` is visible and the write entry points are disabled (code trace of the gating
  guard), while previously-cached list/thread reads still render

## Core schema contract

```ts
// packages/core/src/schemas/consultation.schema.ts
export const createConsultationSchema = z.object({
  title: z.string().trim().min(1),
  firstMessage: z.string().trim().min(1),
  assignedDoctorId: z.string().trim().min(1),
  treatmentId: z.null(), // v1: no treatment linking from mobile create
})
export type CreateConsultationFormValues = z.infer<typeof createConsultationSchema>

export const postMessageSchema = z.object({
  body: z.string().trim().min(1),
})
export type PostMessageFormValues = z.infer<typeof postMessageSchema>
```

`patientId` and `attachmentUrl: null` are supplied by the screen/mutation call site, not by the form
schema (mirrors #6's comment/session schema hoist — schemas cover only form-managed fields).

## Mobile screen contracts

- **`TabNavigator` / `ConsultationsStack`** — 3rd bottom tab "Consultas"; stack routes
  `ConsultationsList` → `ConsultationDetail` (typed param `{ consultationId: string }`).
- **`ConsultationsListScreen`** — no props; `useConsultations(filters)` inside
  `QueryBoundary`/`EmptyState`; row press → `navigate('ConsultationDetail', { consultationId })`.
- **`ConsultationDetailScreen`** — param `{ consultationId }`; `useConsultationDetail(consultationId)`
  thread (ascending) + `MessageAttachmentThumb` per message; compose bar (RHF + `postMessageSchema` +
  optional `pickPhoto` stage) disabled when `status==='Resolved'`; "Marcar resuelta" button rendered
  only when `user.id===consultation.assignedDoctorId`.
- **`CreateConsultationScreen`** (in `PatientsStack`) — param `{ patientId }`; RHF +
  `createConsultationSchema`; doctor `RHFSelect` fed by
  `usePatientFullSummary(patientId).assignedDoctors`; zero-doctors edge disables/hides the entry point;
  `useCreateConsultation()`; `goBack()` on success.
- **`PatientDetailScreen`** — adds an "Escalar a Doctor" button navigating to
  `CreateConsultationScreen` with `{patientId}`, shown unconditionally (no collaborator gate), disabled
  when `assignedDoctors.length===0`.

## Verification rules

| Check | Command | Expected |
|---|---|---|
| Core typecheck | `pnpm --filter core exec tsc -b` | exits 0 |
| Web regression | `pnpm --filter web build && pnpm --filter web lint` | both pass; web's inline schemas unchanged |
| Mobile typecheck | `pnpm --filter mobile exec tsc --noEmit` | exits 0 |
| Expo config sanity | `npx expo-doctor` (in `apps/mobile`) | no failing checks |
| Mobile bundlable | `npx expo export` (in `apps/mobile`) | export succeeds |
| Role-conditional render | code trace of `ConsultationDetailScreen` | "Marcar resuelta" rendered only when `user.id===assignedDoctorId`; no manual Open/UnderReview control anywhere |
| Doctor-picker source | code trace of `CreateConsultationScreen` | doctor `RHFSelect` sourced from `usePatientFullSummary(patientId).assignedDoctors`, never a global user list |
| Write-gating | code trace of create/reply/resolve/attach submit handlers | `useOnline()` guard + `OfflineBanner` present before every mutate call |
| No client collaborator gate | code trace of `PatientDetailScreen`/`CreateConsultationScreen` | entry point shown unconditionally; 403 handled via friendly error, not prevented |
| Human/EAS smoke | manual dev-client run against local API (`:5080`) | create-consultation, escalate-not-collaborator-403, doctor-reply-auto-under-review, post-reply, attach-photo-to-reply, resolve-only-assigned-doctor all behave per the Scenarios marked **(Human/EAS smoke)** |
