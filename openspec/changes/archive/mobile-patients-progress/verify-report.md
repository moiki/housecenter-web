# Verify Report — Mobile Patients & Progress Recording

**Change**: mobile-patients-progress
**Mode**: Standard (`strict_tdd: false` — verified via tsc/expo-doctor/expo-export/web-build + code trace; record-progress round-trips are Human/EAS-smoke-only)
**Date**: 2026-07-13
**Verified**: `feat/mobile-patients-progress` @ `a962065` (independently re-run, apply reports not trusted; working tree clean)

## Verdict

**PASS WITH WARNINGS** — 0 CRITICAL / 3 WARNING / 2 SUGGESTION.

All 34/34 tasks `[x]` and confirmed against code; every automated gate re-run green; structure matches spec R1–R14 + design D1–D9 field-for-field, including the adversarial checks (no session delete, no treatment/patient CRUD, `collaboratorId=self` with no picker). Warnings are the items the spec itself says must not be silently closed (the `collaboratorId` attribution + the 5 Human/EAS-smoke scenarios) + a review-workload note — no code defects.

## Requirements checklist (R1–R14)

R1 treatmentDetail schema ✅ · R2 session schema (locationMode discriminator + superRefine) ✅ · R3 comment schema deduped ✅ · R4 3 web tabs rewired, treatmentSchema stays inline, web green ✅ · R5 mobile deps (RHF/resolvers/datetimepicker) ✅ · R6 Home→Pacientes + stack ✅ · R7 PatientsListScreen view-only paged ✅ · R8 4-tab segmented control, no Attachments ✅ · R9 Treatments view+patch+create-detail+comment, no CRUD ✅ · R10 Sessions create(collaboratorId=self)+patch, **no delete** ✅ · R11 Comments create-only ✅ · R12 mutations gate on onlineManager/useOnline ✅ · R13 `collaboratorId=user.id` **⚠️ PARTIAL** (implemented correctly, NOT smoke-confirmed) · R14 Spanish-first, web green ✅.

## Independent verification results

| Command | Result |
|---|---|
| `pnpm install` | clean, single hoisted react@19.2.7 |
| `pnpm --filter core exec tsc -b` | exit 0 |
| `pnpm --filter mobile exec tsc --noEmit` | exit 0 |
| `npx expo-doctor` | 19/19 |
| `npx expo export` | android 1177 / ios 1171 modules, no unresolved-module errors |
| `pnpm --filter web build` + `lint` | exit 0 (1465 modules) — no regression from the shared-schema rewire |
| `pnpm -w build` | exit 0 |
| `git status` / `git log main..` | clean; docs + 4 PR commits |
| diffstat vs apply claims | PR1~118, PR2~699, PR3~427, PR4~523 — matched independently |

## Scenario coverage (15)

10/15 proven headless (core-schemas-typecheck, web-build-unbroken, mobile-typechecks, expo-doctor, expo-export-bundles, patients-list-renders, patient-detail-fullsummary, segmented-control, patch-treatment-status, offline-write-blocked). 5/15 **pending Human/EAS smoke** (create-session + attribution [resolves D6/R13], patch-session-status, create-treatment-detail, create-comment, write-then-appears-on-web) — need live API `:5080` + dev client; not fabricated.

## Findings

**CRITICAL**: None.

**WARNING**:
1. **R13/D6 `collaboratorId=user.id`** remains an unconfirmed working assumption — must not be treated as verified until the smoke confirms attribution surfaces correctly on web (fallback: cross-repo `/collaborators/me` request).
2. **5/15 scenarios never runtime-exercised** (only code-traced) — a real behavioral-proof gap, though a pre-approved deferral (`strict_tdd:false`, no live API headless).
3. **PR2 exceeded budget** (699 vs forecast 450-550, and design's ≤400/PR) — reviewer-burden note, not a defect; addressed at PR-open (size:exception or split).

**SUGGESTION**:
1. Pagination hand-rolled 4× (TreatmentsTab ×3, SessionsTab ×1) — extract a shared paginator.
2. The 4 commits aren't yet opened as GitHub PRs — process step for delivery.

## Documented deviations reviewed

`useOnline` hook (matches D7, RN-only) ✅ · `QueryBoundary.emptyMessageKey` (backward-compatible) ✅ · PR2/PR3 line overshoot (confirmed via independent diffstat, not inflated) ✅ · `collaboratorId=self` (correctly flagged, not silently resolved) ✅ · pagination duplication (confirmed, deferred cleanup) ✅.

## Recommendation

**PASS.** No CRITICAL issues; everything statically verifiable is green and the Member write-scope boundary is exactly as ratified. Before treating R13/D6 as closed (and before archive/feature-work on top), run the deferred Human/EAS smoke — **prioritizing the `collaboratorId` collaborator-attribution check** — on a dev client vs the local API `:5080`. If it fails, the fix is a cross-repo `/collaborators/me` request to the API team, not a mobile code change.
