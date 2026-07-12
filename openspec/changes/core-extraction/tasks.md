# Tasks: Core Extraction

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated reviewable lines (excludes `git mv` renames + lockfile churn) | ~800-970 across the full change |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 4 PRs — one per phase below |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

**Basis:** New abstraction code — `createApiClient` (~55 lines), `createAuthStore` (~30), two
registries (~20), `TokenStore`/`AuthStorage` interfaces (~15), `package.json`/`tsconfig.json`
(~40) — plus rewritten thin `api/client.ts`/`auth.store.ts`/`bootstrap.ts` (~70) and
`App.tsx`/`Sidebar.tsx` edits (~20) sizes **PR1 at ~350-420 lines**, the heaviest slice, right at
budget. **PR2** is ~15 one-line `getApiClient()` swaps + ~24 import-prefix edits (~120-150
lines) — lightest, pure mechanical (the 15 `git mv`s are renames, discounted). **PR3**'s 13
hook-folder moves are also discounted renames, but the `useMe` split (~30) + `authHydrated`
tri-state redesign in `auth.store.ts`/`AuthBootstrap.tsx` (~90) + ~22 importer edits (~60) lands
~180-220 lines — moderate size but **highest risk**, since it changes runtime auth-gating
behavior (design D5), not because of line count. **PR4**'s deviceId threading (~70) + `nav.ts`
(~40) + ~8 schema importer edits (~20) is ~150-180 lines. The summed total (~800-970 reviewable
lines) is well over the single-PR 400-line budget, confirming the 4-way split already staged in
`design.md`'s migration sequence; PR1 and PR3 sit closest to the ceiling, PR2 is lightest.

## Phase 1: Core foundation + abstraction — PR1 (~350-420 lines)
- [ ] 1.1 `packages/core/package.json` — exports map (`./types/*`, `./api/http/*`, `./api/modules/*`, `./auth/*`, `./hooks/*`, `./schemas/*`, `./lib/*` → `./src/**/*.ts`); peerDeps `react`/`@tanstack/react-query`; deps `axios`/`zod`/`zustand` (R1)
- [ ] 1.2 `packages/core/tsconfig.json` — extends `../../tsconfig.base.json`, `noEmit:true`, `"build":"tsc -b"` (R1)
- [ ] 1.3 `apps/web/package.json` — add `"core":"workspace:*"`; run `pnpm install` to re-link (R1)
- [ ] 1.4 `core/api/http/createApiClient.ts` — lift Bearer interceptor + 401 single-flight refresh queue verbatim from `apps/web/src/api/client.ts`; params `baseURL`, `tokenStore`, `deviceIdProvider`, `onRefreshFail` (R3)
- [ ] 1.5 `core/api/http/registry.ts` — `setApiClient`/`getApiClient` module-scope indirection (R4)
- [ ] 1.6 `core/auth/storage.ts` — `TokenStore` + `AuthStorage` interfaces, async-capable (R5)
- [ ] 1.7 `core/auth/createAuthStore.ts` — Zustand factory; sync-vs-Promise best-effort hydrate branch at init (R5, R6)
- [ ] 1.8 `core/auth/registry.ts` — `setAuthStore`/`getAuthStore` (R5)
- [ ] 1.9 `git mv apps/web/src/types/*.ts` → `packages/core/src/types/` (15 files); fix `patient.types.ts` `TreatmentStatus`/`CommentType` enums (R2, R8)
- [ ] 1.10 `git mv lib/recurrence.ts`, `lib/queryClient.ts` → `core/src/lib/`; split `lib/constants.ts` — RBAC/pagination constants to `core/src/lib/constants.ts` (R2)
- [ ] 1.11 `apps/web/src/lib/nav.ts` (new) — `NavItem` + `NAV_ITEMS` moved out of `constants.ts` (R2)
- [ ] 1.12 Rewrite `apps/web/src/api/client.ts` — thin: `createApiClient` + localStorage `TokenStore` adapter + localStorage `deviceIdProvider` + `setApiClient` (R3, R4, R9)
- [ ] 1.13 Rewrite `apps/web/src/store/auth.store.ts` — thin: `createAuthStore(localStorage AuthStorage)` + `setAuthStore` (R5)
- [ ] 1.14 `apps/web/src/bootstrap.ts` (new) — imports `auth.store` then `api/client` (order guarantees `setAuthStore` before `setApiClient`); add `import '@/bootstrap'` as the first line of `main.tsx` (R1, R4, R5)
- [ ] 1.15 `apps/web/src/App.tsx` — use `core/lib/queryClient` + `core/lib/constants` (R2)
- [ ] 1.16 `apps/web/src/components/shared/Sidebar.tsx` — split import: `RoleName` from core, `NAV_ITEMS` from `@/lib/nav` (R2)
- [ ] 1.17 Check `vite.config.ts` dev pre-bundling; add `optimizeDeps.exclude:['core']` if `pnpm --filter web dev` pre-bundles it (D1 risk watch)

