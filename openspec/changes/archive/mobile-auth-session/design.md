# SDD Design — Mobile Auth + Device-Bound Session

## Change name
`mobile-auth-session`

## Status
`design` (2026-07-13)

---

## Technical approach

Wire `apps/mobile` to the merged device-bound-sessions API by **reproducing web's proven auth
flow 1:1** through React Native's async-storage seams, and extend core's **existing** `auth.*`
module with the four session-management endpoints. Core already owns the hard parts — the
`createApiClient` 401 single-flight refresh queue (writes the rotated token *before* releasing the
queue, `createApiClient.ts:60`) and `createAuthStore`'s async-hydrate tri-state (`authHydrated`).
Mobile only injects the three platform seams (`tokenStore`, async `deviceIdProvider`→sync,
`onRefreshFail`) plus a SecureStore `AuthStorage`, and resolves two hard **sync/async contract
mismatches** (deviceId provider, MMKV singleton) behind a bootstrap render-gate. No core queue or
hydration logic is touched.

---

## Target structure

```
packages/core/src/                                   (SHARED with apps/web — keep web build green)
├── types/auth.types.ts               MODIFIED  + DeviceSessionResponse, + LogoutRequest;
│                                                trim RefreshRequest to {refreshToken, deviceId}
├── api/modules/auth.api.ts           MODIFIED  + logout / getSessions / revokeSession / revokeAllSessions
└── hooks/auth/
    ├── useDeviceSessions.ts          NEW       deviceSessionKeys + useDeviceSessions
    │                                           + useRevokeSession + useRevokeAllSessions
    └── useLogout.ts                   NEW       revoke device + clear local session/cache

apps/mobile/
├── index.ts                          MODIFIED  import './src/bootstrap' FIRST, before App
├── package.json                      MODIFIED  + expo-secure-store, expo-crypto, axios (+ expo-device?)
└── src/
    ├── bootstrap.ts                   NEW       side-effect wiring: auth.store → api/client → initDeviceId()
    ├── store/auth.store.ts            NEW       createAuthStore({storage: SecureStore}) + setAuthStore  (mirror web)
    ├── api/client.ts                  NEW       tokenStore + createApiClient + setApiClient  (mirror web)
    ├── lib/
    │   ├── secureStore.ts             NEW       async AuthStorage adapter over expo-secure-store
    │   ├── deviceId.ts                NEW       initDeviceId() (async) + getDeviceId() (sync) + whenDeviceIdReady()
    │   ├── mmkv.ts                     MODIFIED  lazy/promise-gated MMKV; encryptionKey from SecureStore (kills TODO(#5))
    │   └── persister.ts               MODIFIED  adapter methods await getCacheStorage() (shape unchanged)
    ├── components/AuthBootstrap.tsx    NEW       render gate: deviceIdReady && authHydrated && silent-refresh
    ├── providers/AppProviders.tsx      MODIFIED  mount <AuthBootstrap> around {children}
    ├── navigation/RootNavigator.tsx    MODIFIED  v7 conditional screens: Login (user==null) | Tabs
    ├── navigation/TabNavigator.tsx     MODIFIED  add "Más" tab
    ├── screens/LoginScreen.tsx         NEW       Spanish login; platform from Platform.OS; 401 map
    ├── screens/DevicesScreen.tsx       NEW       device-mgmt "Más": list/highlight-current/revoke/logout/revoke-all
    └── i18n/locales/es.json            MODIFIED  auth + device-mgmt strings
```

**Note on layout vs proposal:** the store/client wiring lives in `store/auth.store.ts` + `api/client.ts`
(a 1:1 mirror of web) rather than under `lib/`, because the stated goal is to reproduce web's
`bootstrap → main` flow verbatim and screens need a `useAuthStore` import surface. The SecureStore
`AuthStorage` and deviceId helpers stay in `lib/` per the proposal.

---

## Architecture decisions

