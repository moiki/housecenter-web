# SDD Design — Core Extraction

## Change name
`core-extraction`

## Status
`design` (2026-07-12)

---

## Target structure

The four-layer stack's bottom three layers plus pure `lib/` helpers move to a source-consumed
`packages/core`. Web keeps only the platform-bound seams (localStorage, `window.location`, DOM).

```
packages/core/
├── package.json                 ← NEW: name "core", type module, exports map, peer/deps split
├── tsconfig.json                ← NEW: extends ../../tsconfig.base.json, noEmit, "build":"tsc -b"
└── src/
    ├── types/*.ts               ← git mv (15 files); patient.types.ts also gets the enum fix
    ├── api/
    │   ├── http/
    │   │   ├── createApiClient.ts   ← NEW: axios factory + 401 single-flight queue (lifted)
    │   │   └── registry.ts          ← NEW: setApiClient / getApiClient indirection
    │   └── modules/*.api.ts     ← git mv (15); one-line `apiClient` → `getApiClient()` swap
    ├── auth/
    │   ├── createAuthStore.ts   ← NEW: Zustand factory + authHydrated + hydrate()
    │   ├── registry.ts          ← NEW: setAuthStore / getAuthStore indirection
    │   └── storage.ts           ← NEW: AuthStorage + TokenStore interfaces
    ├── hooks/<feature>/*.ts     ← git mv (13 feature folders); useMe becomes pure (DOM split out)
    ├── schemas/*.ts             ← git mv (4 Zod files)
    └── lib/
        ├── recurrence.ts        ← git mv
        ├── queryClient.ts       ← git mv
        └── constants.ts         ← git mv, RBAC + pagination ONLY (NavItem/NAV_ITEMS stay in web)

apps/web/src/
├── api/client.ts                ← REWRITTEN thin: createApiClient(localStorage tokenStore, onRefreshFail) + setApiClient
├── store/auth.store.ts          ← REWRITTEN thin: createAuthStore(localStorage AuthStorage) + setAuthStore
├── bootstrap.ts                 ← NEW: deterministic boot wiring, imported first in main.tsx
├── components/guards/AuthBootstrap.tsx ← MODIFIED: authHydrated gate + owns the one dark-mode effect
├── lib/nav.ts                   ← NEW: NavItem + NAV_ITEMS (route paths + MUI icon strings)
└── lib/deviceId.ts              ← NEW: getOrCreateDeviceId() (UUID persisted in localStorage)
```

Files that STAY in web unchanged: `hooks/utils/useOnClickOutside.ts`, `hooks/use-resize-observer.ts`
(DOM-only), and all `pages/**`, `components/**`, `layouts/**`, `styles/**` (import-path edits only).

---

## Architecture decisions

### D1 — JIT (source-consumed) package shape
**Choice.** `packages/core` ships `.ts` source directly via a `package.json` `exports` map; no build
step, `noEmit:true` + a `tsc -b` typecheck-only `build` script (turbo-compatible, emits no `dist/`).
**Alternatives.** Built `dist/` (Option B) — rejected: extra build in the inner loop, stale-dist
hazard, dual-package risk, zero benefit for a private package.
**Rationale.** `tsconfig.base.json` already sets `moduleResolution:"bundler"`, which resolves
`exports`; Metro's Package Exports is default-on since RN 0.79, so the same shape is mobile-safe.
pnpm links `core` to the real `packages/core/src` path (outside `node_modules`), so Vite/tsc apply
their normal `.ts` transform pipeline. **exports map (`*` matches slashes, incl. nested segments):**

```jsonc
// packages/core/package.json
{
  "name": "core", "version": "0.0.0", "private": true, "type": "module",
  "exports": {
    "./types/*":       "./src/types/*.ts",
    "./api/http/*":    "./src/api/http/*.ts",
    "./api/modules/*": "./src/api/modules/*.ts",
    "./auth/*":        "./src/auth/*.ts",
    "./hooks/*":       "./src/hooks/*.ts",
    "./schemas/*":     "./src/schemas/*.ts",
    "./lib/*":         "./src/lib/*.ts"
  },
  "peerDependencies": { "react": "^19", "@tanstack/react-query": "^5" },
  "dependencies":     { "axios": "^1", "zod": "^4", "zustand": "^5" }
}
```

