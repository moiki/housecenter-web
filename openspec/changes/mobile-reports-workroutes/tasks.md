# Tasks: Mobile Reports & Work Routes

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | PR0 ~100-130; PR1a ~245-320; PR1b ~100-150; PR2 ~140-190 |
| 400-line budget risk | High for the ratified single-PR1 shape; Low-Medium once split |
| Chained PRs recommended | Yes |
| Suggested split | 4 PRs: PR0 [API] -> PR1a [MONO] -> PR1b [MONO] -> PR2 [MONO] |
| Delivery strategy | ask-on-risk (assumed default — not explicitly passed this invocation; flag in return) |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

**Basis:** the ratified 3-PR shape's combined PR1 (core wrapper + WorkRoutes list+detail +
Ruta del día + 3 nav rows + es.json) is ~352 lines by terse-sketch arithmetic (core 25 +
WorkRoutesList 75 + WorkRouteDetail 120 + RutaDelDia 90 + nav 20 + MoreScreen 15 + es.json 12),
but `mobile-consultations` PR2 — the closest precedent (new RN screens + styles + a picker) —
came in **63% over** its own terse-sketch estimate (253 -> 412 actual) once styles/imports were
added. Applying that same inflation risk to a 352-line estimate puts combined PR1 solidly over
400. **Recommendation: split PR1 into PR1a (core wrapper + Rutas de trabajo list+detail — the
two components that ship together since core additive is the first-core-touch regression gate)
and PR1b (Ruta del día alone, depends on PR1a's `useMyCollaboratorProfile()`)**, per design D-note
"if still >400, propose splitting WorkRoutes (list+detail) from Ruta del día into PR1a/PR1b."
Each of the 4 resulting PRs individually estimates well under 400 with buffer for the same
inflation factor. PR2 (Reportes) is unaffected by the split and stays its own PR.

### Suggested Work Units

| Unit | Goal | PR | Notes |
|---|---|---|---|
| 1 | `GET /collaborators/me` + xUnit test (strict_tdd:true) | PR0 [API] | Independent repo; must merge + deploy before Ruta del día works at runtime (typechecks are unaffected) |
| 2 | Core additive wrapper + Rutas de trabajo (list + detail) | PR1a [MONO] | First core touch -> web build/lint regression is mandatory; unblocks PR1b's hook import |
| 3 | Ruta del día | PR1b [MONO] | Depends on PR1a merged (`useMyCollaboratorProfile()`); runtime-meaningful only once PR0 is deployed |
| 4 | Reportes (session-period only) | PR2 [MONO] | Depends on PR1a's nav pattern only; independently stackable after PR1a even if PR1b is still in review |

**Directory-path resolution (spec vs. design):** spec R4/R6/R7 name dedicated feature folders
(`screens/workroutes/`, `screens/rutadeldia/`, `screens/reports/`); design's Target Structure
lists them under `screens/more/`. Tasks below follow **spec's dedicated-folder paths** (spec is
the ratified MUST-level source; `MoreScreen`/`TabNavigator` stay the nav hub, not a screen-file
umbrella).

---

## Phase 1: `GET /collaborators/me` + xUnit test — PR0 [API]

> Repo `moiki/housecenter-api`, dir `HouseCenter.Api/` (absolute:
> `/Users/moisesreyes/Documents/growthoptix/personal/hoh-project-net/HouseCenter/HouseCenter.Api/`).
> `strict_tdd:true` — RED -> GREEN -> REFACTOR below.

