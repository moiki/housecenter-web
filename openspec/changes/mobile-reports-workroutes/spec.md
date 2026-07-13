# SDD Spec — Mobile Reports & Work Routes

## Requirements

### R1 — Backend `GET /collaborators/me` (API repo, `strict_tdd:true`)
`moiki/housecenter-api` MUST expose `GET /collaborators/me`, requiring any authenticated role
(`.RequireAuthorization()`, no role restriction — matches existing `/collaborators` group). The
handler MUST resolve the caller's email from the authenticated user's email claim and look up the
`Collaborator` whose `Email` case-insensitively equals it. WHEN exactly one match exists, it MUST
return `200 OK` with the full `CollaboratorResponse` (same shape as `GET /collaborators/{id}`).
WHEN no match exists, it MUST return `404 Not Found` (RFC 7807 `ProblemDetails`), consistent with
the existing `GET /collaborators/{id}` no-match convention — no `200` with an empty/null body. An
xUnit integration test MUST cover both branches (`HouseCenter.Api.Tests/CollaboratorCrudTests.cs` or
a new file): email-match returns the collaborator; no-match returns 404.

### R2 — Core additive: `getMe()` + `useMyCollaboratorProfile()`
`packages/core/src/api/modules/collaborators.api.ts` MUST add `getMe: () => GET /collaborators/me`
returning `CollaboratorResponse`, surfacing a 404 as a rejected promise (no client-side swallowing —
the hook layer decides how to treat it). `packages/core/src/hooks/collaborators/useCollaborators.ts`
MUST add `useMyCollaboratorProfile()` (mirrors `useCollaborator`'s shape: `useQuery` keyed
`['collaborators', 'me']`) that MUST treat a `404` response as "no profile" (`data: undefined`, no
thrown/uncaught error surfaced to the UI) rather than a generic query error. Neither addition MUST
change any existing exported function, hook, type, or query key in these files.

### R3 — Web regression gate
Because `packages/core` is shared, `pnpm --filter web build` and `pnpm --filter web lint` MUST stay
green after R2 lands, and `apps/web`'s existing source files, routes, and bundle output MUST remain
byte-unchanged (no `apps/web/**` file is touched by this change).

### R4 — Rutas de trabajo: read-only list
A new `WorkRoutesListScreen` (`apps/mobile/src/screens/workroutes/`) MUST call the existing
`useWorkRoutes()` core hook unmodified, render each route's `routeName` + `clinicName`, wrap the
list in the existing `QueryBoundary`/`EmptyState` components, serve a previously-fetched list from
the persisted TanStack Query cache while offline, and navigate to `WorkRouteDetailScreen` on row
tap. No create/add entry point MUST exist on this screen.

### R5 — Rutas de trabajo: read-only detail
A new `WorkRouteDetailScreen` (param `{ workRouteId: string }`) MUST call the existing
`useWorkRoute(workRouteId)` core hook unmodified and render: `clinicName`; each `destinations[]`
entry's `name` + `description` (+ `picture` if present) with an "Abrir en Maps" action that opens
`destination.googleMapUrl` via the device's linking API WHEN `googleMapUrl` is non-null (hidden
otherwise); and a plain-text recurrence summary derived from `recurrenceDays`,
`recurrenceStartDate`, `recurrenceEndDate`, `isRecurrenceIndefinite`. This screen MUST NOT render
any edit, delete, or create affordance, and MUST NOT render a month-calendar grid.

### R6 — Ruta del día
A new `RutaDelDiaScreen` (`apps/mobile/src/screens/rutadeldia/`) MUST compose, in order: (a)
`useMyCollaboratorProfile()` — WHEN it resolves to no profile, render empty state "no matching
collaborator profile"; (b) WHEN the profile has `workRouteId === null`, render empty state "no
route assigned"; (c) WHEN `workRouteId` is set, fetch that route via `useWorkRoute(workRouteId)` and
run `expandOccurrences([route], today, today)` from `core/lib/recurrence.ts` using a device-local
`dayjs().format('YYYY-MM-DD')` for `today` (both `from`/`to`) — WHEN the resulting map has no entry
for `today`, render empty state "no scheduled occurrence today"; (d) WHEN an occurrence exists,
compute patients-on-route as `usePatients(...)` results filtered client-side where
`patient.workRouteId === route.id` — WHEN that filtered list is empty, render empty state "no
patients on this route"; otherwise render the route name + the filtered patient list. This screen
MUST NOT present or imply a "sessions due today" concept.

### R7 — Reportes (session-period only)
A new `ReportsScreen` (`apps/mobile/src/screens/reports/`) MUST call the existing
`useSessionPeriodReport(from, to)` core hook unmodified, offer the same preset period selector as
web's `ReportsPage.tsx` (device-local date math: `to = today`, `from = today − N days` for at least
the "Last 8 weeks" default), render `weeks` as a simple RN list/bar view (NOT a ported `recharts`
component — no charting library dependency MUST be added), and render the
`sessionsByCollaborator` breakdown list ONLY when that field is non-null (mirrors web's
`byCollaborator.length > 0` guard as-is — no additional client-side role branching, since the API
already projects per role). The `summary` report and clinic/work-route reports MUST NOT be
surfaced anywhere on mobile in this change.

