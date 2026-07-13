# Exploration — Mobile Auth + Device-Bound Session (Change #5)

## Summary

Change #5 wires `apps/mobile` up to the now-merged device-bound-sessions API and the mobile-app-foundation (#4) scaffold. The codebase is in exactly the state the master plan expects: core has login/signup/refresh with `deviceId` but is **missing the entire session-management surface** (logout, list/revoke sessions); `apps/mobile` has zero auth wiring today (`AppProviders.tsx` never calls `setApiClient`/`setAuthStore`); and `mmkv.ts` still has the literal `TODO(#5)` for the encryption-key migration. Two real sync/async contract mismatches surfaced (deviceId provider, MMKV singleton construction) that must be designed around. Also a naming-collision risk (`sessions.api.ts`/`useSessions` already means "AttentionSessions") and a pre-existing web signup bug (out of scope, flagged).

**Confidence: Medium-High.** High on the API contract, core's gaps, and the web reference pattern (all read directly, file:line below). Medium on two apply-time specifics: (a) `react-native-mmkv@^3.3.3`'s behavior opening an existing on-disk file with a mismatched `encryptionKey` (moot — no shipped install base), (b) exact `encryptionKey` format constraints.

## Confirmed

1. **API auth contract** (`HouseCenter.Api/Features/Auth/{AuthDtos,AuthEndpoints,AuthService,UserSessionService,AuthValidators}.cs`):
   - `LoginRequest(Email, Password, DeviceId, DeviceName?, Platform)`, `SignupRequest(..., DeviceId, DeviceName?, Platform)` — `DeviceId` `NotEmpty()`-required; `Platform` a **non-nullable** `DevicePlatform` enum, only `IsInEnum()`-validated (AuthValidators.cs:13,42).
   - `RefreshRequest(RefreshToken, DeviceId)` — **only two fields** (AuthDtos.cs:12).
   - `TokenPairResponse(AccessToken, RefreshToken)` (AuthDtos.cs:14).
   - Session mgmt, all `RequireAuthorization()`, self-scoped via `ClaimTypes.NameIdentifier` (AuthEndpoints.cs:54-92):
     - `POST /auth/logout {deviceId}` → 204, idempotent no-op if no active session.
     - `GET /auth/sessions` → 200, **plain array** of `SessionResponse(Id, DeviceId, DeviceName?, Platform, LastUsedAt, CreatedDate)` — excludes token hashes (AuthDtos.cs:49-55).
     - `DELETE /auth/sessions/{id}` → 204, or 404 (never 403 — anti-enumeration) for foreign/nonexistent id.
     - `POST /auth/sessions/revoke-all` → 204, unconditional.
   - Rotation (`UserSessionService.RotateAsync` 105-166): **single-use**, matches Current or (within a **30s grace window**, appsettings.json:40) the immediately-previous hash; else revoked as reuse. Sliding 60d / absolute 180d TTL. **Client MUST persist the newly-rotated refresh token atomically before releasing queued requests** — a stale/duplicate refresh after the grace window kills the session.
   - `DevicePlatform (Android, iOS, Web)` matches core's TS enum exactly — no drift.

2. **Core's auth surface is missing session management.** `packages/core/src/api/modules/auth.api.ts:12-29` exports only login/refresh/me/signup/requestPasswordReset/resetPassword — no logout/getSessions/revokeSession/revokeAllSessions; `types/auth.types.ts` has no DTOs for them. **#5 must add these to core** (api + types + hooks).

3. **`createApiClient` already implements the hard part.** `createApiClient.ts:37-82`: request interceptor attaches Bearer from `tokenStore.getAccessToken()`; 401 interceptor single-flight refresh (`isRefreshing`+`pendingQueue`), and on success calls `tokenStore.setTokens(accessToken, refreshToken)` **before** releasing the queue (line 60) — writes the rotated refresh token atomically, satisfying single-use rotation. On failure clears store + `onRefreshFail()`. Only the 3 injected seams (`tokenStore`, `deviceIdProvider`, `onRefreshFail`) are platform-specific.

4. **`createAuthStore` already supports async hydration.** `createAuthStore.ts:29-44`: if `storage.getItem` returns a Promise (SecureStore), `authHydrated:false` initially then resolves via `.then`; if sync (localStorage), `authHydrated:true` immediately. Tri-state contract already documented in `AuthBootstrap.tsx:15-20`. Mobile just supplies an async `AuthStorage`.

