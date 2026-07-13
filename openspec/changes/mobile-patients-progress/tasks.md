# Tasks: Mobile Patients & Progress Recording

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines (hand-written; lockfile excluded) | ~1,400–1,700 across full in-scope work |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 4 PRs — one per phase below |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

**Basis:** grounded against real files, not guesses. PR1 (schema hoist + web rewire) is
small — measured against the actual inline blocks: `TreatmentsTab.tsx` `detailSchema`+
`commentSchema` = 12 lines, `SessionsTab.tsx` `createSchema`+`statusSchema` = 26 lines,
`CommentsTab.tsx` `schema` = 5 lines; 3 new core files ≈ 55–60 lines; web edits (delete
inline + add import) ≈ 55 lines → **PR1 ≈ 110–140 lines, Low risk alone**, gated for
blast-radius (shared file), not size. PR2 bundles nav rewire (`TabNavigator.tsx` is 65
lines today) + 4 **new** RN form wrappers (RHFTextInput/RHFSelect/RHFPickerField/
RHFDateField ≈ 185 lines — Modal+FlatList and datetimepicker platform-split wrappers run
long) + `PatientsStack.tsx` + 3 screens (List/Detail/Overview) + `es.json` namespace →
**PR2 ≈ 450–550 lines, the tightest bin** against budget. PR3 (one screen: list + status
chips + create-detail panel + comment panel) ≈ 280–360 lines, Medium. PR4 bundles
`CreateSessionScreen` (modal, most fields of any form in this change) + mobile
`SessionsTab` + mobile `CommentsTab` + i18n → **PR4 ≈ 550–650 lines, the largest PR** —
RN `StyleSheet` boilerplate inflates line count vs. web's MUI `sx` equivalents.
**Swing factors:** if PR2 or PR4 overshoot 400 in practice, sdd-apply should sub-split
within the same chain slot (e.g. PR2a wrappers+nav / PR2b list+detail screens; PR4a
session-create+status-patch / PR4b patient-comments) rather than abandon the 4-PR shape
locked in design.md.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Hoist 3 core Zod schemas + rewire 3 web tabs | PR1 | Shared file — web build/lint regression gate mandatory |
| 2 | Mobile deps + RHF wrappers + Pacientes tab + list + detail shell | PR2 | Largest risk bin — watch actual diff size |
| 3 | Treatments list + status patch + detail-create + treatment comments | PR3 | Depends on PR1 (schemas) + PR2 (wrappers, stack) |
| 4 | Sessions tab + create-session modal + patient Comments tab | PR4 | Depends on PR3; resolves D6 open question via smoke |

---

## Phase 1: Core schema hoisting — PR1 (R1–R4)

- [x] 1.1 Create `packages/core/src/schemas/treatmentDetail.schema.ts` — export `createSchema` (`name`/`description` `min(1)`, `treatmentDate` `min(1)`, `profile` `""→null`), byte-identical move of `TreatmentsTab.tsx`'s `detailSchema` (R1)
- [x] 1.2 Create `packages/core/src/schemas/session.schema.ts` — export `createSchema` (`locationMode` discriminator + `superRefine` on `clinicId`/`workRouteId`) + `statusSchema`, byte-identical move of `SessionsTab.tsx:33-59` (R2)
- [x] 1.3 Create `packages/core/src/schemas/comment.schema.ts` — export one schema (`body` `min(1)`, `type: Route|Medical|Simple`), de-dupes `TreatmentsTab.tsx`'s `commentSchema` + `CommentsTab.tsx:27-31` (R3)
- [x] 1.4 Rewire `apps/web/src/pages/patients/TreatmentsTab.tsx` — drop inline `detailSchema`+`commentSchema`, import both from core; `treatmentSchema` stays inline (R4)
- [x] 1.5 Rewire `apps/web/src/pages/patients/SessionsTab.tsx` — drop inline `createSchema`/`statusSchema` (lines 33-59), import from `core/schemas/session.schema` (R4)
- [x] 1.6 Rewire `apps/web/src/pages/patients/CommentsTab.tsx` — drop inline `schema` (lines 27-31), import from `core/schemas/comment.schema` (R4)
- [x] 1.7 Run `pnpm --filter core exec tsc -b`, `pnpm --filter web build`, `pnpm --filter web lint`, `pnpm -w build` — all green (R1-R4, R14)

*Parallel: 1.1-1.3 independent of each other; 1.4-1.6 each depend only on their matching 1.1/1.2/1.3 and can run in parallel with each other. 1.7 is sequential, last.*

**PR1 done when:** all 4 commands in 1.7 exit 0; the 3 hoisted files field-for-field match their web originals (code trace); `treatmentSchema` still resolves locally in `TreatmentsTab.tsx`. Automated gate — no Human/EAS smoke needed.