### R8 — "Más" navigation
`apps/mobile/src/navigation/TabNavigator.tsx`'s `MoreStackParamList` MUST add `WorkRoutes: undefined`,
`WorkRouteDetail: { workRouteId: string }`, `RutaDelDia: undefined`, and `Reports: undefined`, each
registered as a `MoreStack.Screen`. `MoreScreen.tsx` MUST add three new rows — "Ruta del día",
"Rutas de trabajo", "Reportes" — following the existing `Devices`/`Notifications` row pattern
(`Pressable` → `navigation.navigate(...)`). None of these three MUST be added as a 4th bottom tab.

### R9 — Non-functional constraints
All new mobile strings MUST be Spanish-first (i18n `es`). All three new read screens MUST render
from the persisted TanStack Query cache while offline (no new write/mutation path is introduced by
this change). No screen or log statement MUST print patient name, address, or any other PHI field
to the console. No management/edit affordance (route or clinic mutation) MUST be reachable from
`apps/mobile` in this change — mutation stays web-only, matching existing `AdministratorOrAbove`
RBAC on the API.

## Scenarios

#### Scenario: collaborators-me-match **(headless — dotnet test)**
Traces: R1
- GIVEN a `Collaborator` row exists with `Email` equal (case-insensitive) to the authenticated
  user's email claim
- WHEN `GET /collaborators/me` is called with that user's bearer token
- THEN the response is `200 OK` with that collaborator's `CollaboratorResponse`

#### Scenario: collaborators-me-no-match **(headless — dotnet test)**
Traces: R1
- GIVEN no `Collaborator` row's `Email` matches the authenticated user's email claim
- WHEN `GET /collaborators/me` is called with that user's bearer token
- THEN the response is `404 Not Found` with a `ProblemDetails` body

#### Scenario: core-typechecks-and-web-build-unbroken **(headless)**
Traces: R2, R3
- GIVEN `getMe()`/`useMyCollaboratorProfile()` are added additively and no existing core export changes
- WHEN `pnpm --filter core exec tsc -b`, `pnpm --filter web build`, and `pnpm --filter web lint` run
- THEN all three exit 0 with no regressions, and `apps/web/**` has zero diffs

#### Scenario: mobile-typechecks **(headless)**
Traces: R4, R5, R6, R7, R8
- GIVEN the three new "Más" screens, the work-routes list/detail screens, and the nav wiring exist
- WHEN `pnpm --filter mobile exec tsc --noEmit` runs
- THEN it exits 0 with no type errors

#### Scenario: expo-doctor-and-export-clean **(headless)**
Traces: R4, R5, R6, R7
- GIVEN no new native dependency is introduced (no charting library added, per R7)
- WHEN `npx expo-doctor` and `npx expo export` run in `apps/mobile`
- THEN both succeed with no failing checks / no bundling errors

#### Scenario: work-routes-list-renders-from-cache **(headless — code trace)**
Traces: R4
- GIVEN `WorkRoutesListScreen` wraps `useWorkRoutes()` in `QueryBoundary`/`EmptyState`
- WHEN code-traced against the persisted query cache
- THEN a previously-fetched list renders while offline, and row tap navigates to
  `WorkRouteDetail` with the correct `workRouteId`

#### Scenario: route-detail-renders-stops **(headless — code trace)**
Traces: R5
- GIVEN a `WorkRouteResponse` with 2+ `destinations[]`, one with `googleMapUrl` set and one `null`
- WHEN `WorkRouteDetailScreen` renders
- THEN each destination's name/description show, "Abrir en Maps" renders only for the entry with a
  non-null `googleMapUrl`, and no edit/delete control is present anywhere on the screen

#### Scenario: ruta-del-dia-empty-states **(headless — code trace)**
Traces: R6
- GIVEN each of the four preconditions in R6 (a–d) in isolation (no profile match; profile with
  `workRouteId: null`; `workRouteId` set but no occurrence today; occurrence today but zero
  filtered patients)
- WHEN `RutaDelDiaScreen`'s composition logic is code-traced
- THEN the corresponding honest empty state renders for each case, and no "sessions due" wording
  appears anywhere in the screen's strings

#### Scenario: reports-screen-renders-session-period **(headless — code trace)**
Traces: R7
- GIVEN `useSessionPeriodReport(from, to)` resolves with `weeks` populated and
  `sessionsByCollaborator` either `null` or populated
- WHEN `ReportsScreen` is code-traced
- THEN `weeks` always renders as a list/bar view with no `recharts`/charting dependency imported,
  and the collaborator breakdown list renders if-and-only-if `sessionsByCollaborator` is non-null

