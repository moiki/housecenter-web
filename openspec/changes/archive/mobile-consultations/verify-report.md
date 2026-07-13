# Verification Report — mobile-consultations (change #8)

**Change**: mobile-consultations
**Branch**: feat/mobile-consultations
**Scope verified**: PR1 (committed `8de4682`) + PR2 (uncommitted working tree) — the FULL change vs `main`
**Mode**: Standard (strict_tdd: false, no test runner) — Static analysis + adversarial code review. Runtime round-trips (create/reply/resolve/attach) are Human/EAS-smoke-only per spec.md; NOT fabricated here.
**Verified by**: sdd-verify, 2026-07-13

---

## Completeness (tasks.md)

| Metric | Value |
|--------|-------|
| Tasks total | 23 (11 PR1 + 12 PR2) |
| Tasks complete `[x]` | 23 |
| Tasks incomplete `[ ]` | 0 |

All tasks marked complete; independently re-confirmed by `grep -c` on tasks.md (not trusted from apply-progress alone).

---

## Real Execution Evidence (re-run independently, not trusted from apply report)

| Gate | Command | Result |
|---|---|---|
| Single react copy | `pnpm -r why react` | ✅ PASS — react 19.2.7, one version, referenced consistently by `mobile`, `web`, `core` (all peer deps resolve to the same copy; no duplicate `.pnpm/react@*` trees) |
| Install | `pnpm install` | ✅ PASS — exit 0, lockfile up to date, no resolution changes |
| Core typecheck | `pnpm --filter core exec tsc -b` | ✅ PASS — exit 0, no output |
| Mobile typecheck | `pnpm --filter mobile exec tsc --noEmit` | ✅ PASS — exit 0, no output (covers the `NativeStackScreenProps` switch on `PatientDetailScreen`, the `uploadTargetId`/`useUploadAttachment` wiring, and the `pickPhoto`/`PickedPhoto` split typing) |
| expo-doctor | `npx expo-doctor` (apps/mobile) | ✅ PASS — 19/19 checks passed |
| expo export | `npx expo export` (apps/mobile) | ✅ PASS — Android bundled **1175 modules** (2990ms), iOS bundled **1204 modules** (4799ms); no bundling/unresolved-import errors; `dist/` is gitignored, left untracked |
| Web build (regression) | `pnpm --filter web build` | ✅ PASS — 1465 modules, built in 675ms (pre-existing >500kB chunk warning only, unrelated to this change) |
| Web lint (regression) | `pnpm --filter web lint` | ✅ PASS — clean, no output |

No fabricated results — every command above was executed in this session with the working tree exactly as left by apply (no commits/fixes were made during verification).

---