**peerDependencies rationale.** `react` and `@tanstack/react-query` MUST be single-instance:
core's hooks call `useQuery`, which reads the `QueryClientProvider` **context created in the app** —
two react-query copies = two contexts = "No QueryClient set". React itself must be shared or hooks
throw "Invalid hook call". `axios`/`zod` have no context/singleton hazard → plain deps. `zustand` is
a dep because the store is a module singleton created once in the app and shared via `getAuthStore()`.
Keeping `api/modules/` as a folder (not flattening to `./api/*`) means every web import is a **pure
prefix swap** `@/api/modules/x` → `core/api/modules/x`, and it does not collide with `./api/http/*`.

### D2 — `createApiClient(config)` factory
**Choice.** Lift the entire request interceptor + 401 single-flight refresh queue
(`isRefreshing`/`pendingQueue`/`processQueue`) out of `api/client.ts` **verbatim**, parameterizing
only the three platform seams:

```ts
createApiClient({
  baseURL: string,
  tokenStore: TokenStore,          // replaces useAuthStore.getState() reads/writes
  deviceIdProvider: () => string,  // NEW — threads deviceId into the internal /auth/refresh POST
  onRefreshFail: () => void,       // replaces window.location.href = '/login'
}): AxiosInstance
```

**Alternatives.** Leaving `api/client.ts` in web and duplicating it for mobile — rejected: two copies
of the subtle refresh-queue logic drift. **Rationale.** The queue is 100% portable; only three lines
are browser-bound. Mapping: `useAuthStore.getState().accessToken` → `tokenStore.getAccessToken()`;
`store.refreshToken`/`setAuth`/`logout` → `tokenStore.getRefreshToken()`/`setTokens()`/`clear()`;
`window.location.href='/login'` → `onRefreshFail()`; the internal `axios.post('/auth/refresh', …)`
body gains `deviceId: deviceIdProvider()`. The internal refresh keeps using a **bare `axios.post`**
(not the returned instance) to avoid interceptor recursion — preserved exactly.

### D3 — `setApiClient` / `getApiClient` indirection
**Choice.** A module-level registry so the 15 api modules read the client lazily instead of importing
a concrete singleton. **Rationale.** Editing exactly one import line per module, zero call-site churn.
Before/after of an api module (`auth.api.ts`):

```ts
// BEFORE                                    // AFTER
import { apiClient } from '@/api/client'      import { getApiClient } from 'core/api/http/registry'
// …                                          // …
apiClient.post('/auth/login', data)           getApiClient().post('/auth/login', data)
```

`getApiClient()` throws if called before `setApiClient()` — web wires it first in `bootstrap.ts` (D9).

### D4 — `createAuthStore({ storage })` + `TokenStore` / `AuthStorage`
**Choice.** A Zustand factory mirroring `createApiClient`, holding today's `AuthState`
(`user, accessToken, refreshToken, setTokens, setAuth, updateUser, logout`) **plus** `authHydrated`
and `hydrate()`. Two distinct interfaces:

```ts
// core/auth/storage.ts
export interface AuthStorage {                    // persistence adapter (localStorage | SecureStore)
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}
export interface TokenStore {                     // sync view the API client needs
  getAccessToken(): string | null
  getRefreshToken(): string | null
  setTokens(access: string, refresh: string): void
  clear(): void
}
```

**Rationale.** `AuthStorage` is async-capable (mobile SecureStore) and only touched at hydrate/write
time. `TokenStore` is **always synchronous** and is derived from the in-memory Zustand state — once
`hydrate()` has run, `refreshToken` lives in memory, so the axios interceptor's per-request token read
is sync on every platform. This separation is what lets async storage coexist with a sync request path.

### D5 — `authHydrated` tri-state hydration redesign (highest risk)
**Choice.** Replace `auth.store.ts`'s synchronous `localStorage.getItem` initializer + `AuthBootstrap`'s
`useState(!!accessToken || !refreshToken)` with a tri-state `authHydrated` flag. The factory does a
**synchronous best-effort read**: if `storage.getItem` returns a non-thenable (localStorage) it seeds
`refreshToken` + `authHydrated=true` in the initial state; if it returns a Promise (SecureStore) it
seeds `null`/`false` and resolves via `.then()`.
**Alternatives.** Always-async `hydrate()` with `authHydrated` starting `false` — rejected: it would
flash a spinner for logged-out web users who today render instantly. **Rationale — proves web
first-paint is preserved:** because localStorage is synchronous, web's `authHydrated` is `true` on the
first render and `refreshToken` is already populated — byte-identical to today. `AuthBootstrap` seeds
its readiness with the **same predicate** guarded by hydration, so the logged-out fast path (no
spinner) and the silent-refresh path (spinner) are both unchanged for web; the flag only becomes
observable latency on mobile, where "logged out" can no longer be misread before storage resolves.

