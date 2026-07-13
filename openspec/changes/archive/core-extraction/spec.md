# SDD Spec — Core Extraction

## Requirements

### R1 — Source-Consumed Core Package

`packages/core` MUST ship as a JIT (source-consumed) workspace package: `package.json` `exports` map points every subpath at `./src/**/*.ts` (no `dist/`, no build step). `apps/web/package.json` MUST declare `"core": "workspace:*"`. `packages/core/tsconfig.json` MUST set `noEmit: true` and a `build` script of `tsc -b` used as the typecheck gate.

### R2 — Extraction Boundary

The system MUST move `types/*.ts` (15 files), `api/modules/*.api.ts` (15 files), the 13 feature `hooks/<feature>/*` folders, `schemas/*.ts` (4 files), and `lib/{recurrence,queryClient}.ts` + the RBAC/pagination slice of `lib/constants.ts` into `packages/core`. DOM-only hooks (`useOnClickOutside`, `use-resize-observer`), `NAV_ITEMS`/`NavItem`, and the concrete `api/client.ts`/`store/auth.store.ts` instances MUST remain in `apps/web`.

### R3 — `createApiClient` Contract

`createApiClient(config)` MUST attach the Bearer token via a request interceptor reading `tokenStore.getAccessToken()`, MUST implement a single-flight 401 refresh-and-retry queue (concurrent 401s trigger exactly one refresh call; other requests queue and retry after it resolves), MUST send `deviceIdProvider()`'s value on the internal refresh POST, and MUST call `onRefreshFail()` — never `window.location` directly — when refresh fails.

### R4 — Client Indirection

The system MUST expose `setApiClient(client)` / `getApiClient()` at module scope. All 15 api modules MUST reference the client only through `getApiClient()`; call sites (method + args) MUST NOT change from their current form.

### R5 — `createAuthStore` Contract

`createAuthStore({ storage: AuthStorage })` MUST produce a Zustand store carrying `user`, `accessToken`, `refreshToken`, `setTokens`, `setAuth`, `updateUser`, `logout`, plus `authHydrated: boolean` and `hydrate()`. `getAuthStore()` MUST let core hooks read the store without importing a concrete instance. `AuthStorage`/`TokenStore` MUST be async-capable (`Promise`-returning methods allowed).

### R6 — Auth Hydration Gate

Auth readiness MUST be derived from the tri-state `authHydrated` flag (`false` until `hydrate()` resolves), not from the synchronous `!!accessToken || !refreshToken` check. `AuthBootstrap` MUST gate rendering on `authHydrated`. For web's synchronous `localStorage` adapter, `hydrate()` MUST resolve before first paint so existing behavior is unchanged.

### R7 — `useMe` Pure Query Hook

`useMe` MUST move to core as a pure TanStack Query hook with no DOM references and no import of a concrete store instance (reads via `getAuthStore()`). The dark-mode `document.documentElement.classList` side effect MUST live only in web's `AuthBootstrap`, with the pre-existing duplicate removed.

### R8 — Enum Correctness

`patient.types.ts` MUST export `TreatmentStatus = 'Active' | 'Completed' | 'Paused'` and `CommentType = 'Route' | 'Medical' | 'Simple'`, matching the API source of truth. No other file in `packages/core` or `apps/web` MUST declare or import the superseded values (`Cancelled`, `Note`, `Alert`, `Observation`) as enum members.

### R9 — Device-Bound Session Support

`LoginRequest`, `RefreshRequest`, and `SignupRequest` MUST carry a required `deviceId: string` plus optional `deviceName`/`platform`. `createApiClient` MUST accept a `deviceIdProvider: () => string`. `apps/web` MUST supply a UUID generated once and persisted in `localStorage`, threaded through `authApi.login`/`refresh` and the client's internal refresh call.

### R10 — Web Behavior Preservation & Build Gates

