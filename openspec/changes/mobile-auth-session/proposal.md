# SDD Proposal — Mobile Auth + Device-Bound Session

## Change name
`mobile-auth-session`

## Status
`proposed` (2026-07-13)

---

## Problem

`apps/mobile` (scaffolded in #4) has **zero auth wiring**: `AppProviders.tsx` never calls
`setApiClient`/`setAuthStore`, `RootNavigator` renders `Tabs` unconditionally, and `mmkv.ts`
still carries the literal `TODO(#5)` with a `'dev-cache-key'` placeholder. Meanwhile the
device-bound-sessions API is merged and `packages/core` has login/signup/refresh (all taking
`deviceId`) but is **missing the entire session-management surface** — no logout, no
list/revoke sessions. Every downstream change (#6+ patient/progress screens) depends on a real
authenticated mobile session. This change wires mobile to the merged API by reproducing the
proven web auth flow through React Native's async storage seams, and adds the missing
session-management endpoints to core so both platforms can manage devices.

## Proposed change

1. **Extend core's existing `auth.*`** with the four session-management endpoints (logout,
   list/revoke/revoke-all) — types, api calls, and TanStack Query hooks — disambiguated from
   the pre-existing AttentionSessions "sessions".
2. **Wire mobile auth** by injecting `expo-secure-store`-backed adapters into core's
   `createAuthStore`/`createApiClient`, resolving the two real sync/async contract mismatches
   (deviceId provider, MMKV singleton), adding a bootstrap gate, a Spanish Login screen, and the
   React Navigation v7 conditional Login↔Tabs switch.
3. **Add a device-management "Más" tab** listing active sessions with per-row revoke, logout, and
   revoke-all, plus PHI-safe cache wiping on logout.

Push (register + deregister) is deferred **entirely** to #9 — see Open Question 1.

## Core additions

Extend the **existing** `packages/core` auth module (do NOT create a `sessions.api.ts` sibling —
that name means AttentionSessions):

- `types/auth.types.ts`: add `DeviceSessionResponse(Id, DeviceId, DeviceName?, Platform,
  LastUsedAt, CreatedDate)` and `LogoutRequest{ deviceId }`; **trim** the phantom
  `deviceName?`/`platform?` off `RefreshRequest` to match the real backend contract
  (`RefreshRequest` is `RefreshToken` + `DeviceId` only).
- `api/modules/auth.api.ts`: add `logout(deviceId)` (`POST /auth/logout`), `getSessions()`
  (`GET /auth/sessions` → plain array), `revokeSession(id)` (`DELETE /auth/sessions/{id}`),
  `revokeAllSessions()` (`POST /auth/sessions/revoke-all`).
- `hooks/auth/`: add `useLogout`, `useDeviceSessions`, `useRevokeSession`,
  `useRevokeAllSessions` — with a query-key factory; revoke/revoke-all/logout invalidate the
  device-sessions list.

These files are **shared with `apps/web`**, so PR1 must keep the web build green.

## Mobile wiring

- **SecureStore adapters**: an async `AuthStorage` (getItem/setItem/removeItem over
  `expo-secure-store`) injected into `createAuthStore`; a `TokenStore` derived from the mobile
  auth store; a **deviceId provider** over `expo-secure-store` + `expo-crypto`
  `Crypto.randomUUID()` under a **separate** SecureStore key (survives logout).
- **Sync/async fixes** (in-scope architecture, not polish):
  - **deviceId** — async `initDeviceId()` at bootstrap (read-or-create, cache in a module var) +
    a **sync** getter feeding `createApiClient`'s `deviceIdProvider: () => string` (never
    `() => SecureStore.getItemAsync(...)`, which stringifies a Promise).
  - **MMKV** — make `mmkv.ts`'s instance **lazy/promise-gated** (not top-level `new MMKV`),
    sourcing `encryptionKey` from a generated, SecureStore-stored key; keep `persister.ts`'s
    adapter shape but have its methods await a "cache ready" promise.
- **Bootstrap + nav**: `apps/mobile/src/bootstrap.ts` (`setAuthStore` then `setApiClient` with the
  SecureStore adapters + sync `deviceIdProvider` + `onRefreshFail` = navigation-reset-to-Login),
  imported first in `apps/mobile/index.ts` ahead of `App`. A mobile `AuthBootstrap`-equivalent
  gate blocks render on `deviceIdReady && authHydrated && (!needsSilentRefresh ||
  refreshAttempted)`. `RootNavigator` uses React Navigation v7 **conditional screens**
  (`Login` when `!user`, else `Tabs`).
