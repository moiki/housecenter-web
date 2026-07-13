# SDD Proposal — Mobile Patients & Progress Recording

## Change name
`mobile-patients-progress`

## Status
`proposed` (2026-07-13)

## Problem

Change #6 of the master plan: give the field-work Member a mobile surface to do their core
job — attend patients and record progress in the field. Today `apps/mobile` has only auth
(#5) plus a placeholder `Home` tab; there is no way to view a patient, log an
AttentionSession (work-route compliance), or record a TreatmentDetail (treatment progress +
educational reinforcement) from a phone. Members work in rural Nicaragua with intermittent
connectivity, so the mobile client must record progress at the point of care rather than
forcing the Member back to the web dashboard.

Crucially, this is **almost entirely a mobile UI change**: `packages/core`'s
patients/treatments/sessions/comments data layer (hooks + api + DTOs) is already 100%
complete for this scope — zero new core hooks/api/types are required.

## Proposed change

Build a **Pacientes** tab in `apps/mobile` (repurposing the `Home` placeholder) that lets a
Member: browse/search patients, open a patient detail with a segmented control over
Overview / Treatments / Sessions / Comments, and record progress — create AttentionSessions,
create TreatmentDetails, patch treatment/session status, and add patient/treatment comments.
Screens call **core hooks only** (never `apiClient`), Spanish-first (i18n `es`), with all
mutations gated on connectivity and reads served from the persisted cache offline.

Only backend-shared work is hoisting **3 inline web Zod schemas** into `packages/core` so RN
and web share one source of truth. No core hook/api/type changes.

## Core changes

Hoist exactly **3** inline+duplicated web Zod schemas into `packages/core/src/schemas/`
(core already deps `zod ^4`, so no new dep). Update web to import from core (DRY win).
Do NOT hoist `treatmentSchema` (treatment create/edit — out of mobile scope).

| New file | Exports | Replaces (web inline) |
|---|---|---|
| `treatmentDetail.schema.ts` | `createSchema` (name/description/profile/treatmentDate, `""→null`) | `TreatmentsTab.tsx` `detailSchema` |
| `session.schema.ts` | `createSchema` (`locationMode: clinic\|workRoute` discriminator + `superRefine`, attentionType, sessionDate, duration/notes) + `statusSchema` | `SessionsTab.tsx:33-59` |
| `comment.schema.ts` | comment schema (`body` + `type`) | `TreatmentsTab.tsx` **and** `CommentsTab.tsx:27-31` (2 byte-identical copies) |

Because these are shared with web, PR1 carries a **web build/lint regression gate**.

## Mobile screens

New patients stack under the repurposed `Pacientes` tab:

| Screen | Hook(s) | Content |
|---|---|---|
| `PatientsListScreen` | `usePatients(page,pageSize)` | Paged list + search; reuse `QueryBoundary` / `LoadingState` / `EmptyState`; row → detail |
| `PatientDetailScreen` | `usePatientFullSummary(id)` | Custom **segmented control** (`useState<TabId>`) — tabs: Overview / Treatments / Sessions / Comments (NO Attachments = #7) |

Tab behaviors (record-progress flows), all RHF + Zod (schemas from core), write-gated:

- **Overview**: patient summary (read-only; AssignedDoctors is Owner-only on web → not surfaced).
- **Treatments**: `useTreatments` list + `usePatchTreatmentStatus` status patch + `useCreateTreatmentDetail` (add detail, `treatmentDate` via `datetimepicker` `mode="date"`) + `useCreateTreatmentComment`. NO treatment create/edit.
- **Sessions**: `useSessions` list + `useCreateSession` (`locationMode` clinic|workRoute, `attentionType`, `sessionDate` via `datetimepicker` `mode="datetime"`, duration/notes) + `usePatchSessionStatus`. NO delete action rendered (Administrator-only).
- **Comments**: `useCreatePatientComment` + `useCreateTreatmentComment` (create only).

Write-gating: every mutation gates on `onlineManager.isOnline()` and shows `OfflineBanner`;
reads flow through `QueryBoundary` (persisted MMKV cache works offline).

## Scope

- Hoist 3 core schemas (`treatmentDetail`, `session`, `comment`) + rewire web imports.
- Add mobile deps: `react-hook-form ^7.79.0`, `@hookform/resolvers ^5.4.0` (match web), `@react-native-community/datetimepicker` (via `npx expo install`).
- Repurpose `Home` tab → `Pacientes`; add patients stack.
- `PatientsListScreen` (paged + search) and `PatientDetailScreen` (segmented control + 4 tabs).
- Member write-scope: patients VIEW-ONLY; treatments VIEW + status patch; treatment details CREATE only; sessions CREATE + status patch (NO delete); comments (patient + treatment) CREATE only.
- Spanish-first; enum labels via i18n.

## Out of scope

- Attachments tab / photo uploads (→ #7).
- Consultations (→ #8) and push notifications (→ #9).
- Patient create/edit/deactivate; treatment create/edit; session delete.
- `Inicio/Ruta` work-route dashboard (needs #10 data — no 2nd placeholder tab).
- Hoisting `treatmentSchema`.
- Any core hook/api/type change (none missing).

## Open questions (positions taken)

| # | Question | Position taken |
|---|---|---|
| 1 | Member patient CRUD (plan self-contradicts: L47 API allows, L107 mobile hides) | **Mobile v1 = VIEW-ONLY.** API permits CRUD, but product hides create/edit — patients are registered on intake via web, not mid-visit on a phone. Reconciled: server capability ≠ mobile surface. |
| 2 | Treatment create/edit | **OUT.** Mobile does view + status patch + detail-create only. Core create/edit hooks exist but stay unwired. |
| 3 | Session delete | **OUT.** Administrator-only per plan + API (Member gets 403). Do NOT render a delete action, unlike web (existing web gap). |
| 4 | `collaboratorId` for self-service session creation | **POSITION: assume `collaboratorId === user.id`** as working default. FLAG as risk to verify in human/EAS smoke (confirm attribution). Fallback: request `/collaborators/me` from API team. Do NOT reproduce web's any-collaborator dropdown. |
| 5 | Schema hoisting scope | **Exactly 3** (`treatmentDetail`, `session`, `comment`), NOT `treatment`. |
| 6 | Detail-tabs pattern | **Custom segmented control** (`useState<TabId>`) — no `material-top-tabs`/`pager-view` dep (consistent with #4 decision #8). |
| 7 | Nav slot | **Repurpose `Home` → `Pacientes`;** defer `Inicio/Ruta` dashboard to #10. |

## Affected files / packages

- `packages/core/src/schemas/{treatmentDetail,session,comment}.schema.ts` — **new** (hoisted).
- `apps/web` — `TreatmentsTab.tsx`, `SessionsTab.tsx`, `CommentsTab.tsx` — replace inline schemas with core imports (regression-gated).
- `apps/mobile/package.json` — add RHF, resolvers, datetimepicker.
- `apps/mobile` navigation — `TabNavigator.tsx` (`Home`→`Pacientes`), new patients stack navigator.
- `apps/mobile` screens — `PatientsListScreen`, `PatientDetailScreen` + per-tab components.
- Reuse (no change): `components/shared/{QueryBoundary,LoadingState,EmptyState,OfflineBanner}`, `connectivity.ts`, i18n `es`.

## Delivery plan (chained PRs)

Full feature exceeds the 400-line review budget → 4 ordered, independently green PRs.

| PR | Scope | Gate / smoke |
|---|---|---|
| **PR1 — Core schema hoisting** | Add `core/schemas/{treatmentDetail,session,comment}.schema.ts`; rewire web imports (3 tabs) | `core tsc -b` + **web build/lint regression** (shared) |
| **PR2 — Mobile deps + Pacientes tab + list + detail shell** | Add deps; `Home`→`Pacientes`; `PatientsListScreen` (paged + search); `PatientDetailScreen` + segmented control + Overview | mobile `tsc --noEmit`, `expo-doctor`, `expo export` |
| **PR3 — Treatments + Details tab** | Treatment list + status patch + treatment-detail create + treatment comments | typecheck/doctor/export; smoke: create detail + patch treatment status → surfaces on web |
| **PR4 — Sessions tab + patient Comments tab** | Session create (`locationMode` + datetimepicker + attentionType) + status patch; patient comment create | typecheck/doctor/export; smoke: **create session as Member → confirm collaborator attribution (resolves Q4)**; patch session status; add comment; offline read-cache round-trip |

No test runner (`strict_tdd:false`) — verify via `tsc` / `expo-doctor` / `expo export` /
web build; conventional commits, ≤400 lines/PR, one work unit per PR.

## Rollback plan

- **Core schema hoisting (PR1)** is backward-compatible: web imports are updated in the same
  PR, so no half-migrated state ships; revert restores the inline schemas atomically.
- **Mobile (PR2–PR4)** is purely additive — new screens + a repurposed tab, no change to
  existing #5 auth or core runtime behavior. Revert the branch (`feat/mobile-patients-progress`)
  to remove the feature with no data or contract impact. Each chained PR reverts independently.
