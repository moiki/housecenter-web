# Verify Report — Core Extraction

**Change**: core-extraction
**Mode**: Standard (`strict_tdd: false` — verified via build/lint/grep + static analysis; interactive browser smoke is a separate human step)
**Date**: 2026-07-12
**Verified**: branch `feat/core-extraction` @ `361ac1f` (PRs `51a955c`/`a63f123`/`7fe02be`/`361ac1f` + docs)

## Verdict

**PASS WITH WARNINGS** — 0 CRITICAL / 3 WARNING / 2 SUGGESTION

All build/lint/workspace gates independently re-run green; the import-surface, DOM-leakage, enum, deviceId, and workspace-dep grep contracts all pass exactly; and the high-risk R6 hydration behavior is statically proven equivalent to pre-change web behavior. Recommended: proceed to open PRs (and, before archive/merge, a human runs the 2 interactive smokes).

## Requirements checklist

| Req | Status | Proof |
|---|---|---|
| R1 — Source-consumed (JIT) core package | ✅ | `packages/core/package.json` exports map → `./src/**/*.ts`, no dist; `pnpm --filter core build` (tsc) exit 0; `apps/web/node_modules/core` is a real symlink to `packages/core` |
| R2 — Extraction boundary | ✅ | types/api-modules/feature-hooks/schemas/lib(recurrence,queryClient,role-constants) in core; DOM-only hooks + NAV_ITEMS + concrete client/store in web |
| R3 — `createApiClient` contract | ✅ | `core/src/api/http/createApiClient.ts` carries Bearer interceptor + 401 single-flight queue; `onRefreshFail`/`tokenStore`/`deviceIdProvider` injected; sends deviceId on internal refresh |
| R4 — Client indirection | ✅ | 15 modules use `getApiClient()`; `grep "from '@/api/client'" apps/web/src` → 0 external |
| R5 — `createAuthStore` contract | ✅ | `core/src/auth/createAuthStore.ts` + `TokenStore`/`AuthStorage` interfaces; `getAuthStore`/`setAuthStore` registry |
| R6 — Auth hydration gate | ✅ | `authHydrated` seeded `true` synchronously on web (localStorage non-thenable) before first render; `AuthBootstrap`'s derived `ready` predicate proven behavior-equivalent to the old sync check in both branches (see deep-dive) |
| R7 — `useMe` pure query hook | ✅ | moved to `core/src/hooks/auth/useMe.ts`, dark-mode DOM effect removed, uses `getAuthStore()`; dark-mode now solely in `AuthBootstrap` |
| R8 — Enum correctness | ✅ | `core/src/types/patient.types.ts`: `TreatmentStatus` has `Paused` (no `Cancelled`); `CommentType = 'Route'|'Medical'|'Simple'` (no Note/Alert/Observation) |
| R9 — deviceId support | ✅ | `LoginRequest`/`RefreshRequest`/`SignupRequest` carry `deviceId`; traced into login (LoginPage), signup (SignupPage), silent refresh (AuthBootstrap), internal 401-refresh (createApiClient) — one persisted UUID source |
| R10 — Web behavior preserved | ✅ | `pnpm --filter web build` green (1462 modules); `lint` 0 problems; `pnpm -w build` 2/2; all four moved layers now sourced from core (grep 0) |

## Independent verification results

| Command | Result |
|---|---|
| `pnpm install` | clean; `apps/web/node_modules/core` real symlink to `packages/core` |
| `pnpm --filter core build` (tsc) | exit 0 |
| `pnpm --filter web build` | exit 0, 1462 modules, dist emitted |
| `pnpm --filter web lint` | exit 0, **0 problems** |
| `pnpm -w build` (turbo) | 2 successful, 2 total |
| `grep "from '@/\(types\|hooks\|api/modules\|schemas\)" apps/web/src` | 0 matches |
| `grep "from '@/api/client'" apps/web/src` | 0 external (client.ts self only) |
| `grep "document\.\|window\." core/src/{hooks,schemas}` | 0 (core UI-agnostic; `api/modules/attachments.api.ts` uses `File`/`FormData` by design — see WARNING) |
| enum / deviceId / workspace-dep greps | all pass as specified |
| `git status` / `git log main..feat/core-extraction` | clean; docs + 4 PR commits, each under the 400-line review budget |

## Scenario coverage (12)

core-package-typechecks ✅ · workspace-graph-has-core-dep ✅ · web-imports-core ✅ · api-module-uses-getApiClient ✅ · client-401-refresh-queue ✅ (logic preserved verbatim from the web client) · refresh-failure-calls-onRefreshFail ✅ · auth-store-indirection ✅ · auth-hydrated-gate ✅ (static proof; interactive confirmation = human smoke) · use-me-pure-hook ✅ · enum-corrected ✅ · deviceId-sent ✅ · web-builds-after-each-slice ✅ (all 4 PR commits independently build-green).

## Findings

**CRITICAL**: None.

**WARNING**:
1. **Interactive browser smokes (tasks 3.6/3.7) still `[ ]`** — hard-reload-while-authed (no `/login` bounce) and logged-out first paint (no spinner flash) need a running API + logged-in session; a real remaining human step, not a defect. The static hydration proof covers the correctness argument; the smoke is confirmation.
2. **`packages/core/tsconfig.json` includes `lib: DOM`** — needed for `File`/`FormData` in `attachments.api.ts`. Known mobile-adaptation debt (RN `FormData.append` takes `{uri,name,type}`); no runtime DOM coupling in core, just type-checking lib. To be revisited in the mobile change.
3. **Engram apply-progress (#531) stale** — says PR3/PR4 uncommitted, but git shows all 4 committed and tree clean. Metadata drift (apply-progress was saved before the orchestrator committed), not a code issue.

**SUGGESTION**:
1. `useMe` has zero callers anywhere (pre-existing since first commit, not a regression) — candidate for future dead-code removal or wiring.
2. Pre-existing Vite chunk-size warning (`index-*.js` > 500 kB) — unrelated to this change; future code-splitting.

## Documented deviations reviewed

- **D5 derived-state form** (instead of the literal `setState`-in-effect sketch) — judged genuinely equivalent across both readiness branches; the deviation avoids a real `react-hooks/set-state-in-effect` ESLint error. Accepted.
- **core tsconfig DOM lib** — accepted as mobile-adaptation debt (WARNING 2).
- **`useMe` no callers** — accepted (SUGGESTION 1), pre-existing.
- **Interactive smokes deferred** — accepted as a human step before merge (WARNING 1).

## Recommendation

**Proceed to open the PRs** (4 stacked, on the bootstrap chain). No CRITICAL issues; all automatable gates green and the high-risk hydration item statically proven equivalent. Before archive/merge: (a) a human runs the 2 interactive auth smokes; (b) coordinate the deviceId deploy with the housecenter-api device-bound-sessions cutover (web must send deviceId before/with that API deploy).