5. **Web reference flow to reproduce 1:1 in RN**: `api/client.ts` (TokenStore from `useAuthStore.getState()`, `createApiClient` with localStorage deviceIdProvider + `onRefreshFail: window.location='/login'`); `store/auth.store.ts` (`createAuthStore({storage: localStorageAdapter})`); `components/guards/AuthBootstrap.tsx` (silent refresh gated on `authHydrated`); `pages/auth/LoginPage.tsx` (`login` → `setTokens` before `/auth/me` → `me` → `setAuth`); `lib/deviceId.ts` (`crypto.randomUUID()` in localStorage, sync); `bootstrap.ts` (side-effect module — auth store then api client — imported first in `main.tsx:1`).

6. **`apps/mobile` has zero auth wiring.** `AppProviders.tsx` only SafeArea→PersistQueryClient→I18next→NavigationContainer; no `setApiClient`/`setAuthStore`. `RootNavigator.tsx:9-13` renders one `Stack.Screen name="Tabs"` unconditionally (comment: "public/authenticated split lands with auth (#5)"). `TabNavigator.tsx` one placeholder Home tab. `lib/mmkv.ts:1-8` literal `TODO(#5): source encryptionKey from expo-secure-store`, current `'dev-cache-key'`.

7. **`apps/mobile/package.json` missing packages #5 needs**: no `expo-secure-store`, no `expo-crypto` (for sync `Crypto.randomUUID()`, valid SDK 55); `axios` not listed (transitive via core, but web+core list it explicitly — mobile should too).

8. **Push endpoint shape**: `POST /notifications/push-subscriptions {token, platform}` upserts by token; `DELETE /notifications/push-subscriptions/{token}` keyed by the **token value** (not deviceId), idempotent, caller-scoped.

## Discrepancies / corrections

- **Naming collision (must avoid):** `core`'s `api/modules/sessions.api.ts`, `types/session.types.ts`, `hooks/patients/useSessions.ts` already mean **AttentionSessions** (patient care visits). The device/auth "sessions" #5 adds MUST NOT reuse `sessions.api.ts`/`SessionResponse`/`useSessions` — use `DeviceSessionResponse` + `useDeviceSessions`/`useRevokeSession`/`useRevokeAllSessions`/`useLogout`, added to the **existing** `auth.api.ts`/`auth.types.ts`/`hooks/auth/` (all four endpoints live under the `/auth` route group).
- **`RefreshRequest` TS type has 2 phantom fields.** `auth.types.ts:13-18` declares `deviceName?`/`platform?`; backend `RefreshRequest` (AuthDtos.cs:12) has only `RefreshToken`/`DeviceId`. Harmless (client already sends only 2) but trim to match.
- **Silent `Platform` default is a trap.** Non-nullable + only `IsInEnum()` → omitting `Platform` binds to default `Android (=0)`, no 400. Every mobile login/signup/refresh MUST set `platform` from RN `Platform.OS` (`ios→iOS`, `android→Android`), or iOS devices mislabel as Android in the device list.
- **Pre-existing web signup bug** (`apps/web/src/pages/auth/SignupPage.tsx:53-60`): sends `token` where backend wants `InvitationToken`, and never sends the required `address` (`AuthValidators.cs:35`). Likely breaks signup in prod. **Out of scope for #5** (mobile has no signup — Members are invited via web) — flag as a separate bug ticket.
- **Master plan's #5 "ciclo push" needs correction** (plan line 167 + logout desc line 94). Not cleanly separable — see Recommendation (defer all push to #9), same as #4's "SDK 52+"→"SDK 55" correction.

## Additional considerations for the proposal

- **Two sync/async mismatches to design around:**
  1. `deviceIdProvider: () => string` (createApiClient.ts:8) is **sync by contract**, but SecureStore is async. Need an async `initDeviceId()` at bootstrap (read-or-create UUID via expo-secure-store + `Crypto.randomUUID()`, cache in a module var), then a **sync** getter reading the cached value — never `() => SecureStore.getItemAsync(...)` (would stringify a Promise).
  2. `mmkv.ts` `cacheStorage` is a **sync top-level `new MMKV(...)`** (line 5), but the new `encryptionKey` comes from async SecureStore. Need a lazy/memoized getter (mirror the `getApiClient()`/`getAuthStore()` registry pattern), not eager top-level construction. Surgical fix: keep `persister.ts`'s adapter shape, make its `getItem/setItem/removeItem` await an internal "cache ready" promise (`createAsyncStoragePersister`'s adapter is already async-native).
  - Both share one bootstrap gate — a mobile `AuthBootstrap`-equivalent blocking render on `deviceIdReady && authHydrated && (!needsSilentRefresh || refreshAttempted)`.