### D6 — `useMe` split; single dark-mode DOM effect
**Choice.** `useMe` moves to core as a pure query hook (reads the store via `getAuthStore()`, writes
`user` via `setAuth`, no DOM). The dark-mode `document.documentElement.classList` toggle — currently
duplicated in `useMe` (lines 19-23) **and** `AuthBootstrap` (line 28) — is consolidated into **one
declarative effect in `AuthBootstrap`** keyed on `user?.darkMode`.
**Rationale.** Removes the last DOM dependency from the hooks layer; `AuthBootstrap` becomes the single
owner of the dark-mode DOM side effect, reacting to store `user` updates (which `useMe` still drives).

### D7 — File-level hook exports (import surface)
**Choice.** `"./hooks/*":"./src/hooks/*.ts"`, imported `core/hooks/patients/usePatients`.
**Alternatives.** A barrel `index.ts` per folder — rejected: 13 new files, a second surface to
maintain, no consumer benefit in a source-consumed package. **Rationale.** Zero new files; the ~37
hook import sites are pure prefix swaps. All layers follow the same rule, so the whole ~70-file
migration is `@/{types,api/modules,hooks,schemas,lib}/…` → `core/…` find-replace.

### D8 — deviceId threading (device-bound sessions)
**Choice.** Add optional `deviceId`/`deviceName`/`platform` to `LoginRequest`/`RefreshRequest`/
`SignupRequest`. Web provides `getOrCreateDeviceId()` (UUID persisted in localStorage, key
`hc_device_id`); `createApiClient` receives `deviceIdProvider`. The dumb `authApi.*` modules forward
whatever the caller passes — so login/signup pages spread device fields into the request, and the
**client's internal refresh** builds `{ refreshToken, deviceId: deviceIdProvider() }`.
**Rationale.** API change #1 now REQUIRES deviceId on auth. Ships **last (PR4)** so it can be
coordinated with the API device-bound-sessions cutover; rollback is coupled to that deploy.

### D9 — Enum fix + no tsconfig `paths` needed
**Choice.** In the `patient.types.ts` git mv, correct `TreatmentStatus` (`Cancelled`→`Paused`) and
`CommentType` (`Note/Alert/Observation`→`Route/Medical/Simple`). Add only `"core":"workspace:*"` to
`apps/web/package.json` — **no `paths` entry**. **Rationale.** `grep` confirms nothing outside
`patient.types.ts` imports those enums by name → compile-only, zero runtime blast radius. With
`moduleResolution:"bundler"` + the workspace dependency, `core/*` resolves natively via the package's
`exports` map; `apps/web/tsconfig.app.json` keeps its `@/*` paths unchanged for web-internal imports.

---

## Code sketches

**`core/api/http/createApiClient.ts`** (queue lifted verbatim; seams italicized in comments):

```ts
import axios, { type AxiosError } from 'axios'
import { createApiError, type ProblemDetails } from 'core/types/common.types'
import type { TokenStore } from 'core/auth/storage'

export function createApiClient(cfg: {
  baseURL: string; tokenStore: TokenStore
  deviceIdProvider: () => string; onRefreshFail: () => void
}) {
  const client = axios.create({ baseURL: cfg.baseURL, headers: { 'Content-Type': 'application/json' } })

  client.interceptors.request.use((c) => {
    const t = cfg.tokenStore.getAccessToken()               // was useAuthStore.getState().accessToken
    if (t) c.headers.Authorization = `Bearer ${t}`
    return c
  })

  let isRefreshing = false
  let pendingQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []
  const processQueue = (err: unknown, token: string | null) => {
    pendingQueue.forEach((p) => (token ? p.resolve(token) : p.reject(err))); pendingQueue = []
  }

  client.interceptors.response.use((r) => r, async (error: AxiosError<ProblemDetails>) => {
    const original = error.config!
    const rt = cfg.tokenStore.getRefreshToken()
    if (error.response?.status === 401 && rt) {
      if (isRefreshing) return new Promise((resolve, reject) => pendingQueue.push({ resolve, reject }))
        .then((token) => { original.headers.Authorization = `Bearer ${token}`; return client(original) })
      isRefreshing = true
      try {
        const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${cfg.baseURL}/auth/refresh`, { refreshToken: rt, deviceId: cfg.deviceIdProvider() }) // +deviceId
        cfg.tokenStore.setTokens(data.accessToken, data.refreshToken)
        processQueue(null, data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return client(original)
      } catch (e) { processQueue(e, null); cfg.tokenStore.clear(); cfg.onRefreshFail(); return Promise.reject(e) }
      finally { isRefreshing = false }
    }
    const p = error.response?.data
    throw createApiError(error.response?.status ?? 0, p?.detail ?? error.message, p?.errors ?? {})
  })
  return client
}
```

**`core/auth/createAuthStore.ts`** (sync/async branch at init — the crux of D5):

```ts
import { create } from 'zustand'
import type { UserResponse } from 'core/types/auth.types'
import type { AuthStorage } from 'core/auth/storage'
const REFRESH_KEY = 'hc_rt'

