# Tasks: Mobile Auth + Device-Bound Session

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines (hand-written; excludes `pnpm-lock.yaml`) | ~650–750 across all 3 PRs (PR1 ~100–120, PR2 ~300–370, PR3 ~220–280) |
| 400-line budget risk | High — PR2 alone lands close to the 400-line budget; doing this change as one PR would be 2x over |
| Chained PRs recommended | **Yes** |
| Suggested split | 3 PRs — one per phase below (matches `design.md`'s Build/PR sequence) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

**Basis:** sized against the web app's existing 1:1 analogs for the files PR2 mirrors —
`apps/web/src/store/auth.store.ts` = 12 lines, `apps/web/src/api/client.ts` = 24 lines,
`apps/web/src/components/guards/AuthBootstrap.tsx` = 62 lines, `apps/web/src/pages/auth/LoginPage.tsx`
= 106 lines. Mobile equivalents run a bit larger (RN `StyleSheet` objects instead of MUI `sx`, plus
the extra `deviceIdReady` conjunct in `AuthBootstrap`, plus a new `secureStore.ts`/`deviceId.ts` pair
web doesn't need), pushing PR2 (deps + 8 new/modified files: `secureStore.ts`, `deviceId.ts`,
`store/auth.store.ts`, `api/client.ts`, `bootstrap.ts`, `AuthBootstrap.tsx`, `RootNavigator.tsx`,
`LoginScreen.tsx`) to an estimated ~300–370 lines — close enough to the 400 budget that any scope
creep (e.g. richer form validation, extra styling) tips it over. PR1 is small (4 core-file additions,
no UI). PR3 is mid-sized (MMKV rewrite is surgical per `design.md`'s D4 sketch, but `DevicesScreen.tsx`
is a full list+actions screen). `design.md`'s own Build/PR sequence table already independently lands on
the same 3-way split (§"Build / PR sequence"), which corroborates rather than just assumes the split.
Combined with this being a security-sensitive auth rewrite whose highest-value scenarios (login,
cold-start silent refresh, revoke, logout) are **Human/EAS smokes only** — not verifiable headlessly in
`apply` — the review workload and the verification-confidence gap both argue for stopping before apply
to confirm the chain plan rather than assuming it.

## Notes (read before apply)

- **Naming resolution — `authKeys` vs `deviceSessionKeys`:** `spec.md` (R3 + the "Core auth additions"
  code block) names the query-key factory `authKeys` (`authKeys.all` / `authKeys.deviceSessions()`).
  `design.md`'s later code-sketch section instead shows `deviceSessionKeys` (`deviceSessionKeys.all` /
  `.list()`). These artifacts drifted. **This task list follows `spec.md`'s `authKeys` naming** (it is
  the requirement-defining artifact and matches this prompt's explicit instruction); `design.md`'s
  `deviceSessionKeys` sketch should be read as illustrative only. Flag to `sdd-apply`: use `authKeys`.
- **Screens layout adapts `design.md`'s flat sketch:** `design.md`'s target structure lists flat
  `screens/LoginScreen.tsx` / `screens/DevicesScreen.tsx`. This task list uses `screens/auth/LoginScreen.tsx`
  and `screens/more/{MoreScreen,DevicesScreen}.tsx` (feature-grouped subfolders — there is no existing
  `screens/` convention yet; `TabNavigator.tsx` currently inlines its placeholder screen) and adds a
  `MoreScreen.tsx` entry screen for the "Más" tab (not itemized in `design.md`) so the tab has a landing
  view distinct from the device-list sub-view. This is the target structure per this prompt, not a
  regression from `design.md` — both are additive/organizational, not behavioral.
- **Risk — Metro resolving core's new `hooks/auth/*` files:** confirm at `expo export` time in PR2/PR3
  that Metro resolves the new raw-TS subpath exports from `packages/core/src/hooks/auth/` the same way
  it already resolves the existing core hooks. If it doesn't, this is a build-breaking issue, not a
  cosmetic one — verify before merging PR2.
- **Risk — `Crypto.randomUUID()` as MMKV `encryptionKey`:** verify in PR3 that the UUID string's length/
  format is an accepted `encryptionKey` for `react-native-mmkv`'s native binding. No shipped install base
  exists yet, so if this needs adjusting there is no migration cost — but confirm before merging PR3.
- **Accepted-by-design — revoking the current device:** revoking the device you're currently using is
  allowed and intentionally *not* specially handled; it behaves as a remote logout on the next `401`
  (refresh then fails → `onRefreshFail`). Documented in `design.md` D8. Not a bug to fix in PR3.
- **PR1's files are shared with `apps/web`:** the web-build + web-lint regression gate is **mandatory**
  before merging PR1, not optional — `auth.types.ts`/`auth.api.ts` are consumed by both apps.
- **No test runner (`strict_tdd:false`):** all gates below are `tsc`/`expo-doctor`/`expo export`/
  `web build`/code-trace — fully automatable in `apply`. The scenarios marked **(Human/EAS smoke)** in
  `spec.md` (login-happy, login-401, cold-start-silent-refresh, device-list, revoke-device,
  revoke-all-and-logout) require a running local API (`:5080`) and a dev-client/EAS build — `apply`
  cannot execute these headlessly and MUST report them as "needs dev/CI env", not as passed/failed.