- **DeviceId must survive logout; refresh token must not.** `createAuthStore.logout()` clears only the refresh key. Store deviceId under a **separate** SecureStore key, untouched by logout, so re-login upserts the same `(UserId, DeviceId)` row.
- **PHI hygiene on logout is two-layer.** Core's `useLogout` can `queryClient.clear()`, but core can't reach mobile's MMKV. Mobile's logout call site must also wipe MMKV cache explicitly (`clearAll()`) — `queryClient.clear()` alone leaves the on-disk persisted blob if the app is killed right after.
- **Bootstrap import order**: new `apps/mobile/src/bootstrap.ts` (auth store then api client), imported first in `apps/mobile/index.ts` ahead of `import App` (mirrors `main.tsx:1`).
- **Navigation** — React Navigation v7 **conditional-screens** pattern (not manual `navigation.reset()`): single `Stack.Navigator`, render `<Stack.Screen name="Login">` when `!user` else `name="Tabs"`, gated behind the bootstrap "ready" state.
- **Device-management UI** — add a minimal second "Más" tab now (list `useDeviceSessions()`, highlight current device by matching local deviceId, per-row revoke, "cerrar sesión"/"cerrar todas") — plan's nav sketch already earmarks "Más". Add Spanish strings to `es.json`.
- **Push-scope boundary — recommend deferring ALL push (register + deregister) to #9**, keeping #5 pure auth/session/device-mgmt. `DELETE /notifications/push-subscriptions/{token}` is keyed by the FCM token, obtainable only by standing up the full expo-notifications stack (permissions, config plugin, EAS push creds — none exist today). No lightweight "just deregister on logout" version exists. Correct the plan's #5 line.
- **Error i18n** — API `ProblemDetails.title` carries the code (e.g. `auth.invalid_credentials`) but core's `ApiError` drops `title`. Login has one 401 failure mode → map `status===401` to a fixed Spanish string ("Correo o contraseña incorrectos"); don't widen `ApiError` for this alone.
- **Optional (MAY):** `expo-device`'s `Device.modelName` (no permission) as default `deviceName`.
- **Suggested PR shape** (rules.tasks: separate core/web/mobile; ≤400 lines; plan estimates 3 PRs): PR1 = core additions (`auth.types.ts`/`auth.api.ts`/`hooks/auth/*`) + web regression check (shared files). PR2 = mobile SecureStore adapters (tokenStore, authStorage, deviceId) + apiClient/authStore wiring + bootstrap + Login screen + nav switch. PR3 = device-mgmt "Más" screen + MMKV key migration (lazy-init fix). Input for sdd-tasks.

## Recommendation

1. Add session-mgmt to core's **existing** `auth.types.ts`/`auth.api.ts` (disambiguated: `DeviceSessionResponse`, `LogoutRequest`) + `hooks/auth/{useLogout,useDeviceSessions,useRevokeSession,useRevokeAllSessions}.ts`. Do NOT create a `sessions.api.ts` sibling or reuse `SessionResponse`/`useSessions`.
2. Build mobile `TokenStore`/`AuthStorage` over `expo-secure-store`, and a deviceId provider over `expo-secure-store` + `expo-crypto` `randomUUID()` — "hydrate-once-async, then read-sync-from-memory", extending the bootstrap gate with deviceId-readiness.
3. Fix MMKV singleton to lazy/promise-gated before wiring the SecureStore-sourced key — required architectural change, not a drop-in swap.
4. Reproduce web's `bootstrap.ts`→`index.ts` import order and `AuthBootstrap`/conditional-render for the Login↔Tabs switch in `RootNavigator`.
5. Defer all push to #9; #5 stays auth/session/device-mgmt only.
6. Verify: `pnpm --filter core exec tsc -b`, `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, `npx expo export`, `pnpm --filter web build` (regression — core auth files are shared with web). A real login→refresh→logout→revoke round-trip against a running local API (port 5080) is a human/EAS-dev-client smoke step.

**Ready for Proposal: Yes.** Three decisions to ratify: (a) push deferred entirely to #9, (b) core's auth module gains the 4 session-mgmt endpoints under existing `auth.*` with disambiguated names, (c) the two sync/async fixes (deviceId provider, MMKV lazy-init) are in-scope architectural work for #5.