#### Scenario: ruta-del-dia-real-data **(Human/EAS smoke)**
Traces: R1, R6
- GIVEN a Member whose auth account email matches a seeded `Collaborator` with a `workRouteId`
  that has an occurrence scheduled today
- WHEN they open "Ruta del día" on a device running against the deployed PR0 endpoint
- THEN the screen shows that route's name and the real list of patients whose `workRouteId`
  matches the route

#### Scenario: open-in-maps-deep-link **(Human/EAS smoke)**
Traces: R5
- GIVEN a work-route destination with a valid `googleMapUrl`
- WHEN the user taps "Abrir en Maps" on a physical/simulator device
- THEN the device's maps app (or browser) opens to that URL

#### Scenario: reports-real-data-per-role **(Human/EAS smoke)**
Traces: R7
- GIVEN a Member and a Sponsor account both viewing "Reportes" for the same period against the
  deployed API
- WHEN each loads the screen
- THEN the Member sees only their own session counts, the Sponsor sees an org-wide aggregate with
  no collaborator names, and both charts render real (non-mocked) data

## API surface

| Method | Path | Auth | New/Existing | Notes |
|---|---|---|---|---|
| GET | `/collaborators/me` | any authenticated role | **New (R1)** | Email-match; 404 if none |
| GET | `/collaborators/{id}` | any authenticated role | Existing, unchanged | Referenced for 404 convention parity |
| GET | `/workroutes` | any authenticated role | Existing, unchanged | Paged list; core: `workRoutesApi.list` |
| GET | `/workroutes/{id}` | any authenticated role | Existing, unchanged | Core: `workRoutesApi.getById` |
| GET | `/reports/sessions` | any authenticated role, role-projected server-side | Existing, unchanged | `from`/`to` query params; core: `reportsApi.getSessionPeriod` |

## DTOs

```ts
// CollaboratorResponse — returned by both /collaborators/{id} and the new /collaborators/me
export interface CollaboratorResponse {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  address: string
  country: string | null
  state: string | null
  city: string | null
  profilePicture: string | null
  clinicId: string
  clinicName: string
  workRouteId: string | null   // consumed by R6 to resolve the caller's route
  positions: PositionDto[]
  isActive: boolean
}

// WorkRouteResponse — unchanged, consumed by R4/R5/R6
export interface WorkRouteResponse {
  id: string
  routeName: string
  description: string
  featuredImage: string | null
  clinicId: string
  clinicName: string
  destinations: DestinationPointDto[]  // { name, description, picture, googleMapUrl }
  isActive: boolean
  recurrenceDays: Weekday[]
  recurrenceStartDate: string
  recurrenceEndDate: string | null
  isRecurrenceIndefinite: boolean
}

// SessionPeriodReportResponse — unchanged, consumed by R7
export interface SessionPeriodReportResponse {
  from: string
  to: string
  weeks: WeeklySessionBucket[]  // { weekStart, attentionType, status, count }
  sessionsByCollaborator: Record<string, number> | null
}
```

## Validation rules

| Rule | Where | Detail |
|---|---|---|
| No request body | `/collaborators/me` | GET with no params — server derives identity from the auth token, not the client |
| Case-insensitive email match | `/collaborators/me` handler | Server-side only; mobile/core send nothing extra |
| 404 on no match | `/collaborators/me` handler | `useMyCollaboratorProfile()` MUST treat this as `data: undefined`, not a thrown query error |
| `from`/`to` required | `/reports/sessions` (existing, unchanged) | `useSessionPeriodReport` already guards with `enabled: !!from && !!to` |
| Empty-state contracts | Client-side only (R4, R5, R6) | No-profile-match / no-route / no-occurrence-today / no-patients-today / empty work-routes list — each MUST render a distinct, honest `EmptyState`, never a silent blank screen |
| No mutation validation needed | R4, R5, R7 | These screens are read-only; no request-body schema is introduced |

## Verification rules

| Check | Command | Expected |
|---|---|---|
| API integration test | `dotnet test` (API repo) | `collaborators-me-match` + `collaborators-me-no-match` pass |
| Core typecheck | `pnpm --filter core exec tsc -b` | exits 0 |
| Web regression | `pnpm --filter web build && pnpm --filter web lint` | both pass; zero `apps/web/**` diffs |
| Mobile typecheck | `pnpm --filter mobile exec tsc --noEmit` | exits 0 |
| Expo sanity | `npx expo-doctor` (in `apps/mobile`) | no failing checks |
| Mobile bundlable | `npx expo export` (in `apps/mobile`) | export succeeds |
| Code-trace checks | manual review | work-routes list/detail, Ruta del día empty states, reports role-guard — per Scenarios above |
| Human/EAS smoke | manual dev-client run against the deployed PR0 endpoint | `ruta-del-dia-real-data`, `open-in-maps-deep-link`, `reports-real-data-per-role` — NOT headless-provable, requires a seeded Member↔Collaborator email match |