- [x] 1.1 **[RED]** `HouseCenter.Api.Tests/CollaboratorCrudTests.cs` — add `InsertUserAsync`/
      `LoginAsAsync` helpers (mirror `ReportTests.cs`'s `SeedUserAsync`/`LoginUserWithRoleAsync`)
      + optional `email` param on `CreateCollaboratorAsync` (default keeps `colab-{guid}@test.local`
      auto-gen); write `GetMe_WithMatchingEmail_ReturnsCollaborator` (seed User + Collaborator
      sharing one email inline, login, `GET /me` expected 200) — fails to compile/404s, endpoint
      doesn't exist yet (R1, scenario `collaborators-me-match`)
- [x] 1.2 **[RED]** Same file — write `GetMe_WithDifferentCasedEmail_ReturnsCollaborator`: seed
      User email `Ana@Test.local`, Collaborator email `ana@test.local` (different casing) → also
      expects 200 — **this is the case-insensitivity resolution task**: the email match MUST be
      case-insensitive (spec R1's stated intent), so this test locks that behavior in before the
      implementation exists (R1)
- [x] 1.3 **[RED]** Same file — write `GetMe_WithNoMatchingCollaborator_Returns404`: seed a User
      with no matching Collaborator row → `GET /me` expected 404 `ProblemDetails` (R1, scenario
      `collaborators-me-no-match`)
- [x] 1.4 **[GREEN]** `HouseCenter.Api/Features/Collaborators/CollaboratorService.cs` — add
      `GetMeAsync(ClaimsPrincipal, CancellationToken)` to `ICollaboratorService` + impl; read
      caller email via `principal.FindFirstValue(ClaimTypes.Email)!` (R1)
- [x] 1.5 **[GREEN]** Same file — **case-insensitive** match, resolving the spec/design conflict:
      `db.Collaborators.AsNoTracking().Where(c => c.Email.ToLower() == userEmail.ToLower())
      .Select(...).FirstOrDefaultAsync(ct)` — EF Core translates `.ToLower()` to SQL `LOWER()`;
      Postgres string `==` is case-sensitive by default so plain `==` (design D1's original
      exact-match choice) would fail test 1.2. `FirstOrDefaultAsync`, **never**
      `SingleOrDefaultAsync` — `Collaborator.Email` has no unique index/constraint (design trap #1)
      — no match → existing `NotFound = Error.NotFound("collaborators.not_found", ...)` convention
      (R1)
- [x] 1.6 **[GREEN]** `HouseCenter.Api/Features/Collaborators/CollaboratorEndpoints.cs` — add
      `group.MapGet("/me", ...)` inside the existing `/collaborators` group; inherits the group's
      bare `.RequireAuthorization()`, no extra policy (any authenticated role) (R1)
- [x] 1.7 **[GREEN]** Run `dotnet test` — confirm all 3 new tests pass (R1)
- [x] 1.8 **[REFACTOR]** Tidy: confirm `using System.Security.Claims`; confirm `/me` route
      registration doesn't collide with `/{id:guid}` (literal beats constrained-parameter
      precedence, per design — no ordering change needed, verify only); confirm helper method
      signatures read cleanly (R1)
- [x] 1.9 Verify: `dotnet build` clean + `dotnet test` full suite green — **MERGE + deploy PR0
      before treating any Ruta del día runtime smoke as meaningful** (D7)

**PR0 done when:** `dotnet test` green (3 new + full suite), `dotnet build` clean, PR0 merged
and deployed to the environment mobile builds will talk to.

> **PR0 apply status (this batch):** all 9 tasks complete. `dotnet build` clean, `dotnet test`
> full suite 200/200 green (3 new GetMe tests + zero regressions). Branch `feat/collaborators-me`
> ready for review/merge in `moiki/housecenter-api` — NOT yet merged/deployed by this agent
> (orchestrator commits/opens the PR). PR1a/PR1b/PR2 remain PENDING — this is not the last batch.

---

## Phase 2: Core additive wrapper + Rutas de trabajo (list + detail) — PR1a [MONO]

- [x] 2.1 `packages/core/src/api/modules/collaborators.api.ts` — add `getMe: () =>` GET
      `/collaborators/me` returning `CollaboratorResponse`; 404 surfaces as a rejected promise
      here (no client-side swallowing at this layer); existing exports untouched (R2)
- [x] 2.2 `packages/core/src/hooks/collaborators/useCollaborators.ts` — add
      `collaboratorKeys.me()` + `useMyCollaboratorProfile()` (`useQuery` keyed
      `['collaborators','me']`, mirrors `useMe.ts`'s `getAuthStore()`/`accessToken` gating);
      `queryFn` catches a 404 via `isApiError` and resolves `null` (not thrown/rethrown) — any
      other status rethrows; existing exports/keys untouched (R2)
- [x] 2.3 Gate: `pnpm --filter core exec tsc -b` exits 0 (R2)
- [x] 2.4 **Mandatory** gate: `pnpm --filter web build` + `pnpm --filter web lint` green,
      `apps/web/**` zero diffs — first core touch in this change, shared-core regression is
      non-negotiable (R3, scenario `core-typechecks-and-web-build-unbroken`)
- [x] 2.5 `apps/mobile/src/screens/workroutes/WorkRoutesListScreen.tsx` — new: `useWorkRoutes(1,
      DROPDOWN_PAGE_SIZE)` unmodified, `expandOccurrences(routes, today, today)` (device-local
      `dayjs()`) to badge "hoy" rows, wrapped in `QueryBoundary`/`EmptyState`, serves the
      persisted query cache while offline, row tap → `navigate('WorkRouteDetail',
      {workRouteId})`; no create/add entry point (R4, scenario
      `work-routes-list-renders-from-cache`)
- [x] 2.6 `apps/mobile/src/screens/workroutes/WorkRouteDetailScreen.tsx` — new: `useWorkRoute
      (workRouteId)` unmodified, renders `clinicName`, each `destinations[]` name/description
      (+picture if present), "Abrir en Maps" via `Linking.openURL(d.googleMapUrl)` guarded on
      non-null (hidden otherwise), local `recurrenceSummary(wr, t)` pure helper from
      `recurrenceDays`/`recurrenceStartDate`/`recurrenceEndDate`/`isRecurrenceIndefinite`; no
      edit/delete/create affordance, no month-calendar grid (R5, scenario
      `route-detail-renders-stops`)
- [x] 2.7 `apps/mobile/src/navigation/TabNavigator.tsx` — `MoreStackParamList` +`WorkRoutes:
      undefined`, +`WorkRouteDetail: {workRouteId: string}`; +2 `<MoreStack.Screen>` entries (R8)
- [x] 2.8 `apps/mobile/src/screens/more/MoreScreen.tsx` — add "Rutas de trabajo" row (`Pressable`
      → `navigate('WorkRoutes')`), mirrors the existing `Devices`/`Notifications` row pattern,
      placed above those rows (R8)
- [x] 2.9 `apps/mobile/src/i18n/locales/es.json` — add `more.workRoutes` + `workRoutes.*`
      (title, today-badge, openInMaps, empty-list) namespace, Spanish-first (R9)
- [x] 2.10 Verify: `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, `npx expo export`
      (in `apps/mobile`) all clean (scenarios `mobile-typechecks`,
      `expo-doctor-and-export-clean`); no patient/PHI field logged (R9)

**PR1a done when:** core `tsc -b` + web build/lint green (zero `apps/web/**` diffs) + mobile
`tsc --noEmit`/`expo-doctor`/`expo export` all green; code trace confirms no edit/delete/create
affordance anywhere on either screen. No Human/EAS smoke required for this slice alone.

> **PR1a apply status (this batch):** all 10 tasks complete. `pnpm --filter core exec tsc -b`
> exit 0; `pnpm --filter web build`+`lint` both exit 0, `git diff main -- apps/web` is EMPTY
> (0 lines), `git diff -- packages/core/src` is 35 insertions / 0 deletions across the 2
> modified files (purely additive — no existing export changed); `pnpm --filter mobile exec tsc
> --noEmit` exit 0; `npx expo-doctor` 19/19; `npx expo export` (cache cleared) bundled iOS 1274
> modules / Android 1282 modules, no unresolved imports (an earlier stale-Metro-cache run showed
> an anomalous Android=680 count, reproduced-and-discarded by re-running with `--clear` — see
> apply-progress for the full trace). No create/edit/delete affordance present on either
> `WorkRoutesListScreen` or `WorkRouteDetailScreen` (code-trace confirmed). Branch
> `feat/mobile-reports-workroutes` — NOT committed by this agent (orchestrator commits). PR1b/PR2
> remain PENDING — this is not the last batch.

---

## Phase 3: Ruta del día — PR1b [MONO]

> Depends on PR1a merged (imports `useMyCollaboratorProfile()`).

- [ ] 3.1 `apps/mobile/src/screens/rutadeldia/RutaDelDiaScreen.tsx` — new: compose in order —
      `useMyCollaboratorProfile()` → `null` → empty state "sin perfil coincidente";
      `profile.workRouteId === null` → empty state "sin ruta asignada"; else `useWorkRoute
      (workRouteId)` unmodified → `expandOccurrences([route], today, today)` with device-local
      `dayjs().format('YYYY-MM-DD')` for `today` (never `.utc()`) → no entry for `today` → empty
      state "hoy no toca"; else `usePatients(1, DROPDOWN_PAGE_SIZE)` filtered client-side
      `p.workRouteId === route.id` → empty → empty state "sin pacientes en la ruta"; else render
      route name + filtered patient list (R6)
- [ ] 3.2 Same file — confirm no "sessions due today" concept/wording appears anywhere in the
      screen's strings (R6, scenario `ruta-del-dia-empty-states` — all 4 preconditions a-d)
- [ ] 3.3 `apps/mobile/src/navigation/TabNavigator.tsx` — `MoreStackParamList` +`RutaDelDia:
      undefined`; +1 `<MoreStack.Screen>` entry (R8)
- [ ] 3.4 `apps/mobile/src/screens/more/MoreScreen.tsx` — add "Ruta del día" row (`Pressable` →
      `navigate('RutaDelDia')`) (R8)
- [ ] 3.5 `apps/mobile/src/i18n/locales/es.json` — add `more.rutaDelDia` + `rutaDelDia.*`
      (title, noProfile, noRoute, noOccurrenceToday, noPatients) namespace, Spanish-first (R9)
- [ ] 3.6 Verify: `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, `npx expo export`
      clean; web stays green / core untouched in this PR; no PHI logged (R9)

**PR1b done when:** mobile gates green; code trace confirms all 4 empty states from R6 render
for their respective preconditions in isolation. Human/EAS smoke **`ruta-del-dia-real-data`**
requires PR0 deployed + a Member whose auth email matches a seeded `Collaborator` with a
`workRouteId` that has an occurrence today — not headless-provable.

---

## Phase 4: Reportes (session-period only) — PR2 [MONO]

- [ ] 4.1 `apps/mobile/src/screens/reports/ReportsScreen.tsx` — new: `useSessionPeriodReport
      (from, to)` unmodified, same preset selector as web's `ReportsPage.tsx` (device-local
      `to = today`, `from = today - N days`; default "last 8 weeks" = 56 days, ≥3 more presets)
      (R7)
- [ ] 4.2 Same file — reduce `weeks: WeeklySessionBucket[]` ({weekStart, attentionType, status,
      count}) to one `{weekStart, count}` row per week client-side, render each as a plain RN
      `View` row with a proportional-width inner `View` (`width: (count/maxCount)*100+'%'`) — NO
      recharts / no charting library import (R7, scenario `reports-screen-renders-session-period`)
- [ ] 4.3 Same file — render the `sessionsByCollaborator` breakdown list **only when non-null**
      (mirrors web's `byCollaborator.length > 0` guard as-is; zero additional client-side role
      branching — the API already projects per role) (R7)
- [ ] 4.4 `apps/mobile/src/navigation/TabNavigator.tsx` — `MoreStackParamList` +`Reports:
      undefined`; +1 `<MoreStack.Screen>` entry (R8)
- [ ] 4.5 `apps/mobile/src/screens/more/MoreScreen.tsx` — add "Reportes" row (`Pressable` →
      `navigate('Reports')`) (R8)
- [ ] 4.6 `apps/mobile/src/i18n/locales/es.json` — add `more.reports` + `reports.*` (title,
      4 preset labels, byCollaborator section label) namespace, Spanish-first (R9)
- [ ] 4.7 Verify: `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, `npx expo export`
      clean; `pnpm --filter web build` stays green (no `packages/core` touch in this PR); no
      patient/PHI field logged (R9)

**PR2 done when:** mobile gates green; code trace confirms no `recharts`/charting import exists
anywhere in the bundle and the collaborator-breakdown list renders iff `sessionsByCollaborator`
is non-null. Human/EAS smoke **`reports-real-data-per-role`** requires a Member and a Sponsor
account viewing the same period against the deployed API — not headless-provable.

---

## Consolidated Human/EAS Smoke Checklist (all 3 — needs dev/CI env, live API, PR0 deployed)

1. **`ruta-del-dia-real-data`** (R1, R6) — a Member whose auth account email matches a seeded
   `Collaborator` with a `workRouteId` that has an occurrence scheduled today opens "Ruta del
   día" on a device running against the deployed PR0 endpoint → sees that route's real name +
   the real list of patients whose `workRouteId` matches the route.
2. **`open-in-maps-deep-link`** (R5) — a work-route destination with a valid `googleMapUrl`;
   tapping "Abrir en Maps" on a physical/simulator device opens the maps app (or browser) to
   that URL.
3. **`reports-real-data-per-role`** (R7) — a Member and a Sponsor account both view "Reportes"
   for the same period against the deployed API; Member sees only their own session counts,
   Sponsor sees an org-wide aggregate with no collaborator names, both render real (non-mocked)
   data.

## Per-PR Verification Commands (recap)

| PR | Commands |
|---|---|
| PR0 | `dotnet test`, `dotnet build` (API repo) |
| PR1a | `pnpm --filter core exec tsc -b`; `pnpm --filter web build`; `pnpm --filter web lint`; `pnpm --filter mobile exec tsc --noEmit`; `npx expo-doctor`; `npx expo export` |
| PR1b | `pnpm --filter mobile exec tsc --noEmit`; `npx expo-doctor`; `npx expo export` |
| PR2 | `pnpm --filter mobile exec tsc --noEmit`; `npx expo-doctor`; `npx expo export`; `pnpm --filter web build` (stays green, core untouched) |

## Risks / Notes Carried From Design

- **D7 cross-repo gate**: PR0 must merge + deploy before Ruta del día's runtime smoke is
  meaningful; typecheck/build gates for PR1a/PR1b are unaffected by PR0's deploy state.
- **Case-insensitive email match (this change's resolution of the spec/design conflict)**:
  design D1 originally chose exact `==` (no case-insensitive precedent in the codebase); spec R1
  requires case-insensitive matching. Resolved via `.ToLower()` on both sides (EF → SQL `LOWER()`)
  — see tasks 1.2/1.5. Flag in review if `sdd-apply` reverts to plain `==`.
  `FirstOrDefaultAsync` (not `Single`) stays mandatory regardless — no unique index on
  `Collaborator.Email`.
- **`usePatients(1, DROPDOWN_PAGE_SIZE)` clamp**: Ruta del día will silently miss patients if
  a route has over 100 patients — accepted v1 limitation per design's Open Questions.
- `strict_tdd:false` for core/mobile — verification is `tsc`/`expo-doctor`/`expo export`/web
  build + code trace, not a test runner. 3/13 spec scenarios are Human/EAS smoke — `sdd-apply`
  should report these as "needs dev/CI env + PR0 deployed" rather than attempt to automate them.
- PR1b's dependency on PR1a (not just PR0) means PR1b cannot start apply until PR1a's
  `useMyCollaboratorProfile()` export exists — sequence strictly PR0 → PR1a → PR1b → PR2 unless
  the team explicitly parallelizes PR2 alongside PR1b (both only depend on PR1a).
