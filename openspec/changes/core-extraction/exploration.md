# Exploration — `core-extraction`: Extracting `packages/core` from `apps/web`

## Summary

Extracting the four-layer, UI-agnostic stack (`types/*.ts`, `api/modules/*.api.ts`, `hooks/**` query hooks, `schemas/*.ts`, plus three `lib/` files) out of `apps/web/src` into `packages/core` is straightforward for ~90% of the surface — these layers already have almost no cross-layer leaks — but three things need real design work, not just `git mv`: (1) `useMe.ts` has a genuine DOM side effect and a concrete-store dependency that block a clean move as-is; (2) the auth store's synchronous `localStorage` read at Zustand-init time breaks once `AuthStorage` becomes async (SecureStore) — the readiness check needs a real hydration-flag rewrite; (3) device-bound sessions (deviceId on login/refresh) is **net-new work** layered onto this change, not pure extraction. The enum drift, by contrast, is a very low-risk fix: nothing outside `patient.types.ts` references `TreatmentStatus`/`CommentType`/`CommentStatus` by name, so correcting them is compile-only with no runtime blast radius. Recommend the Turborepo "Internal Packages" (JIT, source-consumed, no build step) shape for `packages/core`, confirmed compatible with Metro (package.json `exports` default-on since RN 0.79).

**Confidence: High** on the extraction inventory, the enum-fix blast radius, and the package-shape recommendation. **Medium** on the exact auth-store hydration redesign and the `core/hooks/*` import-surface shape (barrel-per-folder vs file-level exports) — both real architectural choices the proposal must pin down.

## Confirmed

**Extraction inventory (boundary drawn at folder/file level):**
- `apps/web/src/types/*.ts` (15 files) — zero internal imports (no `@/components|@/pages|@/store|@/api`). Clean move.
- `apps/web/src/api/modules/*.api.ts` (15 files incl. `auth.api.ts`) — every one imports `apiClient` from `@/api/client` and nothing else app-specific (`grep -rl "from '@/api/client'"` → exactly these 15). Mechanical `setApiClient`/`getApiClient` swap, zero logic churn.
- `apps/web/src/schemas/*.ts` (4 files: clinic, collaborator, patient, workroute) — pure Zod, zero internal imports. Only 4 of ~15 features have a dedicated schema file.
- `apps/web/src/lib/recurrence.ts` — pure `expandOccurrences`, one import (`workroute.types`), no `Date.now()`/`window`. 1 consumer (`WorkRouteCalendar.tsx`).
- `apps/web/src/lib/queryClient.ts` — trivial `QueryClient` factory, no app imports. 1 consumer (`App.tsx`).
- `apps/web/src/lib/constants.ts` — NEEDS SPLITTING: `DEFAULT_PAGE_SIZE`/`DROPDOWN_PAGE_SIZE`/`ROLE_NAMES`/`RoleName`/`ALL_ROLES`/`ADMIN_ABOVE`/`STAFF_ONLY` → core; `NavItem`/`NAV_ITEMS` (route paths + icon-name strings tied to `Sidebar.tsx`) → stays in web (new home, e.g. `apps/web/src/lib/nav.ts`).

**Client + auth abstraction — concrete shapes:**
- `apps/web/src/api/client.ts` (72 lines): single axios instance; request interceptor reads `useAuthStore.getState().accessToken`; response interceptor = 401-detect + single-flight refresh queue (`isRefreshing`/`pendingQueue`/`processQueue`) + `createApiError`. Maps to `createApiClient({ baseURL, tokenStore, onRefreshFail })` — refresh-queue logic 100% portable except:
  - `window.location.href = '/login'` on refresh failure (line 56) → injected `onRefreshFail` callback (web: `window.location`; mobile: navigation reset).
  - Direct `useAuthStore` read/write → `tokenStore.getRefreshToken()`/`setTokens()`/`clear()`.
- `apps/web/src/store/auth.store.ts` (39 lines): Zustand, `refreshToken: localStorage.getItem(REFRESH_KEY)` read **synchronously at store-creation** (line 24). Crux of the sync→async problem (see Discrepancies).
- All 15 api modules import `apiClient` identically → a `setApiClient`/`getApiClient` indirection needs editing exactly one import line per module, zero call-site churn.
- No existing `deviceId` handling (`grep -r deviceId apps/web/src` → none). `LoginRequest`/`RefreshRequest`/`TokenPairResponse` in `types/auth.types.ts` have no `deviceId` today. Net-new.