### D1 — Core session-mgmt added to the EXISTING `auth.*` (disambiguated) + RefreshRequest trim
**Choice.** Add the four endpoints to core's existing `auth.api.ts` (all live under the `/auth`
route group), two DTOs to `auth.types.ts`, and hooks under `hooks/auth/` with a **query-key
factory**. Names are **`DeviceSessionResponse` / `useDeviceSessions` / `useRevokeSession` /
`useRevokeAllSessions` / `useLogout`**. Trim `RefreshRequest` to `{refreshToken, deviceId}`.
**Alternatives.** A new `sessions.api.ts` / `SessionResponse` / `useSessions` sibling — **rejected**:
those names already mean **AttentionSessions** (patient care visits) in core; reuse would collide.
**Rationale.** The endpoints are auth-scoped (`RequireAuthorization`, self-scoped by
`ClaimTypes.NameIdentifier`), so they belong in `auth.*`. The C# DTO is `SessionResponse`, but the TS
mirror is renamed `DeviceSessionResponse` purely to disambiguate. The `RefreshRequest` trim drops two
phantom fields (`deviceName?`/`platform?`) the backend record (`AuthDtos.cs:12`) never had — inert at
runtime (both callers already send only the two remaining fields), so it is a pure type-safety fix.
These files are shared with web, so **PR1 must keep the web build green**.