export function createAuthStore(storage: AuthStorage) {
  return create<AuthState>((set, get) => {
    const initial = storage.getItem(REFRESH_KEY)              // string|null (web) OR Promise (mobile)
    const sync = !(initial instanceof Promise)
    if (!sync) initial.then((rt) => set({ refreshToken: rt, authHydrated: true }))
    return {
      user: null, accessToken: null,
      refreshToken: sync ? (initial as string | null) : null,
      authHydrated: sync,                                     // web: true at first paint
      hydrate: async () => { const rt = await storage.getItem(REFRESH_KEY); set({ refreshToken: rt, authHydrated: true }) },
      setTokens: (a, r) => { storage.setItem(REFRESH_KEY, r); set({ accessToken: a, refreshToken: r }) },
      setAuth: (u, a, r) => { storage.setItem(REFRESH_KEY, r); set({ user: u, accessToken: a, refreshToken: r }) },
      updateUser: (u) => set({ user: u }),
      logout: () => { storage.removeItem(REFRESH_KEY); set({ user: null, accessToken: null, refreshToken: null }) },
    }
  })
}
```

**`apps/web/src/store/auth.store.ts`** (thin — BEFORE was 39 lines with the sync localStorage read):

```ts
import { createAuthStore } from 'core/auth/createAuthStore'
import { setAuthStore } from 'core/auth/registry'
import type { AuthStorage } from 'core/auth/storage'

const localStorageAdapter: AuthStorage = {
  getItem: (k) => localStorage.getItem(k),
  setItem: (k, v) => localStorage.setItem(k, v),
  removeItem: (k) => localStorage.removeItem(k),
}
export const useAuthStore = createAuthStore(localStorageAdapter)
setAuthStore(useAuthStore)                          // core hooks read via getAuthStore()
```

**`apps/web/src/api/client.ts`** (thin — imports auth.store first, guaranteeing wiring order):

```ts
import { createApiClient } from 'core/api/http/createApiClient'
import { setApiClient } from 'core/api/http/registry'
import type { TokenStore } from 'core/auth/storage'
import { useAuthStore } from '@/store/auth.store'
import { getOrCreateDeviceId } from '@/lib/deviceId'