**Enum drift — confirmed and scoped:**
- `apps/web/src/types/patient.types.ts` lines 3–5 declare `TreatmentStatus='Active'|'Completed'|'Cancelled'` and `CommentType='Note'|'Alert'|'Observation'` — both WRONG per the API (`Active/Completed/Paused`, `Route/Medical/Simple`).
- `grep -rn "import.*(TreatmentStatus|CommentType|CommentStatus)"` across `apps/web/src` → **zero matches**. Used only inside `patient.types.ts` to type fields.
- `TreatmentsTab.tsx`/`CommentsTab.tsx` already use correct runtime values, decoupled from the wrong alias (`z.enum(['Route','Medical','Simple'])`; `STATUS_COLOR: Record<string,ChipColor>={Active,Completed,Paused}`; `mutationFn:(status:string)`). Fixing the aliases is a **pure type-correctness fix, zero runtime impact, ~zero compile impact**. (`Note|Alert|Observation` elsewhere = MUI `<Alert>`, unrelated.)

**Package shape — Metro compat confirmed:** Package Exports (`exports` field) is default-on in Metro since RN 0.79 (opt-out, not opt-in). De-risks the "JIT package with `exports` → `.ts` source" pattern for the later mobile change.

## Discrepancies / corrections

1. **"hooks/**" is too broad — exclude two files.** `apps/web/src/hooks/utils/useOnClickOutside.ts` (`document.addEventListener`) and `apps/web/src/hooks/use-resize-observer.ts` (`window.ResizeObserver`, `@react-types/shared`) are DOM-only UI hooks — STAY in web. Only the 13 feature folders (`hooks/<feature>/use<Feature>.ts` — patients [usePatients/useTreatments/useSessions], clinics, collaborators, invitations, roles, users, workroutes, consultations, notifications, attachments, reports, help, auth) are the TanStack Query layer that moves.

2. **`hooks/auth/useMe.ts` is not a clean move — real cross-layer leak.** In a `useEffect` it does `document.documentElement.classList.add/remove('dark-mode')` AND imports concrete `useAuthStore` from `@/store/auth.store`. Both must be resolved: the DOM manipulation has no RN equivalent → extract to a web-only side effect (an `onUserLoaded` callback, or move dark-mode into `AuthBootstrap.tsx`/a web wrapper consuming `useMe()` data); the store import needs the same `setAuthStore`/`getAuthStore` indirection as the api client. Note `AuthBootstrap.tsx` (stays in web) already does the same dark-mode toggle (line 28) — possible redundancy to consolidate.

3. **The auth store needs the same set/get indirection as the client** (not explicit in the plan). Both `useMe.ts` and `api/client.ts` import the concrete Zustand instance directly. Recommend a `createAuthStore({ storage: AuthStorage })` factory (mirroring `createApiClient`); each app instantiates once at boot (web→localStorage, later mobile→SecureStore); core hooks call `getAuthStore()`.

4. **Sync→async token store is a hydration-model change, not a wrapper.** `auth.store.ts` line 24 reads `localStorage.getItem` synchronously in the Zustand initializer; `AuthBootstrap.tsx`'s readiness (`useState(!!accessToken || !refreshToken)`) treats "no refresh token" as "ready immediately." With async `AuthStorage`, the refresh token is UNKNOWN at store-creation — you can't sync-distinguish "logged out" from "not checked yet." **Needs a tri-state `authHydrated` flag** (default false, flipped once `tokenStore.getRefreshToken()` resolves); `AuthBootstrap` gates on `authHydrated`, not `!refreshToken`. Concrete proposal decision — the single highest-risk item (changes existing web behavior).

5. **File uploads use browser `File` — flagged, not blocking.** `hooks/attachments/useAttachments.ts` + `api/modules/attachments.api.ts` use DOM `File`/`FormData.append(name, File)`. RN's `FormData.append` takes `{uri,name,type}`. Leave `File` as-is in core for this change (web-only concrete type; YAGNI); flag as a mobile-change adaptation point.