---

## Phase 2: Mobile deps + Pacientes tab + list + detail shell — PR2 (R5–R8)

- [ ] 2.1 `apps/mobile/package.json` — add `react-hook-form ^7.79.0`, `@hookform/resolvers ^5.4.0`; `npx expo install @react-native-community/datetimepicker` (R5)
- [ ] 2.2 Create `apps/mobile/src/components/shared/form/RHFTextInput.tsx` — Controller-wrapped `TextInput` + error text (D4)
- [ ] 2.3 Create `apps/mobile/src/components/shared/form/RHFSelect.tsx` — Controller-wrapped Pressable-pill group for small enums (D4)
- [ ] 2.4 Create `apps/mobile/src/components/shared/form/RHFPickerField.tsx` — Controller-wrapped `Modal`+`FlatList` picker for large lists (clinics/work routes) (D4)
- [ ] 2.5 Create `apps/mobile/src/components/shared/form/RHFDateField.tsx` — Controller-wrapped datetimepicker, `mode="date"|"datetime"`, string↔ISO on submit (D5)
- [ ] 2.6 Modify `apps/mobile/src/navigation/TabNavigator.tsx` — rename `Home`→`Pacientes`, mount `PatientsStackNavigator`, `headerShown:false` on the tab (R6, D8)
- [ ] 2.7 Create `apps/mobile/src/navigation/PatientsStack.tsx` — native-stack `PatientsList`→`PatientDetail` (+ `CreateSession` typed in `PatientsStackParamList`, screen wired in PR4) (R6, D8)
- [ ] 2.8 Create `apps/mobile/src/screens/patients/PatientsListScreen.tsx` — `usePatients(page)` + `FlatList` + client-side search + `QueryBoundary`/`LoadingState`/`EmptyState`; no create/edit/deactivate control (R7)
- [ ] 2.9 Create `apps/mobile/src/screens/patients/PatientDetailScreen.tsx` — `usePatientFullSummary(id)` + custom segmented control (local `useState<TabId>`, 4 tabs) (R8)
- [ ] 2.10 Create `apps/mobile/src/screens/patients/OverviewTab.tsx` — read-only summary fields; `assignedDoctors` NOT rendered (R8)
- [ ] 2.11 Modify `apps/mobile/src/i18n/locales/es.json` — add `patients` namespace (list/search/detail/tab labels) (R14, D9)
- [ ] 2.12 Run `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, `npx expo export`, `pnpm --filter web build` — all green (R5-R8, R14)

*Parallel: 2.2-2.5 (wrappers) independent of each other and of 2.6-2.7 (nav); 2.8-2.10 need 2.7's `PatientsStackParamList` first, then can proceed in parallel. 2.11 independent throughout. 2.1 and 2.12 are the sequential entry/exit points.*

**PR2 done when:** all 4 commands in 2.12 pass; Pacientes tab list→detail→segmented-control navigation confirmed by code trace; `expo export` succeeds with the new datetimepicker native dep resolved. Automated gate — no Human/EAS smoke needed.

---

## Phase 3: Treatments + Details tab — PR3 (R9)

- [ ] 3.1 Create `apps/mobile/src/screens/patients/TreatmentsTab.tsx` — `useTreatments`/`useTreatmentDetails` read-only list (R9)
- [ ] 3.2 Add status chips wired to `usePatchTreatmentStatus` (Active\|Completed\|Paused), gated on `onlineManager.isOnline()` (R9, R12)
- [ ] 3.3 Add inline create-treatment-detail panel — RHF + `zodResolver(treatmentDetail.schema)` + `RHFDateField mode="date"` + `useCreateTreatmentDetail`, gated on `onlineManager` (R9, R12)
- [ ] 3.4 Add inline treatment-comment create panel — RHF + `zodResolver(comment.schema)` + `useCreateTreatmentComment`, gated on `onlineManager`; no treatment create/edit/delete anywhere on this tab (R9, R12)
- [ ] 3.5 Extend `apps/mobile/src/i18n/locales/es.json` — treatments tab labels + `treatmentStatus` enum-label map (R14, D9)
- [ ] 3.6 Run `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, `npx expo export` — all green (R9)
- [ ] 3.7 **Human/EAS smoke** (dev client + local API `:5080`, needs dev/CI env): create-treatment-detail appears in list; patch-treatment-status persists; confirm `onlineManager` gate blocks submit while offline (R9, R12)

*Sequential: 3.1-3.4 edit the same file (`TreatmentsTab.tsx`) — one unit of work, not parallelizable. 3.5 can run alongside 3.2-3.4. 3.6 then 3.7 close the phase.*

