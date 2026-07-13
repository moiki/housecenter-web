# Exploration — Mobile Patients & Progress Recording (Change #6)

## Summary

Change #6 is almost entirely a **mobile UI change**. `packages/core`'s patients/treatments/sessions data layer is already 100% complete for this scope — every hook, api call, and DTO the screens need already exists (including comment hooks, which I expected to be missing and are not). The real work is: (a) deciding the Member write-scope boundary (the master plan self-contradicts on patient CRUD), (b) hoisting three inline web Zod schemas to `core/schemas` for RN reuse, (c) adding `react-hook-form`/`@hookform/resolvers`/a date-picker to mobile (currently zero form-library deps — `LoginScreen` uses plain `useState`), and (d) designing a dependency-light RN detail-tabs pattern and nav slot. One real open question: how a mobile Member's `collaboratorId` resolves for self-service session creation — unconfirmed against the API from this repo.

**Confidence: Medium-High.** High on the core data layer, web reference flows, mobile foundation primitives (all read directly, file:line below). Medium on: the `collaboratorId`-resolves-to-self question (needs API confirmation, out of reach from this frontend repo), and the RN date-picker package's Expo SDK 55 compat (well-established community package, not yet installed here).

## Confirmed

1. **Core's patient/treatment/session data layer is COMPLETE — nothing missing.**
   - `hooks/patients/usePatients.ts:6-62` — `patientKeys` (all/list/detail/summary); `usePatients(page,pageSize)` (paged, keepPreviousData), `usePatient(id)`, **`usePatientFullSummary(id)`** (returns `{patient, treatments, comments, assignedDoctors}`), `useCreatePatient`, `useUpdatePatient`, `useDeactivatePatient`.
   - `hooks/patients/useTreatments.ts:1-157` — `treatmentKeys`/`treatmentDetailKeys`/`treatmentCommentKeys`; `useTreatments`, `useCreateTreatment`, `useUpdateTreatment`, `usePatchTreatmentStatus` (mutationFn takes raw `status: string`), `useDeactivateTreatment`; `useTreatmentDetails`, `useCreateTreatmentDetail(treatmentId,patientId)`, `useDeleteTreatmentDetail`; **comment hooks colocated here, NOT missing**: `useTreatmentComments`, `useCreateTreatmentComment`, `useDeleteTreatmentComment`, `useCreatePatientComment(patientId)`, `useDeletePatientComment(patientId)`; also `useAssignDoctor`/`useRemoveDoctor` (Owner-only in web).
   - `hooks/patients/useSessions.ts:1-53` — key factory `['patients',patientId,'sessions',filters]`; `useSessions(patientId,{page,pageSize,type,status})`, `useCreateSession(patientId)`, `usePatchSessionStatus(patientId)` (`{sessionId, data: UpdateSessionStatusRequest}`), `useDeleteSession(patientId)`.
   - API modules mirror 1:1 (`patients.api.ts`, `treatments.api.ts` nested routes, `sessions.api.ts`).
   - DTOs (`types/patient.types.ts`, `session.types.ts`): `PatientResponse`, `PatientFullSummaryResponse{patient, treatments, comments, assignedDoctors}`, `TreatmentResponse`, `TreatmentDetailResponse` (`name/description/profile/treatmentDate` — no attention-type), `TreatmentCommentResponse`/`PatientCommentResponse` (`body/type/status/userId`), `CreateTreatmentDetailRequest`, `CreateCommentRequest{body,type}`, `AttentionSessionResponse`, `CreateAttentionSessionRequest{collaboratorId, clinicId, workRouteId, attentionType, sessionDate, durationMinutes, notes}`, `UpdateSessionStatusRequest{status, durationMinutes, notes}`. Enums: `AttentionType=Medical|EducationalReinforcement`, `TreatmentStatus=Active|Completed|Paused`, `CommentType=Route|Medical|Simple`, `SessionStatus=Scheduled|Completed|Missed`, `CommentStatus=Open|Resolved`.
   - **#6 needs ZERO new core hooks/api/types.**

