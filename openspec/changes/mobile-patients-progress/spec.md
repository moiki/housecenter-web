# SDD Spec — Mobile Patients & Progress Recording

## Requirements

| # | Requirement |
|---|---|
| R1 | `packages/core/src/schemas/treatmentDetail.schema.ts` MUST export `createSchema` (`name`, `description` both `min(1)`; `treatmentDate` `min(1)`; `profile: z.string().url().nullable().or(z.literal('')).transform(v => v \|\| null)`), matching `TreatmentsTab.tsx`'s current `detailSchema` exactly. |
| R2 | `packages/core/src/schemas/session.schema.ts` MUST export `createSchema` (`collaboratorId`, `attentionType: enum(Medical\|EducationalReinforcement)`, `sessionDate`, `durationMinutes?`, `notes?`, `locationMode: enum(clinic\|workRoute)`, `clinicId?`, `workRouteId?`, with `.superRefine` requiring `clinicId` when `locationMode==='clinic'` and `workRouteId` when `'workRoute'`) and `statusSchema` (`status: enum(Scheduled\|Completed\|Missed)`, `durationMinutes?`, `notes?`), matching `SessionsTab.tsx:33-59`. |
| R3 | `packages/core/src/schemas/comment.schema.ts` MUST export one schema (`body: min(1)`, `type: enum(Route\|Medical\|Simple)`) that de-duplicates the byte-identical copies in `TreatmentsTab.tsx` (`commentSchema`) and `CommentsTab.tsx:27-31`. |
| R4 | `TreatmentsTab.tsx`, `SessionsTab.tsx`, `CommentsTab.tsx` MUST import `createSchema`/`statusSchema`/comment schema from `core/schemas/*` in place of their local `const` declarations; `treatmentSchema` (create/edit) MUST stay inline in `TreatmentsTab.tsx` (NOT hoisted); `pnpm --filter web build` and `pnpm --filter web lint` MUST stay green after the rewire. |
| R5 | `apps/mobile/package.json` MUST add `react-hook-form ^7.79.0`, `@hookform/resolvers ^5.4.0` (matching web), and `@react-native-community/datetimepicker` (via `npx expo install`). |
| R6 | `TabNavigator.tsx` MUST repurpose the `Home` tab into `Pacientes`; a new patients stack navigator MUST route `PatientsListScreen` → `PatientDetailScreen`. |
| R7 | `PatientsListScreen` MUST use `usePatients(page, pageSize)` (paged) with search, rendered through `QueryBoundary`/`LoadingState`/`EmptyState`; it MUST NOT render any patient create/edit/deactivate action (view-only). |
| R8 | `PatientDetailScreen` MUST call `usePatientFullSummary(id)` and render a custom segmented control (local `useState<TabId>`, no new nav dep) over exactly four tabs: Overview, Treatments, Sessions, Comments — Attachments MUST NOT appear (deferred to #7). |
| R9 | The Treatments tab MUST list via `useTreatments`/`useTreatmentDetails` (read-only) with `usePatchTreatmentStatus` (Active\|Completed\|Paused), `useCreateTreatmentDetail` (RHF + `treatmentDetail.schema`, `treatmentDate` via `datetimepicker mode="date"`), and `useCreateTreatmentComment`; it MUST NOT render treatment create/edit/delete. |
| R10 | The Sessions tab MUST list via `useSessions` and support `useCreateSession` (RHF + `session.schema`; `collaboratorId` auto-filled to the signed-in `user.id`, no collaborator picker; `attentionType`; `sessionDate` via `datetimepicker mode="datetime"`; `locationMode` clinic\|workRoute resolving to `clinicId`/`workRouteId`; `duration`/`notes`) and `usePatchSessionStatus` (Scheduled\|Completed\|Missed); it MUST NOT render a delete-session action (Administrator-only). |
| R11 | The patient Comments tab MUST support `useCreatePatientComment` (create only, no delete rendered) with `type` one of `Route\|Medical\|Simple`. |
| R12 | Every mutation (patch treatment/session status, create treatment detail, create session, create patient/treatment comment) MUST gate on `onlineManager.isOnline()` and surface `OfflineBanner` when offline; all reads MUST flow through `QueryBoundary` so previously-viewed patients render from the persisted MMKV cache while offline. |
| R13 | `collaboratorId` for self-service session creation MUST use the working assumption `collaboratorId === user.id`; this attribution MUST be confirmed via Human/EAS smoke against a running API before being treated as verified (flagged risk, not a build-time blocker). |
| R14 | All new mobile screens/forms MUST use Spanish-first strings via i18n (`es`); `pnpm --filter web build`/`lint` MUST remain green throughout (shared core schemas). |

## Scenarios

#### Scenario: core-schemas-hoisted-typecheck
Traces: R1, R2, R3
- GIVEN the three hoisted schema files exist under `packages/core/src/schemas/`
- WHEN `pnpm --filter core exec tsc -b` runs
- THEN it exits 0 with no type errors

#### Scenario: web-build-unbroken
Traces: R4, R14
- GIVEN `TreatmentsTab.tsx`/`SessionsTab.tsx`/`CommentsTab.tsx` are rewired to import core schemas
- WHEN `pnpm --filter web build` and `pnpm --filter web lint` run
- THEN both pass with no regressions and `treatmentSchema` still resolves locally (not hoisted)

#### Scenario: mobile-typechecks
Traces: R5, R6, R7, R8, R9, R10, R11
- GIVEN all mobile screens/forms/deps for this change are in place
- WHEN `pnpm --filter mobile exec tsc --noEmit` runs
- THEN it exits 0 with no type errors

#### Scenario: expo-doctor-clean
Traces: R5, R6
- GIVEN the new deps (RHF, resolvers, datetimepicker) and nav changes are installed
- WHEN `npx expo-doctor` runs in `apps/mobile`
- THEN no failing checks are reported

#### Scenario: expo-export-bundles
Traces: R6, R7, R8, R9, R10, R11
- GIVEN the Pacientes tab, patients stack, and all four detail tabs are implemented
- WHEN `npx expo export` runs in `apps/mobile`
- THEN the export succeeds with no bundling errors

#### Scenario: patients-list-renders
Traces: R7, R12
- GIVEN `PatientsListScreen` wraps `usePatients` in `QueryBoundary`/`EmptyState` and no connectivity is present
- WHEN code-traced against `AppProviders.tsx`'s `PersistQueryClientProvider` (24h maxAge, no dehydrate filter)
- THEN a previously-fetched page renders from the persisted cache and no create/edit/deactivate control exists on the screen

#### Scenario: patient-detail-fullsummary
Traces: R8
- GIVEN `PatientDetailScreen` calls `usePatientFullSummary(id)`
- WHEN the response resolves `{patient, treatments, comments, assignedDoctors}`
- THEN the Overview tab renders patient summary read-only and does NOT surface `assignedDoctors` (Owner-only on web, not mirrored on mobile)

#### Scenario: segmented-control-switches-tabs
Traces: R8
- GIVEN the custom segmented control holds local `useState<TabId>`
- WHEN a tab (Overview/Treatments/Sessions/Comments) is tapped
- THEN only that tab's content renders and no `material-top-tabs`/`pager-view` dependency is introduced (code trace of `package.json` + component)

#### Scenario: create-session **(Human/EAS smoke)**
Traces: R10, R13
- GIVEN a Member is signed in on a dev client against a running local API (`:5080`) and opens a patient's Sessions tab
- WHEN they submit the create-session form with `locationMode=clinic` (or `workRoute`) and a valid `sessionDate`/`attentionType`
- THEN the session is created with `collaboratorId===user.id`, and manual verification confirms the collaborator attribution is correct on the API/web side (resolves the Q4 open question)

#### Scenario: patch-session-status **(Human/EAS smoke)**
Traces: R10
- GIVEN an existing session is visible on the Sessions tab
- WHEN the Member patches its status to Completed or Missed
- THEN `usePatchSessionStatus` succeeds and the updated status is visible without a delete action ever being rendered

#### Scenario: create-treatment-detail **(Human/EAS smoke)**
Traces: R9
- GIVEN a Member opens a patient's Treatments tab against a running local API
- WHEN they submit a new treatment detail (`treatmentDate` via `datetimepicker mode="date"`)
- THEN `useCreateTreatmentDetail` succeeds and the new detail appears in the list, with no treatment create/edit control present

#### Scenario: patch-treatment-status
Traces: R9, R12
- GIVEN a treatment row with a status-patch control wired to `usePatchTreatmentStatus`
- WHEN code-traced for the online gate
- THEN the mutate call is only reachable when `onlineManager.isOnline()` is true, mirroring the session-status wiring

#### Scenario: create-comment **(Human/EAS smoke)**
Traces: R9, R11
- GIVEN a Member opens a patient's Comments tab or a treatment's comment section against a running local API
- WHEN they submit a comment (`type` one of Route/Medical/Simple)
- THEN `useCreatePatientComment`/`useCreateTreatmentComment` succeeds and the comment appears, with no delete action rendered

#### Scenario: offline-write-blocked
Traces: R12
- GIVEN the device has no connectivity (`onlineManager.isOnline()===false`)
- WHEN the Member attempts any mutation (create session, create detail, create comment, patch status)
- THEN `OfflineBanner` is visible and the mutation's submit handler never calls `.mutate` (code trace of the gating guard)

#### Scenario: write-then-appears-on-web **(Human/EAS smoke)**
Traces: R12, R13
- GIVEN a Member creates a session, a treatment detail, and a comment from the mobile app against a running local API
- WHEN the same patient is opened in `apps/web`'s `PatientProfilePage`
- THEN all three writes are visible on web, confirming round-trip correctness and cache invalidation

## Core schema additions

Hoist exactly 3 shapes into `packages/core/src/schemas/` (core already deps `zod ^4` — no new dep):

| New file | Exports | Web file(s) rewired to import |
|---|---|---|
| `treatmentDetail.schema.ts` | `createSchema` — `name`/`description` (`min(1)`), `treatmentDate` (`min(1)`), `profile` (`""→null`) | `apps/web/.../TreatmentsTab.tsx` (replaces local `detailSchema`) |
| `session.schema.ts` | `createSchema` (`locationMode: clinic\|workRoute` discriminator + `superRefine` on `clinicId`/`workRouteId`) + `statusSchema` | `apps/web/.../SessionsTab.tsx:33-59` (replaces local `createSchema`/`statusSchema`) |
| `comment.schema.ts` | schema (`body` + `type: Route\|Medical\|Simple`) | `apps/web/.../TreatmentsTab.tsx` (local `commentSchema`) AND `apps/web/.../CommentsTab.tsx:27-31` (both byte-identical copies replaced) |

`treatmentSchema` (treatment create/edit, `TreatmentsTab.tsx:47-55`) stays inline — NOT hoisted, out of mobile scope.

## Mobile screen contracts

- **`TabNavigator.tsx`**: `Home` → `Pacientes`; tab hosts a stack navigator, not a single screen.
- **Patients stack**: `PatientsListScreen` (initial route) → `PatientDetailScreen` (push on row tap, receives `patientId` param).
- **`PatientsListScreen`**: `usePatients(page, pageSize)` + search input; `QueryBoundary` wraps the list; `EmptyState` on zero results; `LoadingState` on initial fetch; row press navigates to detail. No create/edit/deactivate affordance (view-only).
- **`PatientDetailScreen`**: `usePatientFullSummary(patientId)`; header shows patient identity; custom segmented control (local `useState<TabId>`, 4 fixed tabs, no swipe/pager dep) renders exactly one of:
  - **Overview**: read-only summary fields; `assignedDoctors` NOT rendered.
  - **Treatments**: `useTreatments`/`useTreatmentDetails` list + status-patch control (RHF, `statusSchema`-equivalent inline enum) + "add detail" form (RHF + `treatmentDetail.schema`, `datetimepicker mode="date"`) + "add comment" form (RHF + `comment.schema`).
  - **Sessions**: `useSessions` list + "add session" form (RHF + `session.schema`; `collaboratorId=user.id` hidden field; `locationMode` toggle switching `clinicId`/`workRouteId` fields; `datetimepicker mode="datetime"` for `sessionDate`) + status-patch control (no delete icon).
  - **Comments**: `useCreatePatientComment` form (RHF + `comment.schema`); list from `usePatientFullSummary().comments`; no delete.
- **Record-progress forms** (session create, treatment-detail create, status patches, comment create) all: use RHF + `zodResolver` against the matching core schema, gate submit on `onlineManager.isOnline()`, and show `OfflineBanner` instead of submitting when offline.

## Verification rules

| Check | Command | Expected |
|---|---|---|
| Core typecheck | `pnpm --filter core exec tsc -b` | exits 0 |
| Web regression | `pnpm --filter web build && pnpm --filter web lint` | both pass; `treatmentSchema` still local |
| Mobile typecheck | `pnpm --filter mobile exec tsc --noEmit` | exits 0 |
| Expo config sanity | `npx expo-doctor` (in `apps/mobile`) | no failing checks |
| Mobile bundlable | `npx expo export` (in `apps/mobile`) | export succeeds |
| Hoisted schema shape | code trace of `packages/core/src/schemas/*.schema.ts` vs. web originals | field-for-field match, no behavior drift |
| Write-gating | code trace of every mutation's submit handler | `onlineManager.isOnline()` guard present before every `.mutate` call |
| No forbidden actions | code trace of Treatments/Sessions/Comments tabs | no treatment create/edit/delete, no session delete, no patient create/edit/deactivate rendered |
| Human/EAS smoke | manual dev-client run against local API `:5080` | create-session (+ collaborator attribution), patch-session-status, create-treatment-detail, create-comment, and write-then-appears-on-web all behave per the Scenarios marked **(Human/EAS smoke)** |