---

## Phase 1: Core auth session-management — PR1 (~100–120 lines)

- [ ] 1.1 `packages/core/src/types/auth.types.ts` — add `DeviceSessionResponse` (`id`, `deviceId`,
      `deviceName?`, `platform`, `lastUsedAt`, `createdDate`) and `LogoutRequest { deviceId }`; trim
      `RefreshRequest` to exactly `{ refreshToken: string; deviceId: string }` (drop the phantom
      `deviceName?`/`platform?` fields the backend record never had) (R2)
- [ ] 1.2 `packages/core/src/api/modules/auth.api.ts` — add `logout`, `getSessions`, `revokeSession`,
      `revokeAllSessions`, mirroring the existing `authApi` object shape and `getApiClient()` transport
      (R1)
- [ ] 1.3 `packages/core/src/hooks/auth/authKeys.ts` — `authKeys` query-key factory: `authKeys.all` +
      `authKeys.deviceSessions()` (R3)
- [ ] 1.4 `packages/core/src/hooks/auth/useDeviceSessions.ts` — `useDeviceSessions` query (`queryKey:
      authKeys.deviceSessions()`), `useRevokeSession`, `useRevokeAllSessions` mutations; both mutations
      invalidate `authKeys.deviceSessions()` on success (R3)
- [ ] 1.5 `packages/core/src/hooks/auth/useLogout.ts` — `useLogout` mutation over `authApi.logout`;
      invalidates `authKeys.deviceSessions()` (`onSettled`, so it runs even if the API call fails
      offline) (R3)
- [ ] 1.6 Code-trace check: confirm no name collisions with existing AttentionSessions
      (`sessions.api.ts`, `SessionResponse`, `useSessions`) — `DeviceSessionResponse`/`useDeviceSessions`/
      `authKeys` must not shadow or be shadowed by them (R1, R2, R3)

**PR1 done when:** `pnpm --filter core exec tsc -b` exits 0 · `pnpm --filter web build` AND
`pnpm --filter web lint` both pass with no regressions from the `RefreshRequest` trim or the new
exports (**mandatory** — these files are shared with `apps/web`) · `pnpm -w build` succeeds. All gates
automated; no Human/EAS smoke in this PR.

## Phase 2: Mobile auth wiring — PR2 (~300–370 lines)

- [ ] 2.1 `apps/mobile/package.json` — add `expo-secure-store`, `expo-crypto`, explicit `axios`
      (+ optional `expo-device` for `deviceName`); `pnpm install` (lockfile diff excluded from the
      review budget) (R4, R5, R10)
- [ ] 2.2 `apps/mobile/src/lib/secureStore.ts` — async `AuthStorage` adapter (`getItem`/`setItem`/
      `removeItem`) over `SecureStore.{getItemAsync,setItemAsync,deleteItemAsync}`, injected into
      `createAuthStore` (R4)
- [ ] 2.3 `apps/mobile/src/lib/deviceId.ts` — `initDeviceId(): Promise<void>` (read-or-create via
      `Crypto.randomUUID()` under SecureStore key `hc_device_id`, cached in a module var; key is
      **separate** from the refresh-token key so it survives logout), sync `getDeviceId(): string`
      (throws if called before `initDeviceId()` resolves), `whenDeviceIdReady()` (R5)
- [ ] 2.4 `apps/mobile/src/store/auth.store.ts` — `useAuthStore = createAuthStore({storage:
      secureStoreAuthStorage})` + `setAuthStore(useAuthStore)` (1:1 mirror of web's
      `store/auth.store.ts`) (R4, R7)
- [ ] 2.5 `apps/mobile/src/api/client.ts` — `tokenStore: TokenStore` derived from the mobile auth store
      instance (`getAccessToken`/`getRefreshToken`/`setTokens`/`clear`); `createApiClient({baseURL:
      EXPO_PUBLIC_API_URL, tokenStore, deviceIdProvider: getDeviceId, onRefreshFail})` + `setApiClient`
      (`onRefreshFail` = clear cache + `queryClient.clear()` — nav flip to Login is automatic via R9's
      conditional screens, no navigation ref needed) (R7, R8)
- [ ] 2.6 `apps/mobile/src/bootstrap.ts` — side-effect import order: `./store/auth.store` (runs
      `setAuthStore`) → `./api/client` (runs `setApiClient`) → call `initDeviceId()` (R7)
- [ ] 2.7 `apps/mobile/index.ts` — import `./src/bootstrap` **first**, before `App`, mirroring web's
      `main.tsx:1` (R7)
- [ ] 2.8 `apps/mobile/src/components/AuthBootstrap.tsx` — render gate: `ready = deviceIdReady &&
      authHydrated && (!needsSilentRefresh || refreshAttempted)`; on `needsSilentRefresh`, call
      `/auth/refresh` → `setTokens` → `/auth/me` → `setAuth`, `.catch(() => logout())`,
      `.finally(() => setRefreshAttempted(true))`; render `ActivityIndicator` while `!ready` (R7, R8)
