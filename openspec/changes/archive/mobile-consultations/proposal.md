# SDD Proposal — Mobile Consultations

## Change name
`mobile-consultations`

## Status
`proposed` (2026-07-13)

## Problem

Change #8 of the master plan (line 103: "Consultas — lista + crear (escalar a Doctor) +
hilo de mensajes"). Field Members need to **escalate a patient to their assigned doctor**
and hold a threaded medical conversation from the phone. `apps/mobile` has no consultations
surface at all — no tab, no screens, no schema. The `packages/core` consultations data
layer (list/detail/create/postMessage/updateStatus hooks + full query-key factory + DTOs
matching the API 1:1) is already **complete and correct** — same as #6, so **zero new
core hooks/api/types** are needed. But two non-obvious wiring problems, visible only by
reading both repos, block a naive build:

1. **The `attachmentUrl` string on `CreateConsultationRequest`/`PostMessageRequest` is dead
   code, not a mechanism.** Nobody populates it — both web forms hardcode
   `attachmentUrl: null` and web renders it nowhere. The real mechanism is #7's polymorphic
   `POST /attachments?ownerType=ConsultationMessage&ownerId={messageId}`, which requires the
   message to exist first (ownerId = message id).
2. **No DTO exposes a patient's `Collaborators` to the frontend.** Mobile cannot
   client-side-gate the escalate entry point for a patient the Member doesn't attend — the
   API's 403 (`consultations.not_patient_collaborator`) is the only gate; the UI must handle
   it gracefully, not try to prevent it.

Members work in rural Nicaragua on intermittent connectivity, so writes must be gated on
being online.

## Proposed change