## Adversarial Checks (ratified decisions — grep/read-confirmed)

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | NO core hook/api/type changes beyond one additive schema file (D1) | ✅ PASS | `git diff main -- packages/core/src` shows **only** `packages/core/src/schemas/consultation.schema.ts` (new, 21 lines, both PR1+PR2 combined). `git diff main -- apps/web` is **empty** — web is byte-unaffected. |
| 2 | Reply-attach rules-of-hooks (design CRITICAL) | ✅ PASS | `ConsultationDetailScreen.tsx:63` — `useUploadAttachment('ConsultationMessage', uploadTargetId ?? '')` called unconditionally at component top level (not inside `onSend`/a callback/a condition). `useEffect([uploadTargetId])` (line 65-72) fires `upload.mutateAsync(...)`. `onSend` (line 74-78) only calls `postMessage.mutateAsync` then `setUploadTargetId(msg.id)` — **no** `.mutateAsync(` on an upload hook appears inline in the send handler. |
| 3 | Staged preview vs historical thumbs | ✅ PASS | `ConsultationDetailScreen.tsx:137` — plain `<Image source={{uri: staged.uri}}>` from `react-native` for the locally-picked photo. `MessageAttachmentThumb.tsx` (new file) uses `useAttachments('ConsultationMessage', messageId)` + `AuthedImage` (read-only) for historical bubble attachments, rendered per message at `ConsultationDetailScreen.tsx:95`. |
| 4 | Resolve gating | ✅ PASS | `ConsultationDetailScreen.tsx:106` — `canResolve = userId === consultation.assignedDoctorId && !resolved`; button only rendered when `canResolve` (line 114). No manual Open/UnderReview literal anywhere (`grep "'Open'\|'UnderReview'"` in consultations screens returns nothing). Compose replaced by a resolved-hint `Text` when `status==='Resolved'` (line 129). Only `useUpdateConsultationStatus` is used, and only with `{status:'Resolved'}` (line 117) — no other status transition call exists in the codebase. |
| 5 | Doctor picker source | ✅ PASS | `CreateConsultationScreen.tsx:34,74` — `usePatientFullSummary(patientId).assignedDoctors` (patient-scoped, `DoctorSummaryDto`), not a global user/doctor list. Zero-assigned-doctors guard: `s.assignedDoctors.length === 0` renders `<EmptyState messageKey="consultations.noDoctors">` instead of the form (line 69-73); `PatientDetailScreen.tsx:61,65` disables the "Escalar a Doctor" button + shows a Spanish hint (`consultations.noDoctors`) when `assignedDoctors.length === 0`. |
| 6 | 403 handling | ✅ PASS | `CreateConsultationScreen.tsx:56-60` — catches via `isApiError(err) && err.status === 403 && err.detail.includes('not_patient_collaborator')` → Spanish `Alert.alert(...)`, stays on form, no crash; any other error is re-thrown (not silently swallowed). No client-side collaborator gate exists anywhere (confirmed — `PatientDetailScreen`'s escalate button is gated only on `assignedDoctors.length`, never on collaborator membership). |
| 7 | attachmentUrl always null + ownerType reuse | ✅ PASS | `ConsultationDetailScreen.tsx:75` (`attachmentUrl: null` on post) and `CreateConsultationScreen.tsx:50` (`attachmentUrl: null` on create) — both hardcoded. `AttachmentOwnerType` union in `packages/core/src/types/attachment.types.ts:1` already includes `'ConsultationMessage'` (reused from #7, no new union member added). |
| 8 | Writes gated on `useOnline()` | ✅ PASS | Create submit (`CreateConsultationScreen.tsx:94`), reply send (`ConsultationDetailScreen.tsx:157`), attach button (`ConsultationDetailScreen.tsx:142`), and resolve (`ConsultationDetailScreen.tsx:116`) all have `disabled={!online \|\| ...}`. `OfflineBanner` rendered at the top of both `ConsultationDetailScreen` and `CreateConsultationScreen`. |
| 9 | `isApiError` importable from core | ✅ PASS | `packages/core/src/types/common.types.ts:43` exports `isApiError`; imported in `CreateConsultationScreen.tsx:9`; the 403 match compiles clean under `tsc --noEmit` (confirmed by the mobile typecheck gate above; same import path as pre-existing `LoginScreen.tsx`). |
| 10 | Scope discipline | ✅ PASS | No push/notification code in the diff (`git diff main -- apps/mobile/src \| grep -i "push\|notification"` → only unrelated pre-existing `NotificationBell`/`permissionDenied` hits). No `pickPhoto`/`pickAndUpload` import in `CreateConsultationScreen.tsx` (no attach-on-create). No `AttentionSession` reference added anywhere in the diff. |

**10/10 adversarial checks PASS. Zero FAILs.**

---

## Correctness — Requirements R1–R10 (Static/Structural Evidence)

| Req | Status | Notes |
|---|---|---|
| R1 — Core consultation schema | ✅ Implemented | `consultation.schema.ts` matches the spec contract exactly (`title`/`firstMessage`/`assignedDoctorId` `.trim().min(1)`, `treatmentId: z.null()`, `postMessageSchema.body`); web's inline schemas untouched (git diff empty) |
| R2 — Consultas bottom tab | ✅ Implemented | `TabNavigator.tsx` — 3 tabs, order Pacientes/Consultas/More; `ConsultationsStack.tsx` List→Detail |
| R3 — Consultations list screen | ✅ Implemented | `useConsultations({page,pageSize})` inside `QueryBoundary`/`EmptyState` (`emptyMessageKey="consultations.empty"`), no client re-filter, row tap navigates, no standalone "+" |
| R4 — Consultation detail/thread | ✅ Implemented | ASC-sorted thread, author+timestamp+`MessageAttachmentThumb` per message, compose disabled on Resolved, resolve gated to assigned doctor, no manual status control |
| R5 — Create consultation screen | ✅ Implemented | Colocated in `PatientsStack` (modal), RHF+`createConsultationSchema`, patient-scoped doctor picker, always `treatmentId:null`+`attachmentUrl:null`, `goBack()` on 201, zero-doctors guard, no patient picker inside the screen |
| R6 — Reply-time photo attachment | ✅ Implemented | `pickPhoto` split (wrapper unchanged for existing Patient/Treatment callers), `uploadTargetId`+effect upload pattern, read-only `MessageAttachmentThumb`, attach-on-create absent |
| R7 — Collaborator gating (none client-side) | ✅ Implemented | Escalate entry point unconditional; 403 `not_patient_collaborator` → friendly Spanish alert, no crash |
| R8 — Doctor scoped exception | ✅ Implemented | Reply (implicit, any participant incl. Doctor) + resolve (Doctor-only) on assigned consultations; no other Doctor/Admin mobile capability touched |
| R9 — Offline write-gating | ✅ Implemented (code-trace) | `useOnline()` + `OfflineBanner` gate create/reply/resolve/attach; reads flow through the pre-existing app-wide `PersistQueryClientProvider` (unmodified, established in change #4) — no live airplane-mode device test performed |
| R10 — Spanish-first + web regression | ✅ Implemented | All new `es.json` keys are Spanish; web build+lint green; core touched only by the one additive schema file |

**10/10 requirements structurally implemented. Zero missing.**

---

## Coherence — Design (8 ADRs)

| Decision | Followed? | Notes |
|---|---|---|
| D1 — One core schema hoist, web untouched | ✅ Yes | Confirmed via diff |
| D2 — Consultas 3rd tab + create colocated in PatientsStack (Option A) | ✅ Yes | `ConsultationsStack.tsx` is a standalone file (mirrors `PatientsStack.tsx`'s idiom) rather than inline in `TabNavigator.tsx` like `MoreStack` — **explicitly flagged as a deviation in tasks.md 1.4**; a reasonable, non-functional structural choice, not a scope change |
| D3 — attachmentUrl always null + polymorphic ownerType, reply-only v1 | ✅ Yes | Confirmed |
| D4 — pickPhoto split + rules-of-hooks upload pattern + read-only thumb | ✅ Yes | Confirmed; `PickedPhoto` narrower type is a documented deviation from design's terse sketch (type-narrowing only, not a behavior change) |
| D5 — Patient-scoped doctor picker + zero-doctors handling | ✅ Yes | Confirmed |
| D6 — Role-conditional resolve, no manual transitions, Doctor scoped exception | ✅ Yes | Confirmed |
| D7 — Collaborator gating = none client-side, graceful 403 | ✅ Yes | Confirmed |
| D8 — Online-gated writes | ✅ Yes | Confirmed |

No rejected alternatives were accidentally implemented (no global doctor list, no client-side collaborator gate, no manual status buttons, no `AuthedImage` on the staged preview).

---

## Spec Compliance Matrix (15 scenarios)

### Proven — static/structural (code trace + real gate execution)

| Requirement | Scenario | Evidence | Result |
|---|---|---|---|
| R1 | core-schema-typechecks | `pnpm --filter core exec tsc -b` exit 0 | ✅ COMPLIANT |
| R1, R10 | web-build-unbroken | `pnpm --filter web build`+`lint` both exit 0; `git diff main -- apps/web` empty | ✅ COMPLIANT |
| R2–R9 | mobile-typechecks | `pnpm --filter mobile exec tsc --noEmit` exit 0 | ✅ COMPLIANT |
| R2, R6 | expo-doctor-clean | 19/19 checks passed | ✅ COMPLIANT |
| R2–R9 | expo-export-bundles | iOS 1204 / Android 1175 modules, no bundling errors | ✅ COMPLIANT |
| R2, R3 | consultas-tab-renders | Code trace: `TabNavigator` 3rd tab; `ConsultationsListScreen` wraps `QueryBoundary`/`EmptyState` | ✅ COMPLIANT |
| R4 | open-consultation-detail | Code trace: ASC sort, author/timestamp/`MessageAttachmentThumb` per message | ✅ COMPLIANT |
| R5 | zero-assigned-doctors | Code trace: `EmptyState` guard in `CreateConsultationScreen` + disabled button in `PatientDetailScreen` | ✅ COMPLIANT |
| R9 | offline-write-blocked | Code trace: `useOnline()` disables every write control; `OfflineBanner` rendered — spec.md itself defines this scenario as code-trace-provable, not runtime | ✅ COMPLIANT (code-trace; no live airplane-mode device test) |

**9/9 static scenarios compliant.**

### Pending — Human/EAS smoke (NOT run, NOT fabricated — needs live API `:5080` + dev client + Doctor-role account)

| Requirement | Scenario | Status |
|---|---|---|
| R5 | create-consultation (201, status Open, navigates back) | ⏳ PENDING — Human/EAS smoke |
| R7 | escalate-not-collaborator-403 | ⏳ PENDING — Human/EAS smoke |
| R4, R8 | doctor-reply-auto-under-review (server-side Open→UnderReview) | ⏳ PENDING — Human/EAS smoke |
| R4 | post-reply (generic participant reply + cache refetch) | ⏳ PENDING — Human/EAS smoke |
| R6 | attach-photo-to-reply (upload + thumbnail renders + retrievable via API) | ⏳ PENDING — Human/EAS smoke |
| R4, R8 | resolve-only-assigned-doctor (resolve visibility + post-resolve 409) | ⏳ PENDING — Human/EAS smoke |

**6/6 Human/EAS scenarios correctly reported as pending — none claimed proven.**

**Total: 9/15 scenarios compliant via static evidence; 6/15 pending Human/EAS smoke (unavoidable given `strict_tdd:false`, no test runner, and no live dev/CI environment in this session).**

Note: the task-prompt's shorthand list of "6 runtime scenarios" (create-201, escalate-403, doctor-reply-auto-transition, attach-photo, resolve→409, **offline-write-blocked**) differs slightly from spec.md's own tagging (which marks **post-reply** as Human/EAS smoke and tags **offline-write-blocked** as code-trace-provable instead). This report follows spec.md as the ground-truth artifact — offline-write-blocked is verified via code trace per spec.md's own scenario definition, and post-reply is carried as the 6th pending smoke item. This is a minor spec/prompt wording discrepancy, not a functional gap (see SUGGESTION below).

---

## Line Count / Review Workload (independently reproduced, not trusted from apply-progress)

Used `git add -N` (intent-to-add, non-destructive) on the two untracked PR2 files, then `git diff --stat`, then reset:

```
7 files changed, 345 insertions(+), 67 deletions(-)  =  412 changed lines
```

This **exactly matches** the apply-progress report's claim of 412 changed lines. PR2 is marginally over the 400-line review budget (~3% over), driven by `ConsultationDetailScreen.tsx`'s attach-flow additions (+122) and `PatientDetailScreen.tsx`'s `NativeStackScreenProps` switch + escalate button/styles (+73) — both already disclosed in tasks.md and apply-progress, not a new finding. No mid-apply split was made; this was an explicit orchestrator-scoped final-batch decision under `delivery_strategy: ask-on-risk` / `stacked-to-main`.

---

## Issues Found

**CRITICAL** (must fix before archive):
None.

**WARNING** (should fix, does not block archive):
1. **6 spec scenarios remain unverified at runtime** (create-201, escalate-403, doctor-reply-auto-under-review, post-reply, attach-photo-to-reply, resolve→409) — unavoidable given `strict_tdd:false` and no live dev/CI environment available in this session. Recommend running the Human/EAS smoke pass (live API `:5080`, dev client, Member + Doctor-role accounts) before merging to `main`, per tasks.md's own "PR done when" criteria.
2. **PR2 is marginally over the 400-line review budget** (412 vs 400, ~3% over) — already self-disclosed in tasks.md/apply-progress. Flagging for reviewer visibility per the Review Workload Guard; not a functional defect.

**SUGGESTION** (nice to have, non-blocking):
1. Minor discrepancy between the task-prompt's paraphrased list of 6 "runtime" scenarios and spec.md's own Human/EAS-smoke tagging (spec.md tags `post-reply` as smoke and `offline-write-blocked` as code-trace; the prompt's shorthand swapped these). Worth aligning wording in a future spec revision so downstream prompts/instructions don't drift from the source artifact.
2. `openspec/changes/mobile-consultations/state.yaml` still shows `phase: tasks` / `completed_phases: [explore, propose, spec, design, tasks]` (not yet updated for apply/verify) — expected to be finalized by `sdd-archive`, not a verify-phase concern, but noting for the archive handoff.
3. Consider trimming `ConsultationDetailScreen.tsx`'s attach-flow footprint or splitting reply-attach into its own PR in future SDD changes of similar shape, to stay more comfortably under the 400-line budget without relying on post-hoc disclosure.

---

## Verdict

### PASS WITH WARNINGS

**0 CRITICAL / 2 WARNING / 3 SUGGESTION.**

All real-execution gates (install, single-react-copy dedupe, core `tsc -b`, mobile `tsc --noEmit`, `expo-doctor` 19/19, `expo export` iOS 1204/Android 1175 modules, web build, web lint) pass green, independently re-run in this session — none trusted from the apply report. All 10 adversarial checks on the ratified architecture decisions (D1–D8 plus the rules-of-hooks and scope-discipline constraints) pass. All 10 spec requirements (R1–R10) are structurally implemented and all 23 tasks are marked complete and match the code state. The only gap is the unavoidable Human/EAS runtime smoke pass (6/15 scenarios) — explicitly out of scope for static verification per `strict_tdd:false`, correctly reported as pending rather than fabricated, and downgraded to WARNING (not CRITICAL) per this change's verification rules. The change is ready for archive once the Human/EAS smoke pass is run (recommended before merge, not before archive of the planning artifacts).
