# SDD Proposal — Core Extraction

## Change name
`core-extraction`

## Status
`proposed` (2026-07-12)

## Problem

The monorepo bootstrap (change #2) created an empty `packages/core` but the entire
UI-agnostic stack still lives in `apps/web/src`: the four-layer convention's bottom three
layers — `types/*.ts` (contracts), `api/modules/*.api.ts` (transport), `hooks/**` (TanStack
Query data layer) — plus `schemas/*.ts` and three `lib/` files. A future Expo `apps/mobile`
needs to consume that exact stack, and it cannot until the code is a shared package. This is
change #3 in the master plan (`~/.claude/plans/hola-…-puzzle.md`); it depends on #2 (done)
and **blocks all mobile app work**.

Exploration confirmed ~90% of the surface is a mechanical `git mv` + import-prefix swap
(these layers already have almost no cross-layer leaks). But three seams need real design,
not just a move:

1. **`api/client.ts`** reads the concrete `useAuthStore` singleton and hardcodes
   `window.location.href = '/login'` — a browser-only escape hatch that has no RN equivalent.
2. **`store/auth.store.ts`** reads `localStorage.getItem('hc_rt')` **synchronously** at
   Zustand-init time (line 24). That breaks the moment `AuthStorage` becomes async
   (SecureStore on mobile) — and `AuthBootstrap`'s readiness check treats "no refresh token"
   as "ready now", which is undecidable before an async read resolves.
3. **`hooks/auth/useMe.ts`** has a genuine DOM side effect (`document.documentElement.classList`
   dark-mode toggle) and imports the concrete store — both block a clean move.

Two more things ride along because this is the moment the boundary is drawn:
**device-bound sessions** (API change #1, already implemented server-side) now REQUIRE a
`deviceId` on login/refresh/signup — net-new client work — and a long-standing **enum drift**
in `patient.types.ts` (`TreatmentStatus`/`CommentType` diverged from the API) is trivially
fixable while that file moves.

## Proposed change

Extract the UI-agnostic stack into a source-consumed (JIT) `packages/core` and rewire
`apps/web` to consume it, in ~4 chained PRs. The move is history-preserving (`git mv`, keep
filenames); the abstraction seams are resolved with three small factories that let one
codebase serve both web (localStorage, `window.location`) and later mobile (SecureStore,
navigation reset) via injected adapters:

1. **Package shape — Option A (JIT / source-consumed, no build step).** `packages/core` ships
   `.ts` source directly via a `package.json` `exports` map (`moduleResolution:"bundler"`,
   already in the base tsconfig, resolves it; Metro's Package Exports is default-on since
   RN 0.79). Zero build latency, no dual-package hazard, matches Turborepo "Internal Packages".
2. **`git mv` the four layers to core** (keep `.api.ts`/`.types.ts`/`.schema.ts` names):
   `types/*`, `api/modules/*`, the 13 feature `hooks/<feature>/*` folders, `schemas/*`,
   `lib/recurrence.ts`, `lib/queryClient.ts`, and the role/pagination constants split out of
   `lib/constants.ts`.
3. **Three injection factories in core** — `createApiClient`, `createAuthStore`,
   `setApiClient`/`getApiClient` + `getAuthStore` — so the 15 api modules and the query hooks
   change only their **import line**, never their call sites. Each app instantiates the client
   and store once at boot with platform adapters.
4. **Web stays thin**: `api/client.ts` becomes a wrapper that calls `createApiClient` with a
   localStorage `TokenStore` + a `window.location` `onRefreshFail`; `store/auth.store.ts`
   instantiates `createAuthStore` with a localStorage `AuthStorage`.
5. **Fold in the enum fix** (compile-only, zero runtime blast radius), **split the dark-mode
   DOM effect** out of `useMe`, **redesign auth hydration** to a tri-state `authHydrated` flag,
   and **add deviceId** support end-to-end.

**Web behavior MUST be preserved** (the localStorage hydrate resolves synchronously, so the
`authHydrated` flag flips immediately for web). Verify per slice:
`pnpm --filter core build` + `pnpm --filter web build` + `pnpm --filter web lint`, final gate
`pnpm -w build`. No test runner exists (`strict_tdd: false`).

## Extraction inventory

| Layer / file | Destination | Notes |
|---|---|---|
| `types/*.ts` (15 files, incl. `common.types.ts`) | **core** `./types/*` | Zero internal imports. `patient.types.ts` gets the enum fix in the same move. |
| `api/modules/*.api.ts` (15 incl. `auth.api.ts`) | **core** `./api/*` | Each imports `apiClient` only → one-line swap to `getApiClient()`. |
| `hooks/<feature>/*` (13 feature folders) | **core** `./hooks/*` | The TanStack Query layer. `useMe` moves as a pure query hook (dark-mode split out). |
| `schemas/*.ts` (clinic, collaborator, patient, workroute) | **core** `./schemas/*` | Pure Zod, zero internal imports. |
| `lib/recurrence.ts` | **core** `./lib/recurrence` | Pure `expandOccurrences`; 1 consumer (`WorkRouteCalendar.tsx`). |
| `lib/queryClient.ts` | **core** `./lib/queryClient` | Trivial `QueryClient` factory; 1 consumer (`App.tsx`). |
| `lib/constants.ts` — `DEFAULT_PAGE_SIZE`, `DROPDOWN_PAGE_SIZE`, `ROLE_NAMES`, `RoleName`, `ALL_ROLES`, `ADMIN_ABOVE`, `STAFF_ONLY` | **core** `./lib/constants` | Split: RBAC + pagination constants are UI-agnostic. |
| — | — | — |
| `api/client.ts` | **stays in web** | Becomes a thin wrapper over core's `createApiClient` + localStorage adapter + `setApiClient`. |
| `store/auth.store.ts` | **stays in web** | Becomes a thin instantiation of core's `createAuthStore` + localStorage `AuthStorage`. |
| `components/guards/AuthBootstrap.tsx` | **stays in web** | Gains the `authHydrated` gate + owns the (consolidated) dark-mode DOM effect. |
| `lib/constants.ts` — `NavItem`, `NAV_ITEMS` | **stays in web** → new `apps/web/src/lib/nav.ts` | Route paths + MUI icon-name strings tied to `Sidebar.tsx`. |
| `hooks/utils/useOnClickOutside.ts`, `hooks/use-resize-observer.ts` | **stays in web** | DOM-only UI hooks (`document.addEventListener`, `window.ResizeObserver`). |
| `pages/**`, `components/**`, `layouts/**`, `styles/**` | **stays in web** | Presentation layer — out of scope for core. |

## Client + auth abstraction

Three small factories in core replace the two direct singleton imports (`apiClient`,
`useAuthStore`) that today couple the transport + data layers to the browser.

**`core/api/http/createApiClient(config)`** — lifts the request interceptor (Bearer attach) +
the 401 single-flight refresh queue (`isRefreshing` / `pendingQueue` / `processQueue`) +
`createApiError` mapping out of `api/client.ts`, 100% portable except two injected seams:

```ts
createApiClient({
  baseURL: string,
  tokenStore: TokenStore,          // replaces direct useAuthStore.getState() reads
  deviceIdProvider: () => string,  // NEW — threads deviceId into the internal /auth/refresh call
  onRefreshFail: () => void,       // replaces window.location.href = '/login'
}): AxiosInstance
```

- `useAuthStore.getState().accessToken` (request interceptor) → `tokenStore.getAccessToken()`.
- `store.refreshToken` / `store.setAuth` / `store.logout` (refresh handler) →
  `tokenStore.getRefreshToken()` / `setTokens()` / `clear()`.
- `window.location.href = '/login'` → `onRefreshFail()` (web: `window.location`;
  mobile later: navigation reset).
- The internal `axios.post('/auth/refresh', …)` body gains `deviceId` from `deviceIdProvider()`.

**`setApiClient(client)` / `getApiClient()`** — a module-level indirection so the 15 api
modules import `getApiClient()` instead of the concrete `apiClient`. Editing exactly one
import line per module, zero call-site churn. Web calls `setApiClient(client)` once at boot.

**`core/auth/createAuthStore({ storage })`** — a Zustand factory mirroring `createApiClient`,
holding the same `AuthState` shape (`user`, `accessToken`, `refreshToken`, `setTokens`,
`setAuth`, `updateUser`, `logout`) **plus** a new `authHydrated: boolean` and a `hydrate()`
that awaits `storage.getItem(REFRESH_KEY)` then flips `authHydrated = true`. `getAuthStore()`
lets core hooks (e.g. `useMe`) read the store without importing a concrete instance.

**`TokenStore` / `AuthStorage` interfaces** — the injected adapters, async-capable so mobile's
SecureStore fits without an interface change:

```ts
interface AuthStorage {                         // persistence adapter
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}
interface TokenStore {                           // what the client needs
  getAccessToken(): string | null
  getRefreshToken(): string | null
  setTokens(access: string, refresh: string): void
  clear(): void
}
```

Web injects a localStorage `AuthStorage` (key `hc_rt`, preserving today's behavior) and derives
its `TokenStore` from the instantiated auth store. Because localStorage is synchronous, web's
`hydrate()` resolves immediately and `authHydrated` is effectively true on first paint — the
flag only becomes observable latency on mobile.

## Scope

- `packages/core/package.json` (`name:"core"`, `type:"module"`, `exports` subpaths →
  `./src/**/*.ts`; `peerDependencies` `react` + `@tanstack/react-query`; `dependencies`
  `zod`/`axios`/`zustand`), `packages/core/tsconfig.json` (extends `../../tsconfig.base.json`,
  `noEmit:true`, `include:["src"]`, `"build":"tsc -b"` script — turbo-compatible, emits no dist).
- `apps/web/package.json` adds `"core":"workspace:*"`.
- `git mv` of `types/*`, `api/modules/*`, the 13 feature `hooks/*` folders, `schemas/*`,
  `lib/recurrence.ts`, `lib/queryClient.ts`, and the RBAC/pagination constants into core.
- Core factories: `createApiClient` + `TokenStore`/`AuthStorage` + `createAuthStore` +
  `setApiClient`/`getApiClient` + `getAuthStore`.
- Web thin wrappers: rewrite `api/client.ts` + `store/auth.store.ts`; `App.tsx` uses core's
  `queryClient` factory; `main.tsx`/boot wires `setApiClient`.
- `useMe` split (pure query hook in core; dark-mode DOM effect consolidated into `AuthBootstrap`).
- Auth hydration redesign: `authHydrated` tri-state; `AuthBootstrap` gates on it.
- deviceId support: `deviceId`/`deviceName`/`platform` on `LoginRequest`/`RefreshRequest`/
  `SignupRequest`; injected `deviceIdProvider`; web UUID generation persisted in localStorage;
  threaded through `authApi.login`/`refresh` + the client's internal refresh.
- Enum fix in `patient.types.ts` (`Cancelled`→`Paused`; `Note/Alert/Observation`→`Route/Medical/Simple`).
- `NAV_ITEMS`/`NavItem` → new `apps/web/src/lib/nav.ts`; `Sidebar.tsx` split import.
- Import-path migration of ~70 web files consuming the moved layers (~90% pure prefix swaps).

## Out of scope

- Any change to `pages/**`, `components/**`, `layouts/**`, `styles/**` beyond mechanical
  import-path edits (and the `AuthBootstrap`/`Sidebar`/`WorkRouteCalendar`/`App` touch-points).
- The Expo `apps/mobile` app and its SecureStore adapter / navigation-reset `onRefreshFail`
  → **mobile-app-foundation** (this change only makes the seams injectable).
- Adapting file uploads' browser `File` type for RN's `{uri,name,type}` FormData shape → left
  as a web-only concrete type here; flagged as a mobile adaptation point.
- Barrel `index.ts` files per hook folder (see Open question #3 — file-level exports chosen).
- Building an emitted `dist/` for core (Option B rejected — no benefit for a private package).
- Adding a test runner, Prettier, or CI config.
- Fixing the 9 pre-existing convention-drift files' architecture (pages importing api modules
  directly) — they still get mechanical import edits, but the boundary violation is not fixed here.

## Open questions (positions taken)

| # | Question | Position |
|---|---|---|
| 1 | `useMe.ts` DOM side effect (dark-mode `document.documentElement.classList`) | **SPLIT it out.** The dark-mode DOM toggle becomes a web-only effect, consolidated with the duplicate already in `AuthBootstrap.tsx` (line 28). `useMe` moves to core as a pure query hook reading `getAuthStore()`. Removes the last DOM dependency from the hooks layer. |
| 2 | Auth-store hydration: sync `localStorage` read → async `AuthStorage` | **Introduce a tri-state `authHydrated` flag** (default `false`, set `true` once `tokenStore.getRefreshToken()` resolves). `AuthBootstrap` gates readiness on `authHydrated` instead of the current sync `!!accessToken \|\| !refreshToken`. **HIGHEST-RISK ITEM — it changes existing web runtime behavior.** For web (synchronous localStorage) the hydrate resolves immediately so first-paint behavior is preserved; the flag exists so mobile's async storage can't be misread as "logged out." |
| 3 | `core/hooks/*` import surface: barrel-per-folder vs file-level | **File-level exports** — `"./hooks/*":"./src/hooks/*.ts"`, imported `core/hooks/patients/usePatients`. Zero new barrel files, pure prefix-swap migration for the ~37 hook import sites. (Alternative: a barrel `index.ts` per folder — rejected: it adds 13 new files and a second thing to maintain for no consumer benefit in a source-consumed package.) |
| 4 | deviceId / device-bound-session client support | **INCLUDE as net-new in this change.** API change #1 (device-bound-sessions, already deployed server-side) now REQUIRES `deviceId` on login/refresh/signup. Add `deviceId`/`deviceName`/`platform` to `LoginRequest`/`RefreshRequest`/`SignupRequest`; `createApiClient` takes an injected `deviceIdProvider`; web generates a UUID persisted in localStorage. Thread through `authApi.login`/`refresh` and the client's internal refresh POST. **Deploy coordination: web must ship deviceId support before/with the API's device-bound-sessions cutover.** |
| 5 | Enum drift in `patient.types.ts` | **Fold into the `patient.types.ts` move.** Correct `TreatmentStatus` (`Cancelled`→`Paused`) and `CommentType` (`Note/Alert/Observation`→`Route/Medical/Simple`) to the API source-of-truth. `grep` confirms nothing outside `patient.types.ts` imports these by name (`TreatmentsTab`/`CommentsTab` already use the correct runtime strings) → compile-only, zero runtime blast radius. |
| 6 | File type for uploads (browser `File` in `attachments`) | **Leave `File` as-is in core** (web-only concrete type; YAGNI). Flag as a mobile-change adaptation point — RN's `FormData.append` takes `{uri,name,type}`, resolved in mobile-app-foundation, not here. |
| 7 | Package shape: JIT/source vs built dist | **Option A (JIT / source-consumed).** `exports` map → `.ts` source, no build step, `noEmit:true` + a `tsc -b` typecheck script. Zero Vite HMR latency, no dual-package hazard, Metro-compatible (exports default-on ≥ RN 0.79). Option B (dist) rejected — extra build in the loop + stale-dist risk for a private package. |

## Affected files / packages

| Area | Impact | Detail |
|---|---|---|
| `packages/core/package.json` | New | `name:"core"`, `type:"module"`, `exports` subpaths, peer/deps split |
| `packages/core/tsconfig.json` | New | Extends base, `noEmit:true`, `build:"tsc -b"` |
| `packages/core/src/types/*` | Moved (git mv) | 15 files; `patient.types.ts` also gets the enum fix |
| `packages/core/src/api/modules/*` | Moved + 1-line edit | 15 modules; `apiClient` import → `getApiClient()` |
| `packages/core/src/api/http/createApiClient.ts` + `setApiClient`/`getApiClient` | New | Lifted from web `api/client.ts` + `deviceIdProvider`/`onRefreshFail` seams |
| `packages/core/src/auth/createAuthStore.ts` + `TokenStore`/`AuthStorage`/`getAuthStore` | New | Zustand factory + injected storage interfaces + `authHydrated` |
| `packages/core/src/hooks/*` | Moved (git mv) | 13 feature folders; `useMe` becomes a pure query hook |
| `packages/core/src/schemas/*` | Moved (git mv) | 4 Zod schema files |
| `packages/core/src/lib/{recurrence,queryClient,constants}.ts` | Moved / split | `constants` keeps only RBAC + pagination |
| `apps/web/package.json` | Modified | Add `"core":"workspace:*"` |
| `apps/web/src/api/client.ts` | Rewritten (thin) | Calls `createApiClient` + localStorage `TokenStore` + `window.location` `onRefreshFail` + `setApiClient` |
| `apps/web/src/store/auth.store.ts` | Rewritten (thin) | Instantiates `createAuthStore` with localStorage `AuthStorage` |
| `apps/web/src/components/guards/AuthBootstrap.tsx` | Modified | `authHydrated` gate + owns consolidated dark-mode effect |
| `apps/web/src/hooks/auth/useMe.ts` consumers | Modified | Dark-mode effect removed; import path → `core/hooks/auth/useMe` |
| `apps/web/src/lib/nav.ts` | New | `NavItem` + `NAV_ITEMS` new home |
| `apps/web/src/components/shared/Sidebar.tsx` | Modified | Split import: `RoleName` from core, `NAV_ITEMS` from `@/lib/nav` |
| `apps/web/src/types/auth.types.ts` (moved) | Modified | +`deviceId`/`deviceName`/`platform` on Login/Refresh/Signup requests |
| ~70 web importer files | Modified | Import-prefix swap `@/{types,api/modules,hooks,schemas}/…` → `core/…` (~90% mechanical) |
| `apps/web/src/hooks/utils/useOnClickOutside.ts`, `use-resize-observer.ts` | Unchanged | DOM-only hooks stay in web |
| root `pnpm-lock.yaml` | Regenerated | Excluded from review budget |

## Delivery plan (chained PRs)

The full change is well over the 400-line human-review budget (~70 importer files + new
factories + hydration redesign), so it ships as ~4 ordered, build-green slices. `git mv`
renames and lockfile churn are **excluded** from the 400-line budget; each PR is one
deliverable work unit. `sdd-tasks` finalizes the exact split.

| PR | Scope | Verify |
|---|---|---|
| **PR1 — Core foundation + abstraction** | `packages/core` package.json/tsconfig/exports; `createApiClient` + `TokenStore`/`AuthStorage` + `createAuthStore` + `setApiClient`/`getApiClient`/`getAuthStore`; `git mv` `types/*` (+ enum fix) + `lib/recurrence`/`queryClient` + RBAC/pagination constants; rewire web's thin `api/client.ts` + `auth.store.ts` + `App.tsx` queryClient usage to consume core; add `"core":"workspace:*"`. | `pnpm --filter core build` + `pnpm --filter web build` + `lint` green |
| **PR2 — api modules** | `git mv api/modules/*` (15) to core, one-line `getApiClient()` import swap each; migrate web's ~24 importers (incl. the 9 convention-drift files). | `pnpm --filter web build` + `lint` green |
| **PR3 — hooks (+ hydration redesign)** | `git mv` the 13 feature hook folders to core; the `useMe` split; the `authHydrated` hydration redesign in web's `AuthBootstrap`; migrate web's ~22 hook importers. **Contains the highest-risk item (Open question #2).** | `pnpm --filter web build` + `lint` + manual reload/logged-out smoke |
| **PR4 — schemas + deviceId + cleanup** | `git mv schemas/*` + migrate ~8 importers; add deviceId support end-to-end; `NAV_ITEMS` → `apps/web/src/lib/nav.ts` + `Sidebar.tsx` split import; final `pnpm -w build`. **deviceId lands last so it can be coordinated with the API device-bound-sessions cutover.** | `pnpm -w build` green (final gate) |

Commits follow conventional format (`feat/refactor(core): … (PRn)`), one work unit per PR,
≤ 400 reviewable lines each (chained-pr strategy; renames excluded).

## Rollback plan

Fully reversible — the change is a history-preserving move plus additive package config and
thin adapters:

- `git mv` is reversible; revert the `feat/core-extraction` branch (or any single chained PR,
  since each is independently build-green) to restore the prior layout with history intact.
- `pnpm install` regenerates `node_modules` symlinks and the lockfile from the reverted
  `package.json` files — no state to migrate, no data loss.
- The web thin wrappers (`api/client.ts`, `auth.store.ts`) can be reverted to their inlined
  form independently of the core package existing.
- The only behavior-changing item is the `authHydrated` hydration redesign (PR3); reverting
  PR3 restores the sync `!!accessToken \|\| !refreshToken` readiness check verbatim.
- **deviceId caveat:** if the API device-bound-sessions cutover has shipped, rolling back PR4
  removes `deviceId` from auth requests and would break login/refresh against that API — so
  PR4's rollback is coupled to the API deploy, not free. Roll back the API first, or keep PR4.

## Dependencies / preconditions

- Depends on **monorepo-workspace-bootstrap** (change #2 — done): the `apps/web` + empty
  `packages/core` workspace must exist.
- The apply phase (Bash-capable) MUST run `git status` first and use `git mv` for every move
  (exploration + propose had no Bash access — no git state was inspected).
- **Blocks** the mobile app (`apps/mobile`) — it consumes the extracted `packages/core`.
- **deviceId deploy coordination** with `housecenter-api` device-bound-sessions (API change #1).