**PR1 done when:** `pnpm install` + `pnpm --filter core build` + `pnpm --filter web build` + `pnpm --filter web lint` all green; app boots and logs in identically.

## Phase 2: api modules — PR2 (~120-150 lines)
- [ ] 2.1 `git mv apps/web/src/api/modules/*.api.ts` (15 files) → `packages/core/src/api/modules/` (R2)
- [ ] 2.2 Swap each moved module's import `apiClient` from `'@/api/client'` → `getApiClient` from `'core/api/http/registry'`; update call sites to `getApiClient().<verb>(...)` (R4)
- [ ] 2.3 Migrate ~24 web importers `@/api/modules/x` → `core/api/modules/x` (incl. the 9 convention-drift files) (R2, R10)

**PR2 done when:** `pnpm --filter web build` + `lint` green; no `@/api/modules` imports remain; `grep -rln "from '@/api/client'" packages/core/src/api/modules` is empty.

## Phase 3: hooks + hydration redesign — PR3 (~180-220 lines, highest risk)
- [ ] 3.1 `git mv` the 13 feature hook folders `apps/web/src/hooks/<feature>/*` → `packages/core/src/hooks/<feature>/` (R2)
- [ ] 3.2 Split `useMe`: `core/src/hooks/auth/useMe.ts` becomes a pure query hook reading `getAuthStore()`, no DOM reference (R6, R7)
- [ ] 3.3 Consolidate the dark-mode DOM effect into `apps/web/src/components/guards/AuthBootstrap.tsx` (single effect keyed on `user?.darkMode`) (R7)
- [ ] 3.4 Finalize `authHydrated` tri-state gate: `AuthBootstrap.tsx` renders on `authHydrated` instead of `!!accessToken || !refreshToken` (R6)
- [ ] 3.5 Migrate ~22 hook importers `@/hooks/<feature>/x` → `core/hooks/<feature>/x` (R2, R10)
- [ ] 3.6 Manual smoke: hard reload while authenticated → silent refresh, no `/login` bounce (R6, R10)
- [ ] 3.7 Manual smoke: logged-out first paint → no spinner flash, straight to `/login` (R6, R10)

**PR3 done when:** build + lint green, both manual smokes pass, `grep -rl "document\.\|window\." packages/core/src/hooks` is empty.

## Phase 4: schemas + deviceId + cleanup — PR4 (~150-180 lines)
- [ ] 4.1 `git mv apps/web/src/schemas/*.ts` (4 files) → `packages/core/src/schemas/` (R2)
- [ ] 4.2 Migrate ~8 web importers `@/schemas/x` → `core/schemas/x` (R2, R10)
- [ ] 4.3 `core/types/auth.types.ts` — add required `deviceId` + optional `deviceName`/`platform` to `LoginRequest`, `RefreshRequest`, `SignupRequest` (R9)
- [ ] 4.4 `apps/web/src/lib/deviceId.ts` (new) — `getOrCreateDeviceId()`: UUID persisted in `localStorage` (R9)
- [ ] 4.5 Thread `deviceIdProvider: getOrCreateDeviceId` through `apps/web/src/api/client.ts`'s `createApiClient` config (R9)
- [ ] 4.6 Update login/signup callers + `AuthBootstrap`'s `authApi.refresh` call to spread `deviceId` (R9)
- [ ] 4.7 Final gate: `pnpm -w build` (R10)

**PR4 done when:** `pnpm -w build` green; `grep -n "deviceId" packages/core/src/types/auth.types.ts` shows it on all three request types; no `@/schemas` imports remain.