const tokenStore: TokenStore = {
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (a, r) => useAuthStore.getState().setTokens(a, r),
  clear: () => useAuthStore.getState().logout(),
}
export const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  tokenStore, deviceIdProvider: getOrCreateDeviceId,
  onRefreshFail: () => { window.location.href = '/login' },
})
setApiClient(apiClient)
```

**`apps/web/src/bootstrap.ts`** + `main.tsx` (deterministic order — `setApiClient` before first request):

```ts
// bootstrap.ts
import '@/store/auth.store'   // runs setAuthStore
import '@/api/client'         // runs setApiClient (imports auth.store → order guaranteed)
// main.tsx: add as the FIRST import, above everything:
import '@/bootstrap'
```

**`apps/web/src/components/guards/AuthBootstrap.tsx`** (D5 + D6 — before/after):

```tsx
// BEFORE: const [ready, setReady] = useState(!!accessToken || !refreshToken); useEffect(..., [])
//         + inline dark-mode toggle inside the refresh .then()
export function AuthBootstrap({ children }: Props) {
  const { authHydrated, accessToken, refreshToken, user, setAuth, logout } = useAuthStore()
  const [ready, setReady] = useState(authHydrated && (!!accessToken || !refreshToken))  // web: identical to old

  useEffect(() => {
    if (!authHydrated || ready) return                       // wait for storage (sync-true on web)
    if (accessToken || !refreshToken) { setReady(true); return }
    authApi.refresh({ refreshToken: refreshToken!, deviceId: getOrCreateDeviceId() })
      .then(async (t) => {
        useAuthStore.getState().setTokens(t.accessToken, t.refreshToken)
        setAuth(await authApi.me(), t.accessToken, t.refreshToken)
      })
      .catch(() => logout()).finally(() => setReady(true))
  }, [authHydrated])

  useEffect(() => {                                           // consolidated single dark-mode owner (D6)
    document.documentElement.classList.toggle('dark-mode', !!user?.darkMode)
  }, [user?.darkMode])

  if (!ready) return <Spinner/>            // unchanged spinner markup
  return <>{children}</>
}
```

**No `apps/web/tsconfig.app.json` `paths` change** — `core/*` resolves via the package `exports` map
under `moduleResolution:"bundler"`; the file keeps only `"@/*": ["src/*"]`.

---

## Migration sequence (per-PR; all moves via `git mv`, keep filenames)

**PR1 — core foundation + abstraction.** Write `packages/core/package.json` (exports map above) +
`tsconfig.json`; add `"core":"workspace:*"` to `apps/web/package.json`; `pnpm install`. Author
`createApiClient` + `registry` (api), `createAuthStore` + `registry` + `storage` (auth). `git mv`
`types/*` (+ enum fix), `lib/recurrence.ts`, `lib/queryClient.ts`, and the RBAC/pagination half of
`lib/constants.ts`; leave `NavItem`/`NAV_ITEMS` in a new `apps/web/src/lib/nav.ts`. Rewrite web's thin
`api/client.ts` + `auth.store.ts`, add `bootstrap.ts`, wire `main.tsx`; point `App.tsx` at
`core/lib/queryClient` + `core/lib/constants`; split `Sidebar.tsx` import. Verify:
`pnpm --filter core build` + `pnpm --filter web build` + `lint`.

**PR2 — api modules.** `git mv api/modules/*` (15) to core; one-line `getApiClient()` swap each;
migrate the ~24 web importers (incl. the 9 convention-drift files) `@/api/modules/x` → `core/api/modules/x`.
Verify: `pnpm --filter web build` + `lint`.

**PR3 — hooks + hydration redesign (highest risk).** `git mv` the 13 feature hook folders; apply the
`useMe` split; apply the `authHydrated` redesign in `auth.store.ts`/`AuthBootstrap.tsx`; migrate ~22
hook importers. Verify: build + lint + **manual smoke: hard reload while logged in (silent refresh,
no /login bounce), and logged-out first paint (no spinner flash, straight to /login)**.

**PR4 — schemas + deviceId + cleanup.** `git mv schemas/*` + migrate ~8 importers; add deviceId
end-to-end (types + `deviceId.ts` + login/signup callers + internal refresh); finalize `nav.ts`.
Final gate: `pnpm -w build`.

---

## Verification

- Per slice: `pnpm --filter core build` (typecheck-only) → `pnpm --filter web build` (`tsc -b` catches
  any missed import swap) → `pnpm --filter web lint`. Final: `pnpm -w build`.
- No test runner (`strict_tdd:false`) — the two behavior-changing items (PR3 hydration, PR4 deviceId)
  get manual smoke checks: reload-while-authed, logged-out first paint, login/refresh send deviceId.
- Risk watch: if Vite pre-bundles the linked source package, add `core` to `optimizeDeps.exclude` so
  its `.ts` is transformed by Vite (not esbuild-prebundled). Confirm during PR1 `pnpm --filter web dev`.

## Rollback

Fully reversible — history-preserving `git mv` + additive package config + thin adapters. Revert the
branch or any single chained PR (each is independently build-green). `pnpm install` regenerates links
from reverted `package.json`s. Web's thin wrappers revert to their inlined form independently. PR3
rollback restores the sync `!!accessToken || !refreshToken` check verbatim. **deviceId caveat:** if the
API device-bound-sessions cutover has shipped, rolling back PR4 breaks login/refresh — roll back the
API first, or keep PR4.