- [ ] 2.9 `apps/mobile/src/providers/AppProviders.tsx` — mount `<AuthBootstrap>` wrapping
      `NavigationContainer`/`RootNavigator` (R7)
- [ ] 2.10 `apps/mobile/src/navigation/RootNavigator.tsx` — replace the unconditional `Tabs` screen
      with React Navigation v7 conditional screens: `<Stack.Screen name="Login">` when `user == null`,
      else `<Stack.Screen name="Tabs">`, reading `user` from `useAuthStore` (R9)
- [ ] 2.11 `apps/mobile/src/screens/auth/LoginScreen.tsx` — Spanish login form; `onSubmit`:
      `authApi.login({email, password, deviceId: getDeviceId(), platform, deviceName})` →
      `useAuthStore.getState().setTokens(...)` (**before** `/auth/me`) → `authApi.me()` →
      `useAuthStore.getState().setAuth(...)`; `platform` explicit from `Platform.OS`
      (`'ios' → 'iOS'`, else `'Android'`); on `isApiError(err) && err.status === 401` show
      "Correo o contraseña incorrectos" (no `ApiError` widening); other errors → generic message (R10)
- [ ] 2.12 `apps/mobile/src/i18n/locales/es.json` — add auth strings (`auth.invalidCredentials`, email/
      password labels, submit button, generic error) (R10)

**PR2 done when:** `pnpm --filter mobile exec tsc --noEmit` exits 0 · `npx expo-doctor` (in
`apps/mobile`) reports no failing checks · `npx expo export` succeeds (**verify Metro resolves core's
new `hooks/auth/*` here** — see Notes) · `pnpm --filter web build` stays green (dependency-bump
regression check). All of the above are automated. **Human/EAS smoke (needs dev/CI env — apply reports
"needs dev/CI env", not pass/fail):** `login-happy`, `login-401`, `cold-start-silent-refresh`,
`cold-start-no-token` scenarios against a running local API (`:5080`).

## Phase 3: Device-mgmt "Más" + MMKV migration — PR3 (~220–280 lines)

- [ ] 3.1 `apps/mobile/src/lib/mmkv.ts` — replace the eager top-level `new MMKV({encryptionKey:
      'dev-cache-key'})` with a memoized `getCacheStorage(): Promise<MMKV>` that resolves/creates the
      `encryptionKey` from SecureStore key `hc_cache_key` (via `Crypto.randomUUID()` if absent) before
      constructing the instance once; add a sync `clearCache()` (`instance?.clearAll()`) for the logout
      PHI wipe — kills the literal `TODO(#5)` (R6)
- [ ] 3.2 `apps/mobile/src/lib/persister.ts` — adapter methods (`getItem`/`setItem`/`removeItem`)
      `await getCacheStorage()` before each MMKV op; adapter shape unchanged (R6)
- [ ] 3.3 `apps/mobile/src/screens/more/MoreScreen.tsx` — "Más" tab landing/menu screen (entry point
      routed from `TabNavigator`, links into the device list) (R11)
- [ ] 3.4 `apps/mobile/src/screens/more/DevicesScreen.tsx` — `useDeviceSessions()` list; highlight the
      row where `session.deviceId === getDeviceId()`; per-row revoke → `useRevokeSession().mutate(id)`;
      "Cerrar sesión" → `useLogout().mutateAsync(getDeviceId())` then `clearCache()`
      (`MMKV.clearAll()`) + `queryClient.clear()` (core's `useLogout` already clears the auth store on
      `onSettled`); "Cerrar todas las sesiones" → `useRevokeAllSessions().mutate()` (R11)
- [ ] 3.5 `apps/mobile/src/navigation/TabNavigator.tsx` — add the "Más" tab, routing to
      `MoreScreen`/`DevicesScreen` (R11)
- [ ] 3.6 `apps/mobile/src/i18n/locales/es.json` — add device-mgmt strings ("Más", "Cerrar sesión",
      "Cerrar todas las sesiones", device-row labels, confirm-dialog copy) (R11)
- [ ] 3.7 Code-trace check: confirm no top-level `new MMKV(...)` remains anywhere in `mmkv.ts` (only
      inside the async getter) (R6)

**PR3 done when:** `pnpm --filter mobile exec tsc --noEmit` exits 0 · `npx expo-doctor` reports no
failing checks · `npx expo export` succeeds (**verify `Crypto.randomUUID()` is an accepted MMKV
`encryptionKey` — see Notes**). All of the above are automated. **Human/EAS smoke (needs dev/CI env):**
`device-list`, `revoke-device`, `revoke-all-and-logout` scenarios against a running local API (`:5080`)
— confirm the MMKV blob is gone after an app-kill post-logout, and that revoking the current device
correctly results in a self-logout on the next `401` (accepted-by-design, see Notes).

---

PR2 depends on PR1 (imports the new core hooks/api). PR3 depends on PR2 (reuses
`store/auth.store.ts`, `getDeviceId()`, and adds to the nav shell PR2 introduces). `apps/web` depends on
neither — it is regression-guarded only, in PR1.