Existing web runtime behavior (auth flow, routing, first paint) MUST be unchanged except for the `authHydrated` gate's internal mechanism (R6). `pnpm --filter core build`, `pnpm --filter web build`, and `pnpm --filter web lint` MUST pass after every migration slice; `pnpm -w build` MUST pass as the final gate.

## Scenarios

#### Scenario: core-package-typechecks
- GIVEN `packages/core/src` contains the moved types/api/hooks/schemas/lib
- WHEN `pnpm --filter core build` runs
- THEN it exits 0 with no `tsc` errors
- Traces: R1

#### Scenario: workspace-graph-has-core-dep
- GIVEN `apps/web/package.json` is inspected
- WHEN grepped for `"core"`
- THEN it shows `"core": "workspace:*"` in dependencies
- Traces: R1

#### Scenario: web-imports-core
- GIVEN a web file needing a moved type
- WHEN it writes `import { PatientResponse } from 'core/types/patient.types'`
- THEN `pnpm --filter web build` compiles it with no resolution error
- AND `grep -rl "document\.\|window\." packages/core/src/hooks` returns zero matches (DOM-only hooks excluded)
- Traces: R2

#### Scenario: api-module-uses-getApiClient
- GIVEN a moved api module (e.g. `patients.api.ts`)
- WHEN its transport call executes
- THEN it calls `getApiClient().get(...)` (or `.post`/`.patch`/`.delete`) rather than a concrete `apiClient` import
- AND the method name and arguments are unchanged from pre-move behavior
- Traces: R4

#### Scenario: client-401-refresh-queue
- GIVEN two authenticated requests are in flight and both receive `401`
- WHEN the response interceptor handles them
- THEN exactly one `/auth/refresh` call is made
- AND both original requests are retried with the new access token after refresh resolves
- Traces: R3

#### Scenario: refresh-failure-calls-onRefreshFail
- GIVEN the refresh call itself returns a non-2xx response
- WHEN the client's refresh handler processes the failure
- THEN it invokes the injected `onRefreshFail()` callback
- AND it does not reference `window.location` directly inside `packages/core`
- Traces: R3

#### Scenario: auth-store-indirection
- GIVEN a core hook needs auth state (e.g. `useMe`)
- WHEN it calls `getAuthStore()`
- THEN it reads store state without importing a concrete Zustand instance
- Traces: R5

