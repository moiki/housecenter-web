# SDD Spec — Mobile Auth + Device-Bound Session

## Requirements

| # | Requirement |
|---|---|
| R1 | `packages/core/src/api/modules/auth.api.ts` MUST add `logout`, `getSessions`, `revokeSession`, `revokeAllSessions`. |
| R2 | `packages/core/src/types/auth.types.ts` MUST add `DeviceSessionResponse` + `LogoutRequest`, and MUST trim `RefreshRequest` to `{ refreshToken, deviceId }`. |
| R3 | `packages/core/src/hooks/auth/` MUST add `useLogout`, `useDeviceSessions`, `useRevokeSession`, `useRevokeAllSessions` behind an `authKeys` query-key factory; revoke/revoke-all/logout mutations MUST invalidate `authKeys.deviceSessions()` on success. |
| R4 | Mobile MUST supply an async `AuthStorage` over `expo-secure-store` to `createAuthStore`; refresh token MUST live in SecureStore, access token MUST stay in memory only. |
| R5 | DeviceId MUST persist in a SecureStore key separate from the refresh-token key (untouched by logout), created via `expo-crypto` `randomUUID()`; mobile MUST expose an async `initDeviceId()` (bootstrap) and a SYNC getter feeding `createApiClient`'s `deviceIdProvider: () => string`. |
| R6 | The MMKV cache instance MUST be lazy/promise-gated (no top-level `new MMKV`), sourcing `encryptionKey` from a generated key stored in SecureStore (not the static `'dev-cache-key'`); `persister.ts`'s adapter methods MUST await cache-readiness before each op. |
| R7 | `apps/mobile/src/bootstrap.ts` MUST call `setAuthStore` then `setApiClient` (SecureStore adapters + sync `deviceIdProvider` + `onRefreshFail` = nav-reset-to-Login) and MUST be imported first in `index.ts`, ahead of `App`. A bootstrap gate MUST block render until `deviceIdReady && authHydrated && (!needsSilentRefresh || refreshAttempted)`. |
| R8 | On cold start, if a refresh token exists in SecureStore, mobile MUST silently call `/auth/refresh` then `/auth/me` before rendering `Tabs`; the client MUST persist the rotated refresh token before releasing any queued requests (rotation-safe, single-use + ~30s grace). |
| R9 | `RootNavigator` MUST use React Navigation v7 conditional screens: render `Login` when `!user`, else `Tabs`. |
| R10 | The Login screen (Spanish) MUST call `login` → `setTokens` (before `/auth/me`) → `me` → `setAuth`; MUST send `platform` explicitly from `Platform.OS` (`ios→iOS`, `android→Android`) plus a `deviceName`; MUST map a `401` response to "Correo o contraseña incorrectos" without widening `ApiError`. |
| R11 | The "Más" tab MUST list `useDeviceSessions()`, highlight the row matching the local deviceId, support per-row revoke (`DELETE /auth/sessions/{id}`), "cerrar sesión" (logout: `POST /auth/logout {deviceId}` + clear auth store + `MMKV.clearAll()` + `queryClient.clear()`), and "cerrar todas" (revoke-all). |
| R12 | Push (register/deregister) MUST stay out of scope (deferred to #9); `apps/web` build MUST remain green after core auth changes (shared files). |

## Scenarios

#### Scenario: core-auth-additions-typecheck
Traces: R1, R2, R3
- GIVEN the four new core auth endpoints, DTOs, and hooks are added
- WHEN `pnpm --filter core exec tsc -b` runs
- THEN it exits 0 with no type errors

#### Scenario: web-build-unbroken
Traces: R1, R2, R12
- GIVEN `auth.types.ts`/`auth.api.ts` are modified (shared with web)
- WHEN `pnpm --filter web build` and `pnpm --filter web lint` run
- THEN both pass with no regressions from the `RefreshRequest` trim or new exports

#### Scenario: login-happy **(Human/EAS smoke)**
Traces: R10, R4
- GIVEN a running local API (`:5080`) and valid credentials
- WHEN the user submits the Login form
- THEN `setTokens` fires before `/auth/me`, `setAuth` completes, and `RootNavigator` switches to `Tabs`

#### Scenario: login-401 **(Human/EAS smoke)**
Traces: R10
- GIVEN a running local API and invalid credentials
- WHEN the user submits the Login form
- THEN the screen shows "Correo o contraseña incorrectos" and no navigation occurs

#### Scenario: cold-start-silent-refresh **(Human/EAS smoke)**
Traces: R7, R8
- GIVEN a SecureStore refresh token exists from a prior session
- WHEN the app cold-starts against a running local API
- THEN `/auth/refresh` then `/auth/me` resolve before first paint and the user lands on `Tabs` with no Login flash

#### Scenario: cold-start-no-token
Traces: R7, R9
- GIVEN no refresh token exists in SecureStore
- WHEN the app cold-starts
- THEN the bootstrap gate resolves (no infinite spinner) and `RootNavigator` renders `Login`

#### Scenario: platform-sent
Traces: R10
- GIVEN a login/signup/refresh request is built on iOS or Android
- WHEN the request payload is traced in code
- THEN `platform` is always present and equals `Platform.OS==='ios' ? 'iOS' : 'Android'`, never omitted

#### Scenario: deviceId-persists-logout
Traces: R5
- GIVEN a device has an established `(userId, deviceId)` session row
- WHEN the user logs out (refresh key cleared) and logs back in
- THEN the SecureStore deviceId key is unchanged and the same device-session row is reused, per code trace of `logout()`/`deviceId.ts`

#### Scenario: rotation-atomic
Traces: R8
- GIVEN `createApiClient`'s 401 refresh interceptor
- WHEN a refresh call resolves
- THEN `tokenStore.setTokens(...)` is called before `processQueue(...)` releases queued requests (verified by code trace of `createApiClient.ts`)

#### Scenario: device-list **(Human/EAS smoke)**
Traces: R11
- GIVEN two active sessions for the same user (running local API)
- WHEN the "Más" tab loads
- THEN both sessions render and the row matching the local deviceId is visually highlighted

#### Scenario: revoke-device **(Human/EAS smoke)**
Traces: R11
- GIVEN the device list is visible with a non-current session
- WHEN the user taps revoke on that row
- THEN `DELETE /auth/sessions/{id}` fires and `useDeviceSessions()` refetches without that row

#### Scenario: revoke-all-and-logout **(Human/EAS smoke)**
Traces: R11, R6
- GIVEN the user taps "cerrar sesión" or "cerrar todas"
- WHEN the action completes
- THEN the auth store, `MMKV.clearAll()`, and `queryClient.clear()` all run, and the app returns to `Login`

#### Scenario: mmkv-key-from-securestore
Traces: R6
- GIVEN `mmkv.ts` is refactored to lazy-init
- WHEN the cache instance is constructed (code trace, no top-level `new MMKV`)
- THEN `encryptionKey` resolves from a SecureStore-generated key, never the literal `'dev-cache-key'`

## Core auth additions

**`auth.types.ts`** — add:
```ts
export interface DeviceSessionResponse {
  id: string
  deviceId: string
  deviceName?: string
  platform: DevicePlatform
  lastUsedAt: string
  createdDate: string
}
export interface LogoutRequest { deviceId: string }
```
Trim `RefreshRequest` to exactly:
```ts
export interface RefreshRequest { refreshToken: string; deviceId: string }
```
(remove the phantom `deviceName?`/`platform?`.)

**`auth.api.ts`** — add (mirrors existing `authApi` shape, `getApiClient()` transport):
```ts
logout: (data: LogoutRequest) => getApiClient().post<void>('/auth/logout', data).then(r => r.data)
getSessions: () => getApiClient().get<DeviceSessionResponse[]>('/auth/sessions').then(r => r.data)
revokeSession: (id: string) => getApiClient().delete<void>(`/auth/sessions/${id}`).then(r => r.data)
revokeAllSessions: () => getApiClient().post<void>('/auth/sessions/revoke-all').then(r => r.data)
```

**`hooks/auth/`** — add, following the `patientKeys`/`useMe.ts` pattern:
```ts
export const authKeys = {
  all: ['auth'] as const,
  deviceSessions: () => [...authKeys.all, 'device-sessions'] as const,
}
useLogout()            // useMutation(authApi.logout)
useDeviceSessions()    // useQuery({ queryKey: authKeys.deviceSessions(), queryFn: authApi.getSessions })
useRevokeSession()     // useMutation(authApi.revokeSession) -> invalidate authKeys.deviceSessions()
useRevokeAllSessions() // useMutation(authApi.revokeAllSessions) -> invalidate authKeys.deviceSessions()
```
Names MUST NOT collide with existing AttentionSessions (`sessions.api.ts`, `SessionResponse`, `useSessions`).

## Mobile contracts

- **`authStorage.ts`**: `AuthStorage = { getItem, setItem, removeItem }` over `SecureStore.{getItemAsync,setItemAsync,deleteItemAsync}`, injected into `createAuthStore({ storage: authStorage })`.
- **`tokenStore.ts`**: `TokenStore` (matches core's interface) derived from the mobile auth store instance — `getAccessToken`, `getRefreshToken`, `setTokens`, `clear`.
- **`deviceId.ts`**: SecureStore key `hc_device_id` (separate from the refresh-token key, survives logout); `initDeviceId(): Promise<void>` reads-or-creates via `Crypto.randomUUID()` and caches in a module var; `getDeviceId(): string` is a sync getter reading that cache (throws if called before `initDeviceId()` resolves).
- **Bootstrap gate**: render children only when `deviceIdReady && authHydrated && (!needsSilentRefresh || refreshAttempted)`; mounted in `AppProviders.tsx` wrapping `RootNavigator`.
- **`RootNavigator`**: single `Stack.Navigator` with conditional `<Stack.Screen name="Login">` when `!user`, else `<Stack.Screen name="Tabs">`.
- **Login flow**: submit → `authApi.login({ email, password, deviceId: getDeviceId(), deviceName, platform })` → `authStore.setTokens(access, refresh)` → `authApi.me()` → `authStore.setAuth(user, access, refresh)`; on `status===401`, show fixed Spanish string, no `ApiError` widening.
- **Device-mgmt actions**: `useDeviceSessions()` list; highlight where `session.deviceId === getDeviceId()`; row revoke → `useRevokeSession().mutate(id)`; "cerrar sesión" → `useLogout().mutate({ deviceId: getDeviceId() })` then `authStore.logout()` + `cacheStorage.clearAll()` + `queryClient.clear()`; "cerrar todas" → `useRevokeAllSessions().mutate()`.
- **MMKV**: `mmkv.ts` exposes an async memoized `getCacheStorage(): Promise<MMKV>` (no top-level construction); `encryptionKey` sourced from a SecureStore key generated once via `Crypto.randomUUID()`; `persister.ts` adapter methods `await getCacheStorage()` before each `getItem/setItem/removeItem`.

## Verification rules

| Check | Command | Expected |
|---|---|---|
| Core typecheck | `pnpm --filter core exec tsc -b` | exits 0 |
| Web regression | `pnpm --filter web build && pnpm --filter web lint` | both pass |
| Mobile typecheck | `pnpm --filter mobile exec tsc --noEmit` | exits 0 |
| Expo config sanity | `npx expo-doctor` (in `apps/mobile`) | no failing checks |
| Mobile bundlable | `npx expo export` (in `apps/mobile`) | export succeeds |
| `RefreshRequest` trim | code trace of `auth.types.ts` | no `deviceName?`/`platform?` fields remain |
| Sync `deviceIdProvider` | code trace of `bootstrap.ts` wiring | returns `string`, never `Promise<string>` |
| Lazy MMKV | code trace of `mmkv.ts` | no top-level `new MMKV(...)`; only inside the async getter |
| Human/EAS smoke | manual dev-client run against local API `:5080` | login→refresh→revoke→logout round trip behaves per Scenarios marked **(Human/EAS smoke)** |