A **mobile-only** feature: a new 3rd bottom **Consultas** tab (list → thread) plus a
colocated create screen reached from patient detail. Screens call **core hooks only**
(`useConsultations`, `useConsultationDetail`, `useCreateConsultation`, `usePostMessage`,
`useUpdateConsultationStatus`), Spanish-first, writes gated on `useOnline()`. The single
shared touch is hoisting one Zod schema into core (mirrors #6). Reuses #4/#6/#7 primitives
(QueryBoundary/EmptyState/useOnline, RHFSelect, attachments `AuthedImage`/`useAttachments`).

## Core change

One new schema, no hook/api/type changes.

| File | Change |
|---|---|
| `packages/core/src/schemas/consultation.schema.ts` | **new** — `createConsultationSchema` (title/firstMessage/assignedDoctorId required; `treatmentId` null in v1) + `postMessageSchema` (body required). Mirrors #6's comment/session schema hoist. |

Web's inline consultation schemas are left **untouched** (minimal regression surface).
Because core is shared, the schema ships behind a **web build/lint regression gate**.

## Mobile screens

- **Consultas tab** — new 3rd bottom tab in `TabNavigator` (Pacientes / Consultas / More).
- **ConsultationsListScreen** — `useConsultations(filters)`, **role-filtered server-side**
  (Member sees only ones they opened, Doctor only ones assigned to them), paged, wrapped in
  QueryBoundary/EmptyState, tap → detail. No standalone "+" in v1.
- **ConsultationDetailScreen** — thread via `useConsultationDetail(id)` (messages ascending);
  compose bar via `usePostMessage`; role-conditional "Marcar resuelta" via
  `useUpdateConsultationStatus`, rendered **only** when `user.id === consultation.assignedDoctorId`;
  compose disabled on `Resolved`; reply-time photo attach (PR2). Auto Open→UnderReview is
  server-side when the assigned doctor replies.
- **CreateConsultationScreen** — colocated in `PatientsStack` (like `CreateSession`, takes
  `{patientId}`), reached via an **"Escalar a Doctor"** button on `PatientDetailScreen`;
  patient-scoped doctor `RHFSelect` from `usePatientFullSummary(patientId).assignedDoctors`;
  `goBack()` on success. No patient picker inside create.

## Scope

- Core: `consultation.schema.ts` (create + post-message) + web regression gate.
- New 3rd **Consultas** bottom tab.
- `ConsultationsListScreen` (role-filtered list, QueryBoundary/EmptyState).
- `ConsultationDetailScreen` (thread + compose + role-conditional resolve + reply attach).
- `CreateConsultationScreen` in `PatientsStack` + "Escalar a Doctor" button on `PatientDetailScreen`.
- Patient-scoped doctor `RHFSelect`; `assignedDoctors.length===0` edge handled.
- Reply-time photo attach: split `pickAndUpload.ts` → `pickPhoto` + thin wrapper; read-only
  `MessageAttachmentThumb` for historical bubbles.
- Graceful Spanish handling of the API 403 (`consultations.not_patient_collaborator`).
- Write-gating on `useOnline()`; Spanish-first i18n.

## Out of scope

- **Attach-on-create — DEFERRED (fast-follow):** `OpenConsultation` returns no message id →
  attaching to the FIRST message needs create → re-fetch detail for `messages[0].id` → upload
  (3-call round-trip + cross-screen staged payload). v1 is reply-only attach.
- **Push notifications (→ #9).**
- **Sponsor reports / work routes (→ #10).**
- **Admin/Doctor/Sponsor general mobile parity** — deferred; only the consultations-specific
  Doctor reply/resolve scoped exception ships in v1 (see Open Q6).
- Manual Open/UnderReview status control (the API rejects it — never offered).
- Standalone "+" on the list; patient picker inside create.
- Any backend/API change (contract already supports the flow).

## Open questions (positions taken)

| # | Question | Position taken |
|---|---|---|
| 1 | Attachment scope in v1 | **Reply-only (Option B).** Attach-on-create needs a 3-call round-trip (create → re-fetch detail for `messages[0].id` → upload) + staged cross-screen payload; reply attach is self-contained (post returns the message id → upload). Goal (photos attach to messages) satisfied simpler; attach-on-create = fast-follow. |
| 2 | `attachmentUrl` DTO field | **Dead code; always send `null`** (matching web). Use #7's polymorphic `ownerType=ConsultationMessage` flow (`useUploadAttachment('ConsultationMessage', messageId)` + `AuthedImage`), which `AttachmentAuthorizer` + core's `AttachmentOwnerType` union already support. |
| 3 | Doctor picker source | **Patient-scoped `usePatientFullSummary(patientId).assignedDoctors`**, NOT web's global `useUsers` list (a latent bug — an unassigned doctor 400s). Handle `assignedDoctors.length===0` → disable/hide "Escalar a Doctor" with an explanatory message. |
| 4 | Collaborator gating | **None client-side** (no DTO exposes `Collaborators`). Show the entry point unconditionally; handle the API 403 (`consultations.not_patient_collaborator`) with a friendly Spanish error, no crash. |
| 5 | Status / resolve | **Only the assigned doctor resolves** (a Member never, even their own opened case). Render "Marcar resuelta" only when `user.id === consultation.assignedDoctorId`; never offer manual Open/UnderReview (API 400); disable compose on `Resolved`. Auto Open→UnderReview is server-side. |
| 6 | Doctor role in v1 | **SCOPED EXCEPTION (stated prominently):** the Doctor **can reply + resolve their assigned consultations** on mobile. The master plan (lines 192-193) grants this for consultations specifically, even though general Admin/Doctor/Sponsor mobile parity is deferred (risk #7). This is the one place parity is intentionally granted in v1. |
| 7 | Navigation surface | **Consultas 3rd tab + `CreateConsultationScreen` in `PatientsStack` (Option A).** Avoids the app's first cross-tab typed navigation; create always carries a `{patientId}` from patient detail. |

## Affected files / packages

- `packages/core/src/schemas/consultation.schema.ts` — **new** (create + post-message schemas).
- `apps/web/*` — no code change; **regression-gated** (build/lint) because core is shared.
- `apps/mobile/src/navigation/TabNavigator.tsx` — add 3rd **Consultas** tab.
- `apps/mobile/src/navigation/PatientsStack.tsx` — colocate `CreateConsultationScreen` route (`{patientId}`).
- `apps/mobile/src/screens/consultations/ConsultationsListScreen.tsx` — **new**.
- `apps/mobile/src/screens/consultations/ConsultationDetailScreen.tsx` — **new** (thread + compose + resolve).
- `apps/mobile/src/screens/consultations/CreateConsultationScreen.tsx` — **new** (in PatientsStack).
- `apps/mobile/src/screens/patients/PatientDetailScreen.tsx` — add "Escalar a Doctor" button.
- `apps/mobile/src/components/attachments/pickAndUpload.ts` — split out `pickPhoto` (pick+manipulate → payload); keep the wrapper (zero change for existing Patient/Treatment callers).
- `apps/mobile/src/components/attachments/MessageAttachmentThumb.tsx` — **new** read-only (`useAttachments('ConsultationMessage', messageId)` + `AuthedImage`).
- Reuse (no change): `components/shared/{QueryBoundary,EmptyState}`, `hooks/useOnline`, RHFSelect (#6), attachments `AuthedImage`/`useAttachments` (#7), i18n `es`.

## Delivery plan (chained PRs)

Two ordered, independently green PRs, each ≤400 lines.

| PR | Scope | Gate / smoke |
|---|---|---|
| **PR1 — Core schema + Consultas tab + list + thread** | `consultation.schema.ts` (+ web regression gate); 3rd Consultas bottom tab; `ConsultationsListScreen` (role-filtered); `ConsultationDetailScreen` (thread + compose + role-conditional resolve; **no attachments yet**) | core `tsc -b` + **web build/lint regression** (shared); mobile `tsc --noEmit`, `expo-doctor`, `expo export`; smoke: list renders role-filtered; reply as assigned Doctor → auto Under Review; resolve as assigned doctor → compose disables + further replies 409 |
| **PR2 — Create + reply attachments** | `CreateConsultationScreen` (in PatientsStack, "Escalar a Doctor" button on `PatientDetailScreen`, patient-scoped doctor RHFSelect, zero-doctors handled); reply-time photo attach (`pickPhoto` split + `MessageAttachmentThumb`) | typecheck/doctor/export; smoke: Member escalates an attended patient w/ assigned doctor → 201 Open; escalates a NON-attended patient → friendly 403, no crash; attach photo to a reply → thumbnail renders in-thread + retrievable via API directly |

No test runner (`strict_tdd:false`) — verify via `tsc` / `expo-doctor` / `expo export` /
web build; conventional commits, ≤400 lines/PR, one work unit per PR.

## Rollback plan

- **Core schema (PR1)** is backward-compatible and additive: a new file with web's inline
  schemas untouched, so no consumer is forced to migrate and no half-migrated state ships —
  reverting removes the file atomically.
- **Mobile (PR1 + PR2)** is purely additive — new screens + one new bottom tab + one
  PatientsStack route + a button + a split helper (existing attachment callers unchanged);
  no change to #5 auth, #6 patients, or #7 attachments runtime. Revert the branch
  (`feat/mobile-consultations`) to remove the feature with no data or contract impact. Each
  chained PR reverts independently.