2. **Only `patient.schema.ts` is hoisted to `core/schemas`.** Treatment-detail/session/comment Zod schemas are still INLINE + duplicated in web pages: `TreatmentsTab.tsx:47-69` (`treatmentSchema`, `detailSchema`, `commentSchema`), `SessionsTab.tsx:33-59` (`createSchema` with a UI-only `locationMode: clinic|workRoute` discriminator + `superRefine`; `statusSchema`), `CommentsTab.tsx:27-31` (a SECOND byte-identical comment schema). `core` already deps `zod ^4` → hoisting adds no dep.

3. **Web reference flows** (all four tabs read): `PatientsPage` (paged list + "New Patient" SlideOver + deactivate); `PatientProfilePage` (`usePatientFullSummary` + MUI Tabs: overview/treatments/sessions/comments/attachments; Overview has Owner-gated AssignedDoctors); `TreatmentsTab` (collapsible treatments → status chips `patchStatus.mutate(id)`, nested paged Details add/delete, nested paged Comments add/delete; top-level treatment create/edit + deactivate); `SessionsTab` (paged cards; create via SlideOver with collaborator dropdown + attentionType + sessionDate datetime-local + locationMode clinic/workRoute + duration/notes; inline StatusPatchForm; delete icon); `CommentsTab` (reads from `usePatientFullSummary().comments`, create/delete). `AttachmentsTab` confirmed OUT of #6 (→ #7).

4. **Mobile foundation primitives ready**: `components/shared/{QueryBoundary,LoadingState,EmptyState,OfflineBanner}` (RN-only by rule R7); `connectivity.ts` bridges NetInfo→onlineManager; OfflineBanner subscribes onlineManager. Writes gate on `onlineManager.isOnline()`.

5. **Read cache persists everything** — `AppProviders.tsx` PersistQueryClientProvider (maxAge 24h, no dehydrate filter) → patients/treatments/sessions queries persist to encrypted MMKV automatically; "reads work offline" satisfied by the foundation.