### D2 — SecureStore `AuthStorage` (async) + `TokenStore` derived from the store
**Choice.** `lib/secureStore.ts` provides an async `AuthStorage` over `expo-secure-store`
(`getItemAsync`/`setItemAsync`/`deleteItemAsync`) injected into `createAuthStore`. The **sync**
`TokenStore` the axios interceptor needs is derived from the in-memory Zustand state (identical to
web's `api/client.ts`), never read from SecureStore per-request.
**Alternatives.** Reading SecureStore on every request — **rejected**: `deviceIdProvider`/token reads
are sync-by-contract; awaiting SecureStore per request is impossible and slow.
**Rationale.** `createAuthStore` (`createAuthStore.ts:30-34`) already branches: because
`SecureStore.getItemAsync` returns a **Promise**, `authHydrated` starts `false` and flips `true` when
the refresh key resolves. Once hydrated, `refreshToken` lives in memory, so the interceptor's
per-request read stays sync on both platforms — exactly the split D4 of core-extraction designed for.

### D3 — deviceId: async-init at bootstrap + **sync** getter; separate key that survives logout
**Choice.** `lib/deviceId.ts` exposes `initDeviceId()` (read-or-create a `Crypto.randomUUID()` under
SecureStore key `hc_device_id`, cache in a module var) and a **sync** `getDeviceId()` feeding
`createApiClient`'s `deviceIdProvider: () => string`. bootstrap kicks off `initDeviceId()`;
`whenDeviceIdReady()` gates render.
**Alternatives.** `deviceIdProvider: () => SecureStore.getItemAsync(KEY)` — **rejected**: returns a
Promise, which stringifies to `"[object Promise]"` in the refresh body and breaks the device binding.
**Rationale.** The provider contract is sync; SecureStore is async. "Hydrate-once-async, then
read-sync-from-memory" is the only reconciliation. The key is **separate from `hc_rt`** and untouched
by `createAuthStore.logout()` (which clears only `hc_rt`), so after logout + re-login the same
`(UserId, DeviceId)` row is upserted rather than orphaning sessions. `Crypto.randomUUID()` is sync and
valid in Expo SDK 55.

### D4 — MMKV lazy/promise-gated singleton + SecureStore `encryptionKey`; persister awaits cache-ready
**Choice.** Replace the eager top-level `new MMKV({encryptionKey:'dev-cache-key'})` with a memoized
`getCacheStorage(): Promise<MMKV>` that first resolves the key from SecureStore (`hc_cache_key`,
create-if-absent), then constructs the instance once. `persister.ts` keeps its adapter shape but each
method `await getCacheStorage()` before touching MMKV. A sync `clearCache()` exposes `MMKV.clearAll()`
for logout PHI wipe.
**Alternatives.** Keep the sync top-level singleton — **rejected**: the `encryptionKey` is now
async-sourced, so eager construction cannot see it. A React-context MMKV provider — **rejected**:
over-engineered; the registry/lazy-getter pattern mirrors `getApiClient()`/`getAuthStore()`.
**Rationale.** `createAsyncStoragePersister`'s adapter is already async-native, so awaiting an internal
"cache ready" promise is transparent to `PersistQueryClientProvider` — it simply waits for
restoration. No AuthBootstrap-level gate is needed for the cache (that is why the render-gate in D5
omits it). No shipped install base ⇒ a mismatched key on an existing on-disk file is moot.

### D5 — `bootstrap.ts` + `index.ts` import order + the render-gate
**Choice.** `src/bootstrap.ts` imports `./store/auth.store` (runs `setAuthStore`) then `./api/client`
(runs `setApiClient`), then calls `initDeviceId()`. `index.ts` imports `./src/bootstrap` **first**,
before `App` — mirroring web's `main.tsx:1`. A mobile `AuthBootstrap` blocks render until:
`ready = deviceIdReady && authHydrated && (!needsSilentRefresh || refreshAttempted)`.
**Alternatives.** Wiring inside `AppProviders`/`App` render — **rejected**: `getApiClient()` throws if
a request fires before `setApiClient()`; deterministic side-effect import order is the guarantee.
**Rationale.** `deviceIdReady` is a **separate** gate from core's `authHydrated` — the two async reads
are independent, and the silent-refresh call needs `getDeviceId()` to be populated, so its effect is
also guarded on `deviceIdReady`. This is the exact web `AuthBootstrap` predicate
(`AuthBootstrap.tsx:30-31`) plus the deviceId conjunct.

### D6 — RootNavigator: React Navigation v7 conditional screens (Login ↔ Tabs)
**Choice.** A single `Stack.Navigator` that renders `<Stack.Screen name="Login">` when
`user == null`, else `<Stack.Screen name="Tabs">`, reading `user` from `useAuthStore`.
**Alternatives.** Imperative `navigation.reset()` on login/logout — **rejected**: v7's conditional-
screens pattern is the documented idiom; changing the rendered screen set auto-resets history and
animates, so there is no stale back-stack and no manual reset call to forget.
**Rationale.** Declarative auth switching means login (`setAuth`→`user`) and logout
(`logout()`→`user=null`) flip the nav **for free** — this is also why `onRefreshFail` (D7) needs no
navigation ref.

### D7 — Login flow + explicit `platform` + 401 mapping
**Choice.** `LoginScreen` mirrors web (`LoginPage.tsx:41-50`): `login` → `setTokens` (**before**
`/auth/me` so the interceptor picks up the Bearer) → `me` → `setAuth`. Send `platform` **explicitly**
from `Platform.OS` (`ios`→`'iOS'`, else `'Android'`) and a `deviceName` (optional `expo-device`
`Device.modelName`). Map `isApiError(err) && err.status === 401` → `t('auth.invalidCredentials')`
("Correo o contraseña incorrectos"); other errors → generic. `onRefreshFail` = `clearCache()` +
`queryClient.clear()` (PHI wipe); the store `clear()` that precedes it already flips nav to Login.
**Alternatives.** Omit `platform` (backend enum is non-nullable + only `IsInEnum()`-validated) —
**rejected**: omission silently binds to `Android (=0)` with no 400, mislabeling iOS in the session
list. Widen `ApiError` to carry `ProblemDetails.title` — **rejected**: one 401 failure mode does not
justify changing the shared error shape.
**Rationale.** Ordering (`setTokens` before `me`) is load-bearing; explicit platform prevents silent
mislabeling; a fixed Spanish string keeps the shared `ApiError` untouched.

### D8 — Device-management "Más" tab + two-layer logout PHI hygiene
**Choice.** `DevicesScreen` (a new "Más" tab) lists `useDeviceSessions()`, highlights the current
device by matching `getDeviceId()`, offers per-row revoke, "Cerrar sesión" (logout), and "Cerrar todas
las sesiones" (revoke-all). `useLogout` (core) calls `POST /auth/logout {deviceId}` then — in
`onSettled`, so it runs even offline — `getAuthStore().logout()` + `queryClient.clear()`. The **mobile
call site additionally calls `clearCache()`** (`MMKV.clearAll()`).
**Alternatives.** Rely on `queryClient.clear()` alone — **rejected**: it drops only the in-memory
cache; the persisted MMKV blob survives an immediate app-kill and would restore PHI on next launch.
Core reaching mobile's MMKV — **rejected**: core is platform-agnostic and cannot import MMKV.
**Rationale.** PHI hygiene is inherently two-layer: core wipes what it can reach (in-memory +
session), mobile wipes the on-disk cache. Revoke/revoke-all invalidate `deviceSessionKeys.all`.
Revoking the **current** device is allowed and behaves as a remote logout on the next 401 (refresh
fails → `onRefreshFail`).

### D9 — Push deferred entirely to #9
**Choice.** No push register/deregister in #5.
**Alternatives.** A "deregister-only on logout" slice — **rejected**: `DELETE
/notifications/push-subscriptions/{token}` is keyed by the FCM token, obtainable only by standing up
the full expo-notifications stack (permissions, config plugin, EAS push creds) that #9 builds.
**Rationale.** Not separable; #5 stays pure auth/session/device-mgmt. Correct the master plan's #5
"ciclo push" line (plan line 167 + logout desc line 94).

---

## Sequence diagrams

### Cold-start bootstrap (deviceId init → hydrate → silent refresh → Login|Tabs)
```
index.ts ─ import './src/bootstrap'  (side effect, runs FIRST)
             ├─ store/auth.store  → createAuthStore({storage: SecureStore})
             │      getItem('hc_rt') → Promise ⇒ authHydrated=false; .then ⇒ refreshToken set, authHydrated=true
             ├─ api/client        → createApiClient({tokenStore, deviceIdProvider:getDeviceId, onRefreshFail}) + setApiClient
             └─ initDeviceId()    → SecureStore 'hc_device_id' (create if absent) ⇒ cached; deviceIdReady resolves
           registerRootComponent(App)

App → AppProviders → PersistQueryClientProvider ─(persister awaits getCacheStorage(): SecureStore 'hc_cache_key' → new MMKV)
                        └ NavigationContainer → AuthBootstrap → RootNavigator
  AuthBootstrap:
    deviceIdReady? ──no──▶ spinner
    authHydrated?  ──no──▶ spinner
    needsSilentRefresh = authHydrated && !accessToken && !!refreshToken
      ├─ false ▶ ready ▶ RootNavigator: user==null ? Login : Tabs
      └─ true  ▶ POST /auth/refresh {rt, deviceId:getDeviceId()} ▶ setTokens ▶ GET /auth/me ▶ setAuth
                  ▶ refreshAttempted=true ▶ ready ▶ Tabs        (on failure ▶ logout() ▶ Login)
```

### Login
```
LoginScreen.onSubmit(email, password)
  ▶ authApi.login({email, password, deviceId:getDeviceId(), platform, deviceName})   POST /auth/login → {at, rt}
  ▶ useAuthStore.setTokens(at, rt)     (rt → SecureStore 'hc_rt'; at in memory)   ← BEFORE /me
  ▶ authApi.me()                        GET /auth/me  (Bearer at via request interceptor) → user
  ▶ useAuthStore.setAuth(user, at, rt)  (user set)
  ▶ RootNavigator re-renders ⇒ user!=null ⇒ Tabs   (v7 conditional-screens auto-switch, no reset)
  [catch] isApiError && status===401 ⇒ "Correo o contraseña incorrectos"
```

### Logout (revoke device + clear caches)
```
DevicesScreen "Cerrar sesión"
  ▶ useLogout.mutateAsync(getDeviceId())
       ▶ authApi.logout(deviceId)       POST /auth/logout {deviceId} → 204  (server revokes THIS device session)
       [onSettled — runs even if offline/failed]
       ▶ getAuthStore().logout()        (SecureStore.deleteItemAsync('hc_rt'); user=null)   ['hc_device_id' UNTOUCHED]
       ▶ queryClient.clear()            (in-memory cache dropped)
  ▶ clearCache()                        (MMKV.clearAll() — wipes persisted PHI blob)   [mobile call-site layer]
  ▶ RootNavigator ⇒ user==null ⇒ Login
```

### Refresh rotation (atomic new-token persist — core, unchanged)
```
authed request → 401
  response interceptor (single-flight):
    isRefreshing ? ──yes──▶ push to pendingQueue (retried later with new Bearer)
    isRefreshing=true
    axios.post('/auth/refresh', {refreshToken, deviceId: deviceIdProvider()})   [bare axios — no interceptor recursion]
        → {accessToken, refreshToken'}     (server: single-use, 30s grace, sliding 60d/absolute 180d)
    tokenStore.setTokens(accessToken, refreshToken')   ◀── ATOMIC: 'hc_rt' persisted BEFORE queue release (createApiClient.ts:60)
    processQueue(null, accessToken) ▶ retry queued + original
  [refresh fails] processQueue(err) ▶ tokenStore.clear() (logout) ▶ onRefreshFail() (clearCache + qc.clear) ▶ Login
```

---

## Code sketches

**`core/types/auth.types.ts`** (additions + trim)
```ts
export interface RefreshRequest { refreshToken: string; deviceId: string }   // trimmed: drop deviceName?/platform?

export interface DeviceSessionResponse {
  id: string; deviceId: string; deviceName?: string
  platform: DevicePlatform; lastUsedAt: string; createdDate: string
}
export interface LogoutRequest { deviceId: string }
```

**`core/api/modules/auth.api.ts`** (append to the existing object)
```ts
logout: (deviceId: string) => getApiClient().post('/auth/logout', { deviceId } satisfies LogoutRequest).then((r) => r.data),
getSessions: () => getApiClient().get<DeviceSessionResponse[]>('/auth/sessions').then((r) => r.data),
revokeSession: (id: string) => getApiClient().delete(`/auth/sessions/${id}`).then((r) => r.data),
revokeAllSessions: () => getApiClient().post('/auth/sessions/revoke-all').then((r) => r.data),
```

**`core/hooks/auth/useDeviceSessions.ts`** (query-key factory + query + revoke mutations)
```ts
export const deviceSessionKeys = {
  all: ['auth', 'sessions'] as const,
  list: () => [...deviceSessionKeys.all, 'list'] as const,
}
export function useDeviceSessions() {
  return useQuery({ queryKey: deviceSessionKeys.list(), queryFn: authApi.getSessions })
}
export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: deviceSessionKeys.all }) })
}
export function useRevokeAllSessions() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: () => authApi.revokeAllSessions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: deviceSessionKeys.all }) })
}
```

**`core/hooks/auth/useLogout.ts`** (device revoke + local clear, offline-safe)
```ts
export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (deviceId: string) => authApi.logout(deviceId),
    onSettled: () => { getAuthStore().getState().logout(); qc.clear() },   // clear even if the API call failed
  })
}
```

**`apps/mobile/src/lib/secureStore.ts`** (async AuthStorage)
```ts
import * as SecureStore from 'expo-secure-store'
import type { AuthStorage } from 'core/auth/storage'
export const secureStoreAuthStorage: AuthStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),        // Promise<string|null> ⇒ triggers async-hydrate branch
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
}
```

**`apps/mobile/src/lib/deviceId.ts`** (async init + sync getter)
```ts
import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'
const DEVICE_ID_KEY = 'hc_device_id'          // SEPARATE key — survives logout
let cached: string | null = null
let ready: Promise<void> | null = null
export function initDeviceId(): Promise<void> {
  if (!ready) ready = (async () => {
    let id = await SecureStore.getItemAsync(DEVICE_ID_KEY)
    if (!id) { id = Crypto.randomUUID(); await SecureStore.setItemAsync(DEVICE_ID_KEY, id) }
    cached = id
  })()
  return ready
}
export function whenDeviceIdReady() { return ready ?? initDeviceId() }
export function getDeviceId(): string {
  if (!cached) throw new Error('getDeviceId() before deviceIdReady — check bootstrap gate.')
  return cached
}
```

**`apps/mobile/src/lib/mmkv.ts`** (lazy/promise-gated + SecureStore key — the surgical change)
```ts
import { MMKV } from 'react-native-mmkv'
import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'
const CACHE_KEY_NAME = 'hc_cache_key'
let instance: MMKV | null = null
let ready: Promise<MMKV> | null = null
export function getCacheStorage(): Promise<MMKV> {
  if (!ready) ready = (async () => {
    let key = await SecureStore.getItemAsync(CACHE_KEY_NAME)
    if (!key) { key = Crypto.randomUUID(); await SecureStore.setItemAsync(CACHE_KEY_NAME, key) }
    instance = new MMKV({ id: 'housecenter-cache', encryptionKey: key })
    return instance
  })()
  return ready
}
export function clearCache(): void { instance?.clearAll() }   // sync PHI wipe for logout
```

**`apps/mobile/src/lib/persister.ts`** (methods await cache-ready; adapter shape unchanged)
```ts
const mmkvStorage = {
  getItem: async (key: string) => (await getCacheStorage()).getString(key) ?? null,
  setItem: async (key: string, value: string) => { (await getCacheStorage()).set(key, value) },
  removeItem: async (key: string) => { (await getCacheStorage()).delete(key) },
}
export const persister = createAsyncStoragePersister({ storage: mmkvStorage, key: 'housecenter-query-cache' })
```

**`apps/mobile/src/store/auth.store.ts` + `api/client.ts` + `bootstrap.ts`** (web mirror)
```ts
// store/auth.store.ts
export const useAuthStore = createAuthStore({ storage: secureStoreAuthStorage })
setAuthStore(useAuthStore)

// api/client.ts
const tokenStore: TokenStore = {
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (a, r) => useAuthStore.getState().setTokens(a, r),
  clear: () => useAuthStore.getState().logout(),
}
setApiClient(createApiClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL!,       // local dev :5080
  tokenStore, deviceIdProvider: getDeviceId,
  onRefreshFail: () => { clearCache(); queryClient.clear() },   // store.clear() already flipped nav → Login
}))

// bootstrap.ts (imported FIRST in index.ts, before App)
import './store/auth.store'   // setAuthStore
import './api/client'         // setApiClient
import { initDeviceId } from './lib/deviceId'
initDeviceId()
```

**`apps/mobile/src/components/AuthBootstrap.tsx`** (render gate)
```tsx
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { authHydrated, accessToken, refreshToken, setAuth, logout } = useAuthStore()
  const [deviceIdReady, setDeviceIdReady] = useState(false)
  const [refreshAttempted, setRefreshAttempted] = useState(false)
  useEffect(() => { whenDeviceIdReady().then(() => setDeviceIdReady(true)) }, [])

  const needsSilentRefresh = authHydrated && !accessToken && !!refreshToken
  const ready = deviceIdReady && authHydrated && (!needsSilentRefresh || refreshAttempted)

  useEffect(() => {
    if (!deviceIdReady || !needsSilentRefresh || refreshAttempted) return
    authApi.refresh({ refreshToken: refreshToken!, deviceId: getDeviceId() })
      .then(async (t) => {
        useAuthStore.getState().setTokens(t.accessToken, t.refreshToken)
        setAuth(await authApi.me(), t.accessToken, t.refreshToken)
      })
      .catch(() => logout())
      .finally(() => setRefreshAttempted(true))
  }, [deviceIdReady, needsSilentRefresh, refreshAttempted, refreshToken, setAuth, logout])

  if (!ready) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>
  return <>{children}</>
}
```

**`apps/mobile/src/navigation/RootNavigator.tsx`** (v7 conditional screens)
```tsx
export function RootNavigator() {
  const user = useAuthStore((s) => s.user)
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user == null
        ? <Stack.Screen name="Login" component={LoginScreen} />
        : <Stack.Screen name="Tabs" component={TabNavigator} />}
    </Stack.Navigator>
  )
}
```

**`apps/mobile/src/screens/LoginScreen.tsx`** (skeleton — Spanish; explicit platform; 401 map)
```tsx
const platform: DevicePlatform = Platform.OS === 'ios' ? 'iOS' : 'Android'
async function onSubmit({ email, password }: FormData) {
  try {
    const t = await authApi.login({ email, password, deviceId: getDeviceId(), platform, deviceName: Device.modelName ?? undefined })
    useAuthStore.getState().setTokens(t.accessToken, t.refreshToken)   // before /me
    const user = await authApi.me()
    useAuthStore.getState().setAuth(user, t.accessToken, t.refreshToken)  // ⇒ nav flips to Tabs
  } catch (err) {
    setRootError(isApiError(err) && err.status === 401 ? t('auth.invalidCredentials') : t('common.error'))
  }
}
```

**`apps/mobile/src/screens/DevicesScreen.tsx`** (skeleton — "Más" tab)
```tsx
const { data: sessions } = useDeviceSessions()
const revoke = useRevokeSession(); const revokeAll = useRevokeAllSessions(); const logout = useLogout()
const current = getDeviceId()
// FlatList: row per session; highlight where s.deviceId === current; per-row → revoke.mutate(s.id)
// "Cerrar todas las sesiones" → revokeAll.mutate()
// "Cerrar sesión" → await logout.mutateAsync(current); clearCache()   // core clears store+qc; mobile wipes MMKV
```

---

## Build / PR sequence (3 chained PRs, ≤400 lines each, lockfile excluded)

| PR | Scope | Verification gates |
|----|-------|--------------------|
| **PR1 — Core auth session-mgmt** | `auth.types.ts` (+`DeviceSessionResponse`/`LogoutRequest`, trim `RefreshRequest`), `auth.api.ts` (4 fns), `hooks/auth/{useDeviceSessions,useLogout}.ts` (+ key factory) | `pnpm --filter core exec tsc -b`; **`pnpm --filter web build` + `pnpm --filter web lint`** (shared-file regression guard) |
| **PR2 — Mobile auth wiring** | deps (expo-secure-store, expo-crypto, axios, opt. expo-device); `lib/{secureStore,deviceId}.ts`; `store/auth.store.ts`; `api/client.ts`; `bootstrap.ts`; `index.ts` order; `components/AuthBootstrap.tsx`; `providers/AppProviders.tsx` mount; `navigation/RootNavigator.tsx` conditional; `screens/LoginScreen.tsx`; `es.json` auth strings | `pnpm --filter mobile exec tsc --noEmit`; `npx expo-doctor`; `npx expo export`; dev-client login→silent-refresh smoke vs local API :5080 |
| **PR3 — Device-mgmt "Más" + MMKV migration** | `lib/mmkv.ts` lazy + `lib/persister.ts` await; `screens/DevicesScreen.tsx` (list/highlight/revoke/logout/revoke-all + `clearCache()`); `navigation/TabNavigator.tsx` "Más" tab; `es.json` device-mgmt strings | `tsc --noEmit`; `npx expo export`; dev-client logout→revoke→revoke-all smoke vs :5080 |

PR2 depends on PR1; PR3 depends on PR2. Web depends on neither (regression-guarded only).

---

## Verification

- **Typecheck/build (gating, no test runner — `strict_tdd:false`):** `pnpm --filter core exec tsc -b`,
  `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, `npx expo export`, and
  **`pnpm --filter web build` + lint** (core auth files are shared — the web-regression guard).
- **Human/dev-client smoke vs local API :5080:** cold start (no session → Login; stored session →
  silent refresh → Tabs, no Login flash); login (iOS device shows `Platform=iOS` in the session list);
  401 → automatic refresh-and-retry; logout (device disappears from list, MMKV blob gone after
  app-kill); revoke a device; revoke-all.
- **Risk watch:** confirm Metro resolves core's new `hooks/auth/*` raw-TS subpaths at `expo export`
  time; confirm `Crypto.randomUUID()` output is an accepted MMKV `encryptionKey` length.

## Rollback

Mobile changes are **purely additive** (new files + wiring in a package with no auth today). Core
additions are **backward-compatible**: four new functions, two new types, two new hook files, and one
inert `RefreshRequest` field trim (clients already send only the two remaining fields). No migrations,
no persisted-schema change — MMKV holds a disposable READ cache and there is no shipped install base,
so a mismatched `encryptionKey` is moot. Rollback = **revert the branch**; `pnpm install` regenerates
the lockfile. PR1 can be reverted independently (mobile PRs depend on it; web does not).

## Open questions

None blocking. Ratified positions carried from the proposal: push deferred entirely to #9 (D9);
disambiguated core naming (D1); the two sync/async fixes are in-scope architecture (D3, D4).