**PR3 done when:** 3.6's automated gates pass AND 3.7's Human/EAS smoke confirms create-detail + status-patch round-trip — or is explicitly reported as "needs dev/CI env" (not fabricated) if no live API/dev client is available at apply time.

---

## Phase 4: Sessions tab + patient Comments tab — PR4 (R10–R13)

- [ ] 4.1 Create `apps/mobile/src/screens/patients/CreateSessionScreen.tsx` — stack modal, RHF + `zodResolver(createSessionSchema)`, `locationMode clinic|workRoute` toggle → `clinicId`/`workRouteId` via `RHFPickerField`, `attentionType` via `RHFSelect`, `sessionDate` via `RHFDateField mode="datetime"`, duration/notes, `collaboratorId = useAuthStore().user.id` hidden field (R10, D6)
- [ ] 4.2 Modify `apps/mobile/src/navigation/PatientsStack.tsx` — register `CreateSession` as `presentation:'modal'`, wire "Nueva sesión" entry point (R6, R10)
- [ ] 4.3 Create `apps/mobile/src/screens/patients/SessionsTab.tsx` — `useSessions` list + inline status-patch panel (RHF + `statusSchema` + `usePatchSessionStatus`, Scheduled\|Completed\|Missed); no delete action (R10)
- [ ] 4.4 Gate `CreateSessionScreen` submit + status-patch submit on `onlineManager.isOnline()`, show `OfflineBanner` when offline (R12)
- [ ] 4.5 Create `apps/mobile/src/screens/patients/CommentsTab.tsx` — `summary.comments` list + inline create panel (RHF + `comment.schema` + `useCreatePatientComment`), gated on `onlineManager`; no delete (R11, R12)
- [ ] 4.6 Extend `apps/mobile/src/i18n/locales/es.json` — sessions/comments labels + `attentionType`/`sessionStatus`/`commentType` enum-label maps (R14, D9)
- [ ] 4.7 Run `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, `npx expo export` — all green (R10-R12)
- [ ] 4.8 **Human/EAS smoke** (dev client + local API `:5080`, needs dev/CI env): create session as Member with `locationMode=clinic` (and `workRoute`) → confirm `collaboratorId===user.id` AND manually confirm attribution surfaces correctly on `apps/web`'s `PatientProfilePage` (resolves D6/R13); patch session status; add patient comment; kill connectivity → reads render from MMKV cache + `OfflineBanner` + submit buttons disabled; reconnect → confirm all 3 write types appear on web (R10-R13)

*Parallel: 4.1, 4.3, 4.5 touch different files and can proceed in parallel once PR3 lands; 4.2 depends on 4.1 existing. 4.4 threads through 4.1/4.3. 4.6 independent. 4.7 then 4.8 close the phase and the change.*

**PR4 done when:** 4.7's automated gates pass AND 4.8's Human/EAS smoke confirms session-create + collaborator attribution + status-patch + comment-create + offline round-trip — or is explicitly reported as "needs dev/CI env" if unavailable. D6 (`collaboratorId=user.id`) is confirmed or escalated with the `/collaborators/me` fallback noted (cross-repo, not a build blocker).

---

## Notes & Risks

- `strict_tdd:false` — no test runner in this monorepo. Automated verification is `tsc`/`expo-doctor`/`expo export`/`pnpm --filter web build`/code-trace only.
- 5 of 15 spec scenarios (create-session+attribution, patch-session-status, create-treatment-detail, create-comment, write-then-appears-on-web) are **Human/EAS smoke** — require a running API (`:5080`) + dev client. sdd-apply MUST report these as "needs dev/CI env," never fabricate a pass.
- PR1 touches shared web code (`packages/core/src/schemas` consumed by `apps/web`) — `pnpm --filter web build` + `lint` is a **mandatory regression gate**, not optional, before merge.
- D6 (`collaboratorId=user.id`) is the one unresolved assumption in the whole change — PR4's smoke (4.8) MUST confirm attribution before it's treated as verified; fallback is a cross-repo `/collaborators/me` request to the API team if wrong.
- `@react-native-community/datetimepicker` Expo SDK 55 compat is a D5 risk — verify at `expo-doctor`/`expo export` in PR2 (install) and re-confirm at first real usage in PR3 (`mode="date"`) and PR4 (`mode="datetime"`).
- Metro/`expo export` must resolve `packages/core`'s new `schemas/*` subpaths (raw TS, no build step) — first mobile consumer is PR3; flag if the resolver needs a `package.json` exports tweak.
- Chain dependency: PR2→PR1, PR3→PR2, PR4→PR3 (stacked-to-main, sequential merge order per design.md), even though PR3/PR4 are the first *technical* consumers of the PR1 schemas.