6. **Navigation today**: `TabNavigator.tsx` = `Home` (literal placeholder, comment "real screens land once auth #5 + feature APIs exist") + `More` (real, #5). `RootNavigator` v7 conditional Login|Tabs.

7. **Mobile has no form-library/date-picker dep.** No `react-hook-form`/`@hookform/resolvers`/date-picker; `LoginScreen` uses plain `useState`+`TextInput` (a 2-field form — not a precedent for #6's multi-field enum/conditional forms). Match web versions: RHF `^7.79.0`, `@hookform/resolvers ^5.4.0`, zod `^4.4.3` (core has `^4`).

8. **#5 is implementation-complete** (all 26 tasks `[x]`, gates green, only Human/EAS smoke outstanding) — safe to build #6 on top.

9. **RBAC constants** (`lib/constants.ts`): `ROLE_NAMES`, `ADMIN_ABOVE`, `STAFF_ONLY`. No frontend `MemberOrAbove` group (API-side policy); nothing gates session/treatment creation client-side today (server enforces).

## Discrepancies / corrections

- **Master plan self-contradicts on Member patient CRUD.** Line 47 says Member has patient CRUD (API/RBAC level); line 107 says mobile hides patient create/edit. Reconcilable: API permits it, but the mobile v1 product decision hides create/edit (patients registered on intake via web, not mid-visit on a phone). **Ratify: mobile v1 = patient VIEW-ONLY** (list/search/detail).
- **Treatment create/edit boundary** not explicitly named in the plan, but the "records progress" theme → **treatment list/view + status patch + detail-entry creation only, no treatment create/edit form**. State explicitly (create/edit hooks exist in core, tempting to wire).
- **Session deletion is out of Member's reach (AdministratorOrAbove).** Web renders a delete icon unconditionally (existing web gap; server 403s a Member). **Mobile must NOT render delete-session.**
- **OPEN: how does the mobile Member's own `collaboratorId` reach `CreateAttentionSessionRequest`?** Web lets any staff pick any collaborator from `useCollaborators()` (admin UX). For a Member recording their own visit, auto-fill `collaboratorId=self` — but `collaborators.api.ts` has only list/getById/create/update/deactivate (no `/collaborators/me`, no email lookup), and `UserResponse` vs `CollaboratorResponse` have no confirmed shared-id contract visible frontend-only. Options: (a) assume `collaboratorId === user.id` (cheapest; verify in human smoke), (b) filter `useCollaborators()` by `email === user.email` (fragile past the 100-row clamp), (c) ask API team for `/collaborators/me` (cross-repo blocker). **Recommend (a) as working assumption, verified in smoke, (c) as fallback.**
- **`profile` is a plain URL string, not a photo** (patient/treatment/detail) — don't conflate with #7 photo attachments; just an optional text input in #6.

## Additional considerations for the proposal

- **Schema hoisting**: create `core/schemas/{treatmentDetail.schema.ts, session.schema.ts, comment.schema.ts}` (session includes both `createSchema`-with-`locationMode` and `statusSchema`; comment replaces 3 duplicated inline copies — DRY win for web too). Do NOT hoist `treatmentSchema` (create/edit, out of mobile scope) — leave inline in web.
- **Mobile form deps**: add `react-hook-form ^7.79.0` + `@hookform/resolvers ^5.4.0` (matching web) for the create-session / create-detail / add-comment / patch-status forms.
- **Date input**: add `@react-native-community/datetimepicker` via `npx expo install` (native lib — same gates as any). `mode="date"` for `treatmentDate`, `mode="datetime"` for `sessionDate`.
- **RN detail-tabs**: a single `PatientDetailScreen` with a **custom segmented control** (local `useState<TabId>`, mirroring web's `activeTab`) over `@react-navigation/material-top-tabs` (+pager-view) — zero new nav dep, consistent with #4 design decision #8. Reconsider only if product wants swipeable tabs.
- **Nav slot**: repurpose the placeholder `Home` tab into `Pacientes` (its only content is a placeholder with a comment that real screens land "once auth #5 + feature APIs exist" = now). A real `Inicio/Ruta` dashboard needs work-route data from #10 — defer, don't stub a 2nd placeholder tab.
- **Write-gating**: gate all mutations (create session, patch session status, create treatment detail, patch treatment status, create comment) behind `onlineManager.isOnline()` + `OfflineBanner`; reads via `QueryBoundary` (persisted cache offline).
- **Suggested PR shape** (for sdd-tasks): ~4 PRs — (1) core schema hoisting (touches web → web regression gate), (2) mobile deps + PatientsListScreen + PatientDetailScreen shell/Overview, (3) Treatments+Details tab (view + status patch + detail create), (4) Sessions tab (create + status patch) + Comments tab (patient+treatment create). Call out human-smoke items per PR.
- **Verification**: `pnpm --filter core exec tsc -b` (schemas added) + `pnpm --filter web build`/`lint` (regression — core shared) + `pnpm --filter mobile exec tsc --noEmit` + `expo-doctor` + `expo export`. No test runner. Human/EAS smoke (:5080): create session as Member + confirm collaborator attribution (resolves the open question), create treatment detail + patch treatment/session status, add patient+treatment comment, confirm all surface on web; offline read-cache round-trip (kill connectivity, reopen a viewed patient → renders from cache + OfflineBanner; mutations blocked while offline).

## Recommendation

1. NO core hook/api/type changes (none missing). Add 3 hoisted schemas to `core/schemas/` (`treatmentDetail`, `session`, `comment`); leave `treatment.schema` un-hoisted (out of scope).
2. Ratify the Member write boundary: patients view-only; treatments view + status patch (no create/edit); treatment details create only; sessions create + status patch (NO delete — Admin-only); comments (patient+treatment) create only.
3. Add `react-hook-form`, `@hookform/resolvers`, `@react-native-community/datetimepicker` to `apps/mobile`.
4. Screens: `PatientsListScreen` (paged, QueryBoundary/EmptyState) → `PatientDetailScreen` with a custom segmented control (Overview/Treatments/Sessions/Comments — no Attachments = #7).
5. Repurpose the `Home` tab into `Pacientes`; defer `Inicio/Ruta` to #10.
6. Resolve the `collaboratorId`-for-self question during design/apply via human smoke before trusting session attribution.
7. Verify via typecheck/build/doctor/export + the human/EAS smokes; no test runner.

**Ready for Proposal: Yes.** Decisions for sdd-propose to ratify: (a) Member write-scope boundary above, (b) hoist exactly 3 schemas (not treatment.schema), (c) segmented-control over material-top-tabs, (d) RHF+datetimepicker as new mobile deps, (e) `collaboratorId`-resolves-to-self as a flagged risk to verify in apply/verify (not a blocker to entering proposal).