6. **Pre-existing convention drift widens the touched-file set.** `LoginPage.tsx`, `SignupPage.tsx`, `ResetPasswordPage.tsx`, `ForgotPasswordPage.tsx`, `SettingsPage.tsx`, `AttachmentThumbnail.tsx`, `AuthBootstrap.tsx`, `Topbar.tsx` (9 files) import `api/modules/*` directly, bypassing the hooks layer. No ESLint rule enforces the boundary (only the documented `grep -r apiClient src/pages` check, which these don't trip). They still need mechanical import-path edits during migration.

7. **`Sidebar.tsx` needs a split import** after `lib/constants.ts` divides: `RoleName` from core, `NAV_ITEMS`/`NavItem` from a new web-local module — a two-import rewrite, not a prefix swap.

## Additional considerations for the proposal

**Churn estimate (grepped):**

| Import pattern | Files | Occurrences |
|---|---|---|
| `from '@/types/...'` | 49 | 60 |
| `from '@/api/modules/...'` | 24 | 25 (9 bypass hooks) |
| `from '@/hooks/...'` | 22 | 37 |
| `from '@/schemas/...'` | 8 | 8 |
| `from '@/lib/constants'` | 23 | 24 (needs split) |
| `from '@/lib/recurrence'`/`queryClient` | 2 | 2 |
| **Union (types+api+hooks+schemas)** | **~67 distinct** | — |

~70 distinct files need an import-path edit; ~90% are pure specifier-prefix swaps (`@/types/patient.types` → `core/types/patient.types`) — scripted find-replace per slice, verified by `pnpm --filter web build` (`tsc -b` catches misses). Slice by **feature-vertical** (patients slice = patient types + patients/treatments api + patients/treatments/sessions hooks + patient schema in one PR), not by layer.

**`packages/core` shape — recommendation: Option A (JIT / source-consumed).**

| Approach | Pros | Cons |
|---|---|---|
| **A. JIT / source-consumed (rec.)** — `exports` map → `./src/**/*.ts`, no build step; `moduleResolution:"bundler"` (already in base) resolves it | Zero build latency (Vite HMR instant); no dual-package hazard; matches Turborepo "Internal Packages"; Metro exports default-on since RN 0.79 | web's `tsc -b` type-checks core transitively (a pro); no independent build artifact (not a goal — private pkg) |
| B. Built (dist) | "real npm package" boundary | extra build in the loop; stale-dist risk; more turbo wiring; no benefit for a private pkg |

Concrete Option-A shape:
- `packages/core/package.json`: `"name":"core"`, `"type":"module"`, `exports` subpaths per dir (`"./types/*":"./src/types/*.ts"`, `"./api/*"`, `"./schemas/*"`, `"./lib/*"`); `peerDependencies` for `react` + `@tanstack/react-query` (single-instance correctness); `dependencies` `zod`, `axios`, `zustand`.
- **OPEN QUESTION for propose:** `hooks/*` subpath shape. Barrel-per-folder (`src/hooks/patients/index.ts` re-exports; `"./hooks/*":"./src/hooks/*/index.ts"`; ~13 new barrels) vs file-level (`"./hooks/*":"./src/hooks/*.ts"`, imported `core/hooks/patients/usePatients` — pure prefix swap, zero new files). Decide explicitly; affects ~37 rewrites. (File-level is the lower-churn default.)
- `apps/web/package.json` MUST add `"core": "workspace:*"` (Turborepo derives its task graph + cache hashing from declared deps — without it, core edits won't invalidate web's build cache).
- `packages/core/tsconfig.json`: extends `../../tsconfig.base.json`, `noEmit:true`, `include:["src"]`; add a `"build":"tsc -b"` script matching web's turbo `build` task (produces no `dist/**` — harmless).
- Do NOT rename files during `git mv` (keep `.api.ts`/`.types.ts`/`.schema.ts`) — maximizes history-preservation, avoids rename risk on a large migration.

**Verification (no test runner):** `pnpm install` after `core/package.json` changes; `pnpm --filter core build` (typecheck-only) fast inner-loop; `pnpm --filter web build` + `lint` after each slice; `pnpm -w build` final gate. Add `pnpm --filter core build` to the verify checklist.

## Recommendation

Proceed with Option-A JIT package + vertical-slice migration (types → api → hooks → schemas per feature, ~4 chained PRs given ~70-file churn + 400-line budget). Before tasks, `sdd-propose` must resolve: (1) `useMe.ts` DOM-side-effect + concrete-store extraction (split dark-mode to web; design `createAuthStore`/`getAuthStore` alongside `createApiClient`/`getApiClient`); (2) auth-store hydration tri-state (`authHydrated` replacing the sync `!!accessToken || !refreshToken` check) — highest risk, changes web behavior; (3) `core/hooks/*` import-surface shape (barrel vs file-level); (4) scope deviceId/device-bound-session support as net-new (UUID gen + persistence via injected `deviceIdProvider`, threaded through `authApi.login`/`refresh` + the client's internal refresh) — the API change #1 now REQUIRES deviceId, so web must send it. Fold the enum fix into the `patient.types.ts` move (zero blast radius).