- **Login screen (Spanish)**: `login` → `setTokens` (before `/auth/me`) → `me` → `setAuth`; send
  `platform` explicitly from `Platform.OS` (`ios→iOS`, `android→Android`) + a `deviceName`;
  map `status===401` → "Correo o contraseña incorrectos" (don't widen `ApiError`).
- **Device-management "Más" tab**: `useDeviceSessions()` list, current device highlighted (match
  local deviceId), per-row revoke, "cerrar sesión" (logout), "cerrar todas" (revoke-all); add
  `es.json` strings.
- **MMKV key migration**: replace `'dev-cache-key'` with the SecureStore-sourced key.

## Scope

- Core: 4 session-mgmt endpoints + DTOs + hooks in existing `auth.*`; `RefreshRequest` trim.
- Mobile: SecureStore `AuthStorage`/`TokenStore`, async-init + sync deviceId provider,
  `bootstrap.ts`, apiClient/authStore wiring, `AuthBootstrap` gate, Spanish Login screen,
  `RootNavigator` conditional switch.
- Mobile: device-management "Más" screen (list/revoke/logout/revoke-all) + `es.json` strings.
- Mobile: lazy/promise-gated MMKV + SecureStore-sourced `encryptionKey`.
- Deps: `expo-secure-store`, `expo-crypto`, explicit `axios` (+ optional `expo-device`).
- PHI hygiene on logout: `MMKV.clearAll()` + `queryClient.clear()` alongside store clear.

## Out of scope

| Deferred to | What |
|---|---|
| #9 mobile-notifications-push | **All** push — register AND deregister (needs the full expo-notifications/FCM/EAS-creds stack #9 builds; no lightweight deregister-only version exists) |
| #6+ screens | Any real feature screen beyond Login and the device-mgmt "Más" tab |
| separate bug ticket | Web signup bug (`SignupPage` sends `token` not `invitationToken`, missing required `address`) — flagged, not fixed here (mobile has no signup) |

## Open questions (positions taken)

| # | Question | Position |
|---|---|---|
| 1 | Push scope | **DEFER ALL push (register + deregister) to #9.** Not separable — `DELETE /notifications/push-subscriptions/{token}` is keyed by the FCM token, obtainable only by standing up the full expo-notifications stack (permissions, config plugin, EAS push creds — none exist). #5 stays pure auth/session/device-mgmt. **Correct the master plan's #5 "ciclo push" line** (plan line 167 + logout desc line 94). |
| 2 | Core auth extension | Add the 4 session-mgmt endpoints to core's **existing** `auth.*` with **disambiguated** names (`DeviceSessionResponse`, `useDeviceSessions`/`useRevokeSession`/`useRevokeAllSessions`/`useLogout`) — NOT `SessionResponse`/`useSessions`/`sessions.api.ts` (already mean AttentionSessions). All four live under the `/auth` route group. |
| 3 | Sync/async fixes | deviceId (async-init + **sync** getter) and MMKV (**lazy-init** + SecureStore key) are **in-scope architectural work**, not polish. Both are hard contract mismatches: `deviceIdProvider` is sync-by-contract vs async SecureStore; MMKV is a sync top-level `new MMKV` vs an async-sourced key. |
| 4 | Platform value | **Always send `platform` explicitly** from `Platform.OS`. The backend `Platform` field is non-nullable + only `IsInEnum()`-validated → omitting it silently binds to `Android (=0)` with no 400, mislabeling iOS devices in the session list. |
| 5 | Web signup bug | **OUT OF SCOPE.** Flag as a separate bug ticket; do not fix here (mobile has no signup — Members are invited via web). |
| 6 | `deviceName` default | **MAY** use `expo-device` `Device.modelName` (no permission required) as the default `deviceName`; optional. |

## Affected files / packages

| Area | Impact | Notes |
|---|---|---|
| `packages/core/src/types/auth.types.ts` | Modified | `+ DeviceSessionResponse`, `+ LogoutRequest`; trim `RefreshRequest`. Shared with web. |
| `packages/core/src/api/modules/auth.api.ts` | Modified | `+ logout / getSessions / revokeSession / revokeAllSessions`. Shared with web. |
| `packages/core/src/hooks/auth/*` | New | `+ useLogout / useDeviceSessions / useRevokeSession / useRevokeAllSessions` + key factory. |
| `apps/mobile/src/lib/mmkv.ts` | Modified | Lazy/promise-gated instance; SecureStore-sourced `encryptionKey` (resolves `TODO(#5)`). |
| `apps/mobile/src/lib/persister.ts` | Modified | Adapter awaits "cache ready" promise (shape unchanged). |
| `apps/mobile/src/lib/{tokenStore,authStorage,deviceId}.ts` | New | SecureStore `AuthStorage`/`TokenStore`; async `initDeviceId()` + sync getter. |
| `apps/mobile/src/bootstrap.ts` | New | `setAuthStore` then `setApiClient` (adapters + `deviceIdProvider` + `onRefreshFail`). |
| `apps/mobile/index.ts` | Modified | Import `./src/bootstrap` first, before `App`. |
| `apps/mobile/src/providers/AppProviders.tsx` | Modified | Mount the `AuthBootstrap` gate. |
| `apps/mobile/src/components/AuthBootstrap.tsx` | New | Render gate on deviceId/hydration/silent-refresh readiness. |
| `apps/mobile/src/navigation/RootNavigator.tsx` | Modified | v7 conditional `Login` vs `Tabs`. |
| `apps/mobile/src/screens/{LoginScreen,DevicesScreen}.tsx` | New | Spanish Login; device-mgmt "Más" tab. |
| `apps/mobile/src/navigation/TabNavigator.tsx` | Modified | Add "Más" tab. |
| `apps/mobile/src/i18n/locales/es.json` | Modified | Auth + device-mgmt strings. |
| `apps/mobile/package.json` | Modified | `+ expo-secure-store, expo-crypto, axios` (+ optional `expo-device`). |
| root `pnpm-lock.yaml` | Modified | New deps resolved (excluded from review budget). |
| `apps/web` | Untouched | Regression-guarded (`pnpm --filter web build`) — core auth files are shared. |

## Delivery plan (chained PRs)

Three ordered, independently-reviewable slices (≤400 changed lines each; lockfile excluded).
No test runner (`strict_tdd:false`) — each PR is gated by typecheck / `expo-doctor` /
`expo export` / web build. `sdd-tasks` finalizes the exact split.

| PR | Scope | Verification (gates) |
|---|---|---|
| **PR1 — Core auth session-mgmt** | `auth.types.ts` (`+ DeviceSessionResponse` / `LogoutRequest`, `RefreshRequest` trim), `auth.api.ts` (4 endpoints), `hooks/auth/*` (4 hooks + key factory) | `pnpm --filter core exec tsc -b`; **`pnpm --filter web build` + lint** (shared-file regression guard) |
| **PR2 — Mobile auth wiring** | SecureStore `tokenStore`/`authStorage` + deviceId async-init/sync-getter + `bootstrap.ts` + `index.ts` order + apiClient/authStore wiring + `AuthBootstrap` gate + Spanish Login screen + `RootNavigator` conditional switch + deps added | `pnpm --filter mobile exec tsc --noEmit`; `npx expo-doctor`; `npx expo export`; login→refresh round-trip against local API :5080 (dev-client smoke) |
| **PR3 — Device-mgmt "Más" screen + MMKV key migration** | `useDeviceSessions` UI (list/highlight-current/revoke), logout + revoke-all actions, PHI cache clear (`clearAll()` + `queryClient.clear()`), lazy MMKV + SecureStore `encryptionKey`, `es.json` | `tsc --noEmit`; `expo export`; logout→revoke round-trip smoke against local API :5080 |

## Rollback plan

Mobile changes are **purely additive** (new files + wiring in a package that has no auth today).
Core additions are **backward-compatible**: four new functions, two new types, four new hooks, and
a single `RefreshRequest` field trim (the client already sends only the two remaining fields, so
the trim is inert at runtime). No migrations, no data, no persisted-schema change (MMKV holds a
disposable READ cache — a mismatched `encryptionKey` on an existing on-disk file is moot since
there is no shipped install base). Rollback = **revert the branch**; `pnpm install` regenerates the
lockfile. If only the core additions are problematic, PR1 can be reverted independently — mobile
PRs depend on it but web does not.
