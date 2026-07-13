# Verify Report — Mobile Auth + Device-Bound Session

**Change**: mobile-auth-session
**Mode**: Standard (`strict_tdd: false` — verified via tsc/expo-doctor/expo-export/web-build + structure + code trace; auth round-trips are Human/EAS-smoke-only)
**Date**: 2026-07-13
**Verified**: `feat/mobile-auth-session` @ `47d32ec` (independently re-run, apply reports not trusted)

## Verdict

**PASS WITH WARNINGS** — 0 CRITICAL / 4 WARNING / 3 SUGGESTION.

All automated gates green on an independent re-run; all 12 requirements + 26 tasks verified by direct code read. The one load-bearing gap is the Human/EAS smoke of the auth round-trips (login/refresh/logout/revoke) — a WARNING, not a defect, mandatory before archive.

## Requirements checklist (R1–R12) — all PASS

- R1 (4 core session endpoints), R2 (DeviceSessionResponse + LogoutRequest + RefreshRequest trim), R3 (authKeys + 4 hooks, revoke→invalidate) — `packages/core/src/{types/auth.types.ts, api/modules/auth.api.ts, hooks/auth/*}`.
- R4 (async SecureStore AuthStorage; access token memory-only), R5 (deviceId separate key surviving logout), R6 (lazy MMKV, no top-level `new MMKV`, SecureStore-sourced key) — `apps/mobile/src/lib/{secureStore,deviceId,mmkv,persister}.ts`.
- R7 (bootstrap order + render gate), R8 (silent cold-start refresh + atomic rotation via core's unchanged 401 queue), R9 (v7 conditional Login|Tabs) — `apps/mobile/src/{bootstrap.ts, index.ts, components/AuthBootstrap.tsx, navigation/RootNavigator.tsx}` + `packages/core/src/api/http/createApiClient.ts`.
- R10 (login `setTokens`-before-`/me`, explicit `platform` from `Platform.OS`, 401→Spanish) — `screens/auth/LoginScreen.tsx`.
- R11 (device list/highlight-current/revoke/logout/revoke-all) — `screens/more/{MoreScreen,DevicesScreen}.tsx`.
- R12 (push out of scope — grep-clean; web build/lint green) — shared core auth files don't break web.

Adversarial checks confirmed: mobile injects core's 401 refresh queue via the 3 seams without reimplementing it; rotation atomicity is core's (`createApiClient` writes the rotated token before releasing the queue — unchanged); deviceId lives under a separate SecureStore key untouched by `logout()`; two-layer PHI logout (core `useLogout` clears store+queryClient; mobile adds `clearCache()` MMKV wipe).

## Independent verification results

| Command | Result |
|---|---|
| `pnpm install` | clean, single React 19.2.7 hoisted |
| `pnpm --filter core exec tsc -b` | EXIT 0 |
| `pnpm --filter mobile exec tsc --noEmit` | EXIT 0 |
| `npx expo-doctor` | 19/19 passed |
| `npx expo export` | EXIT 0, iOS 982 / Android 876 modules, zero unresolved-module errors — direct proof Metro resolves `core/hooks/auth/*` (MoreScreen/DevicesScreen import them) |
| `pnpm --filter web build` | EXIT 0, 1462 modules |
| `pnpm --filter web lint` | EXIT 0 |
| `pnpm -w build` | EXIT 0 (mobile has no build script, correctly skipped) |
| `git status` | clean; `git log main..` = docs + 3 PR commits |

## Scenario coverage (13)

7/13 proven headless (core-auth-additions-typecheck, web-build-unbroken, cold-start-no-token, platform-sent, deviceId-persists-logout, rotation-atomic, mmkv-key-from-securestore — via code trace + build). 6/13 **pending Human/EAS smoke** (login-happy, login-401, cold-start-silent-refresh, device-list, revoke-device, revoke-all-and-logout) — need a live API `:5080` + dev client; not fabricated.

## Findings

**CRITICAL**: None.

**WARNING** (4):
1. **Human/EAS smoke gap** — the security-sensitive auth round-trip is unverified end-to-end; mandatory before archive/next-feature-work.
2. `spec.md`'s `logout()` code snippet is stale vs the shipped `logout(deviceId)` signature — doc drift, functionally fine.
3. `state.yaml` was stale (still `phase: tasks`) at verify time — corrected by the orchestrator post-verify.
4. `expo export` Android module count varies run-to-run (876 vs an earlier 954; iOS stable at 982) — zero errors either way, not a regression signal.

**SUGGESTION** (3): `deviceName` typed `string|null` vs spec's `string?` (safe widening); `getDeviceId()` throw-mode relies on the bootstrap gate (fine today, note for future call sites); `expo-device` moved from "optional" to included (correct — used for deviceName).

## Documented deviations reviewed

All confirmed acceptable: useLogout `onSettled` superset (matches D8 two-layer PHI); `env` from the pre-existing `config/env.ts` seam; "Cerrar sesión" on MoreScreen (satisfies R11 — tab-scoped); `MoreStackNavigator` colocated in TabNavigator; PR3 ~362 lines (under the 400 budget).

## Recommendation

**PASS.** No CRITICAL issues. Recommend `sdd-archive` **only after** the mandatory Human/EAS smoke pass (real dev-client + local API `:5080`): login (happy + 401), cold-start silent refresh, device list/revoke/revoke-all/logout, and on-device encrypted-MMKV hydration with the new SecureStore key. This is the load-bearing verification gap for a security-sensitive auth rewrite; everything statically verifiable is green.
