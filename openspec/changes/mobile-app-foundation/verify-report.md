# Verify Report — Mobile App Foundation

**Change**: mobile-app-foundation
**Mode**: Standard (`strict_tdd: false` — verified via tsc/expo-doctor/expo-export/web-build + structure + grep; on-device render is a human/EAS step)
**Date**: 2026-07-13
**Verified**: `feat/mobile-app-foundation` @ `43e73a2` (PRs `82f44f3`/`e4782cd`/`43e73a2` + docs; independently re-run, apply reports not trusted blindly)

## Verdict

**PASS WITH WARNINGS** — 0 CRITICAL / 3 WARNING / 3 SUGGESTION

Every gate independently re-run (fresh `pnpm install`, `pnpm why react -r` + manual duplicate-React scan, `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, `npx expo export`, `pnpm --filter web build`, the out-of-scope greps, and a correctly-scoped `attachments.api.ts` diff) passed with real exit codes. Structure/config contracts match spec.md/design.md. tasks.md shows 30/30 `[x]` (confirmed by grep).

## Requirements checklist (R1–R10) — all PASS

The two adversarial ones the phase called out:
- **R1 (single React)**: `pnpm why react -r` resolves `react@19.2.7` identically across mobile/web/core; whole-tree scan found exactly one physical `node_modules/react` (hoisted) + one `.pnpm/react@19.2.7` store dir — no duplicate (the root `pnpm.overrides.react` holds).
- **R2 (core resolves via Metro)**: `queryClient.ts` does a real VALUE import `{ queryClient as coreQueryClient } from 'core/lib/queryClient'`; `npx expo export` bundled both platforms with ZERO "Unable to resolve module" errors.

R3 (QueryClient+MMKV persister), R4 (NetInfo→onlineManager + AppState→focusManager), R5 (i18n es default+fallback), R6 (RN Navigation v7 placeholder shell), R7 (UI primitives in components/shared, not core), R8 (env via app.config.ts extra + eas.json profiles), R9 (out-of-scope guard — no auth/feature wiring; attachments untouched), R10 (web build unbroken) — all ✅ with proof in the independent results below.

## Independent verification results

| Command | Result |
|---|---|
| `pnpm install` | exit 0 |
| `pnpm why react -r` + tree scan | single `react@19.2.7` workspace-wide (no duplicate) |
| `pnpm --filter mobile exec tsc --noEmit` | exit 0, clean |
| `npx expo-doctor` | 19/19 PASS |
| Android minSdk 24 | confirmed via `expo-modules-autolinking` Gradle plugin source default `"24"` |
| `npx expo export` | exit 0, iOS 850 / Android 938 modules, 24 nav assets, zero unresolved-module errors |
| `pnpm --filter web build` | exit 0 (only pre-existing chunk-size warning) |
| out-of-scope greps (setApiClient/patients/treatments/secure-store) | clean (only the expected `mmkv.ts` TODO) |
| `attachments.api.ts` diff (scoped `d98d72c..43e73a2`) | empty (correctly scoped to this change) |
| `git status` | clean |

## Scenario coverage

12 scenarios in spec.md (the brief said 13 — doc mismatch, see WARNING). All structurally verified; 7 proven by the ran gates (install/single-react, core-resolves-in-metro, tsc, expo-doctor, web-build-unbroken, out-of-scope-guard, nav+primitives present). 5 (query-persister-hydrates, offline-online-manager, i18n-es-default, nav-shell-renders, env-extra-resolves) are structurally correct but have no RUNTIME execution evidence — consistent with `strict_tdd:false` and design's "EAS build + on-device boot remain a human/CI step," not a hidden gap.

## Findings

**CRITICAL**: none.

**WARNING**:
1. `expo export` module counts reproduced here (iOS 850 / Android 938) differ from apply-progress's figures (940/924) — bundle success + zero unresolved-module errors reproduce identically, so correctness is unaffected; just don't treat the exact module counts as reproducible.
2. Task brief said "13 scenarios"; spec.md contains 12 — documentation mismatch, not an implementation defect.
3. 5 of 12 scenarios have no runtime execution evidence (headless limitation) — expected under `strict_tdd:false`; addressed by the recommended manual EAS boot.

**SUGGESTION**:
1. Do one manual EAS dev-client boot before layering #5/#6/#7 feature work on this foundation.
2. `i18next`/`react-i18next` versions drifted from design's sketch versions (but not from spec's open-ended contract) — cosmetic; the registry-current peer-compatible combo was used.
3. Reported PR line counts appear to exclude openspec doc-churn committed alongside — actuals land in forecast range, comfortably under the 400-line budget.

## Documented deviations reviewed

All checked against actual code/config, all accurate and non-conflicting with spec: `resolveJsonModule:true` (for the es.json import), `QueryBoundary`'s additive empty branch, `es.json` extra keys (common.error/empty), the SDK-55 sketch deviations (`newArchEnabled` dropped from the SDK-55 ExpoConfig type, `platforms` restricted to ios/android, `watchFolders` merged not replaced, root `pnpm.overrides.react`), and the never-performed on-device render (documented, consistent precedent).

## Recommendation

**PASS — proceed to `sdd-archive`** (after merge). No CRITICAL issues. The only open item is a manual EAS/on-device dev-client boot smoke test, recommended before feature work (#5/#6/#7) lands, not required before archiving this change. Note that #5 (mobile-auth-session) additionally depends on the housecenter-api device-bound-sessions change being merged/deployed.