#### Scenario: auth-hydrated-gate
- GIVEN the app boots with `authHydrated: false`
- WHEN `AuthBootstrap` renders before `hydrate()` resolves
- THEN it shows a loading/splash state, not a route
- AND once `hydrate()` resolves (synchronously-resolved for web's localStorage adapter), `authHydrated` becomes `true` and routing proceeds with first-paint behavior unchanged
- Traces: R6

#### Scenario: use-me-pure-hook
- GIVEN `core/hooks/auth/useMe.ts` after the move
- WHEN its source is inspected
- THEN it contains no `document.` reference
- AND the dark-mode toggle exists only once, inside `apps/web/src/components/guards/AuthBootstrap.tsx`
- Traces: R7

#### Scenario: enum-corrected
- GIVEN `packages/core/src/types/patient.types.ts` after the move
- WHEN its `TreatmentStatus` and `CommentType` exports are inspected
- THEN they equal `'Active' | 'Completed' | 'Paused'` and `'Route' | 'Medical' | 'Simple'` respectively
- AND `grep -rn "Cancelled\b" packages/core/src/types packages/core/src/schemas apps/web/src` returns zero matches as an enum member
- Traces: R8

#### Scenario: deviceId-sent
- GIVEN a user logs in or a token refresh occurs
- WHEN the request payload is built
- THEN it includes `deviceId` (from `deviceIdProvider()`) alongside credentials/refresh token
- AND `grep -n "deviceId" packages/core/src/types/auth.types.ts` shows it on `LoginRequest`, `RefreshRequest`, and `SignupRequest`
- Traces: R9

#### Scenario: web-builds-after-each-slice
- GIVEN any of PR1–PR4 has landed
- WHEN `pnpm --filter web build` and `pnpm --filter web lint` run
- THEN both exit 0
- AND after PR4, `pnpm -w build` also exits 0
- Traces: R10

## Package & module contracts

**`packages/core/package.json` exports map:**
```json
{
  "./types/*": "./src/types/*.ts",
  "./api/*": "./src/api/*.ts",
  "./hooks/*": "./src/hooks/*.ts",
  "./schemas/*": "./src/schemas/*.ts",
  "./lib/*": "./src/lib/*.ts"
}
```

**`createApiClient`:**
```ts
createApiClient({
  baseURL: string,
  tokenStore: TokenStore,
  deviceIdProvider: () => string,
  onRefreshFail: () => void,
}): AxiosInstance
```

**`setApiClient` / `getApiClient` / `getAuthStore`:**
```ts
setApiClient(client: AxiosInstance): void
getApiClient(): AxiosInstance
getAuthStore(): AuthStoreInstance   // Zustand store returned by createAuthStore
```

**`createAuthStore`:**
```ts
createAuthStore({ storage: AuthStorage }): AuthStoreInstance
// AuthStoreInstance state: user, accessToken, refreshToken, setTokens, setAuth,
// updateUser, logout, authHydrated: boolean, hydrate(): Promise<void>
```

**`TokenStore` / `AuthStorage` interfaces:**
```ts
interface AuthStorage {
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}
interface TokenStore {
  getAccessToken(): string | null
  getRefreshToken(): string | null
  setTokens(access: string, refresh: string): void
  clear(): void
}
```

**Corrected enums (`patient.types.ts`):**
```ts
type TreatmentStatus = 'Active' | 'Completed' | 'Paused'
type CommentType = 'Route' | 'Medical' | 'Simple'
```

## Import-surface contract

| Layer | Import form | Example |
|---|---|---|
| Types | `core/types/<feature>.types` | `core/types/patient.types` |
| Api modules | `core/api/modules/<feature>.api` | `core/api/modules/patients.api` |
| Api client (web wiring only) | `core/api/http/createApiClient`, `core/api/http/apiClientRegistry` | — |
| Feature hooks | `core/hooks/<feature>/<hook>` | `core/hooks/patients/usePatients` |
| Schemas | `core/schemas/<feature>.schema` | `core/schemas/patient.schema` |
| Lib | `core/lib/<name>` | `core/lib/recurrence`, `core/lib/queryClient`, `core/lib/constants` |

File-level exports only — no barrel `index.ts` per hook folder (Open question #3). DOM-only hooks (`useOnClickOutside`, `use-resize-observer`), `NAV_ITEMS`/`NavItem`, and the concrete `api/client.ts`/`store/auth.store.ts` are never imported via the `core/*` surface — they stay under `@/`.

## Verification rules

| Check | Command | Expected |
|---|---|---|
| Core typechecks | `pnpm --filter core build` | exit 0, no `tsc` errors |
| Web typechecks + bundles | `pnpm --filter web build` | exit 0 |
| Web lints clean | `pnpm --filter web lint` | exit 0, no errors |
| Full workspace gate (PR4) | `pnpm -w build` | exit 0 |
| No direct `window.location` in core client | `grep -rn "window.location" packages/core/src/api` | zero matches |
| No superseded enum values | `grep -rn "Cancelled\|'Note'\|'Alert'\|'Observation'" packages/core/src/types/patient.types.ts` | zero matches |
| deviceId on auth requests | `grep -n "deviceId" packages/core/src/types/auth.types.ts` | present on Login/Refresh/Signup request types |
| Workspace dep declared | `grep -n '"core"' apps/web/package.json` | shows `"workspace:*"` |
| DOM-only hooks excluded from core | `grep -rl "document\.\|window\." packages/core/src/hooks` | zero matches |
| No stray `apiClient` singleton import in api modules | `grep -rln "from '@/api/client'\|from 'core/api/client'" packages/core/src/api/modules` | zero matches (must use `getApiClient()`) |
