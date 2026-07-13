# SDD Proposal — Mobile Reports & Work Routes

## Change name
`mobile-reports-workroutes`

## Status
`proposed` (2026-07-13)

## Problem

Change #10 of the master plan (9/11 done): read-only **Reports** + read-only **Work Routes** /
"Ruta del día" for `apps/mobile`. Core's `reports.api.ts`/`useReports.ts` and
`workroutes.api.ts`/`useWorkRoutes.ts` are read-complete for a straightforward port, and recurrence
expansion is 100% client-side (`recurrence.ts`'s `expandOccurrences()`, same as web's calendar) —
so "today's route" needs no new query. But one **critical gap** blocks a naive build: `Collaborator`
(the HR record carrying `workRouteId`/`clinicId`) has **no FK to `User`** (the auth account) — no
`/collaborators/me` exists anywhere, and `Collaborator`/`User` are deliberately independent entities.
Without it, "Ruta del día" cannot reliably resolve which route belongs to the logged-in Member.
"Sessions due today" is also **not deliverable** server-side (no cross-patient session query) —
Ruta del día must be reframed to "patients on today's route."

This is a **cross-repo change** (like #1 device-bound-sessions): a small backend endpoint lands
first in `moiki/housecenter-api`, then the monorepo builds on it. Branch off `main` (all #1–#9
merged).

## Proposed change

Three ordered pieces:
1. **Backend PR0** (API repo) — new `GET /collaborators/me`: returns the `Collaborator` whose
   `Email` matches the authenticated user's email claim (404/empty if none). `strict_tdd:true` in
   that repo → an xUnit integration test is required. Merges and deploys **before** any mobile work
   depends on it.
2. **Core** (additive only) — `collaboratorsApi.getMe()` + `useMyCollaboratorProfile()` wrapping the
   new endpoint. Zero changes to existing core exports; `apps/web` byte-unchanged.
3. **Mobile** — three new entries nested under **"Más"** (mirrors #9's Notificaciones/Dispositivos
   pattern, NOT a 4th tab): **Ruta del día**, **Rutas de trabajo** (read-only list+detail), and
   **Reportes** (session-period only, role-scoped).

## Core change

One new API function + one new hook. No existing core export changes.

| File | Change |
|---|---|
| `packages/core/src/api/modules/collaborators.api.ts` | Add `getMe()` → `GET /collaborators/me`. Existing exports untouched. |
| `packages/core/src/hooks/collaborators/useCollaborators.ts` | Add `useMyCollaboratorProfile()` (mirrors existing hook shapes in this file). |

Because core is shared, this ships behind a **web build/lint regression gate**, same discipline as
#7/#8/#9.

## Ruta del día model

`useMyCollaboratorProfile()` resolves the caller's `Collaborator`. If it has a `workRouteId`, run
`expandOccurrences([route], today, today)` (device-local `dayjs()`, mirrors web's calendar usage)
to confirm today is a scheduled occurrence; "patients on today's route" = `usePatients` filtered
client-side by `workRouteId` (`Patient.workRouteId` exists structurally, independent of any
Collaborator link). This **reframes away from "sessions due today"** — not deliverable (no
cross-patient session query exists; sessions only query per-patient). Honest empty state for: no
collaborator match, no `workRouteId`, no scheduled occurrence today, or no patients on the route.

## Work routes (read-only)

List + an original read-only detail screen — stops/`DestinationPoints` rendered as a scrollable
card list (name/description/picture) with "Open in Maps" (`googleMapUrl`) links + a plain-text
recurrence summary. **No month-calendar grid** (too dense for a phone; web's `WorkRouteCalendar`
is part of an editor flow, not a reference view worth porting). No create/edit/delete — management
stays on web (mutations already require `AdministratorOrAbove`).

## Reports (read-only, session-period only)

Port `ReportsPage.tsx`'s session-period chart only — its `sessionsByCollaborator` guard already
handles Member (own sessions only, `CollaboratorId == userId`), Sponsor (org-wide aggregate, no
names), and Admin/Owner (full named breakdown) projections server-side. **Excluded**: `summary`
(zero role projection — identical org-wide totals for every role; misleading to ship on mobile as
if it were personalized) and clinic/work-route reports (zero frontend callers today in web or core,
unwired, marginal value for a v1 read surface).

## RBAC

- **Member**: read work-routes (endpoint is unrestricted for any authenticated role) + read own
  session-period report + read own collaborator profile via `/collaborators/me`.
- **Sponsor**: same work-routes read + org-aggregate (no-names) session-period report.
- **Doctor/Admin/Owner**: existing RBAC unchanged (Doctor is forbidden only from the work-route
  *report* endpoint, not routes themselves; Admin/Owner get the full named breakdown) — no new
  mobile-specific restriction introduced.
- **Management/edit** (routes, clinics): web-only for every role — no mutation surface ships on
  mobile in this change.

## Scope

### In scope
- `GET /collaborators/me` (API repo) + xUnit integration test.
- `collaboratorsApi.getMe()` + `useMyCollaboratorProfile()` (core, additive).
- **Ruta del día** screen (Más-nested).
- **Rutas de trabajo**: list + read-only detail (Más-nested).
- **Reportes**: session-period chart only (Más-nested).
- Spanish-first i18n; "Open in Maps" deep links for route stops.

### Out of scope
- **"Sessions due today"** as a literal feature — not deliverable server-side; reframed to
  "patients on today's route."
- Month-calendar grid for work routes.
- `summary` report + clinic/work-route reports.
- Any work-route mutation (create/edit/delete) — stays web-only.
- Admin/Doctor/Sponsor mobile parity beyond the shared read endpoints covered by RBAC above.
- Any backend/API change beyond the single new `/collaborators/me` endpoint.
- **Informational, not scope**: `AttentionSession.CollaboratorId` is actually a `User.Id` — this
  resolves change #6's still-open D6 risk. Noted here as a bonus finding for #6 to pick up; not
  actioned in #10.

## Cross-repo sequencing risk

Ruta del día **hard-depends** on PR0 being merged AND deployed to the API environment the mobile
device talks to. Until then, Ruta del día must render its honest empty state — never build against
a mocked/local-only endpoint that could diverge from the real deploy. `sdd-tasks`/`sdd-apply` MUST
sequence PR0 to close (merged + deployed) before PR1 starts.

## Ratified decisions (do not re-open)

| # | Decision | Position |
|---|---|---|
| 1 | Backend-first | `GET /collaborators/me` ships in `moiki/housecenter-api` FIRST (email-match, xUnit test, `strict_tdd:true`); merges/deploys before mobile PR1. |
| 2 | UI placement | Nested under **"Más"** (Ruta del día / Rutas de trabajo / Reportes), NOT a 4th tab — matches #9 precedent. |
| 3 | Core touch | **Additive only** — `getMe()` + `useMyCollaboratorProfile()`; existing core/web exports and `apps/web` bundle unchanged. |
| 4 | Ruta del día model | `useMyCollaboratorProfile()` → `expandOccurrences([route], today, today)` → patients = `usePatients` filtered by `workRouteId`; reframed away from "sessions due." |
| 5 | Reports v1 scope | Session-period ONLY; exclude `summary` (unscoped) and clinic/work-route reports (unwired). |
| 6 | Work-routes v1 scope | List + read-only detail only; no month-calendar grid; no mutation. |

## Affected packages/repos

| Repo/package | Impact | Description |
|---|---|---|
| `moiki/housecenter-api` | New | `Features/Collaborators/CollaboratorEndpoints.cs` (+route), `CollaboratorService.cs`/`ICollaboratorService` (+`GetMeAsync`), `HouseCenter.Api.Tests/CollaboratorCrudTests.cs` (+integration tests) |
| `packages/core` | Modified (additive) | `collaborators.api.ts` (+`getMe`), `hooks/collaborators/useCollaborators.ts` (+`useMyCollaboratorProfile`); existing exports untouched |
| `apps/mobile` | New | Ruta del día, Rutas de trabajo (list+detail), Reportes screens; 3 new rows on `MoreScreen`/`MoreStackParamList` |
| `apps/web` | None | Byte-unchanged — asserted via the existing build/lint regression gate |

## Delivery plan (chained PRs)

| PR | Scope | Notes |
|---|---|---|
| **PR0 [API]** | `GET /collaborators/me` + xUnit integration test | Merge & deploy FIRST — mobile PR1 hard-depends on it (see sequencing risk above) |
| **PR1 [MONO]** | Core additive `getMe`/hook + work-routes read-only (list+detail) + Ruta del día (Más-nested) | **400-line budget risk flagged** — calendar already dropped to help; if still tight, split list vs. detail vs. Ruta del día into further chained slices |
| **PR2 [MONO]** | Reports read-only (session-period, Más-nested) | Independent of PR1's routes UI; shares at most `useMyCollaboratorProfile` |

No test runner for core/mobile (`strict_tdd:false`) — verify via `tsc -b`/`expo-doctor`/`expo export`/
web build+lint; API PR0 verifies via `dotnet test`. Ruta del día runtime + report chart rendering
need a Human/EAS smoke pass (requires a Member whose email matches a seeded Collaborator with a
`workRouteId`).

## Success criteria

- PR0 merged + deployed: `GET /collaborators/me` returns the matching Collaborator (or 404/empty)
  for the authenticated user's email; xUnit test green.
- PR1: work-routes list + detail render read-only with working "Open in Maps" links; Ruta del día
  shows the correct route's patients for a matched Member, and an honest empty state otherwise.
- PR2: Reportes renders the session-period chart correctly scoped per role (Member/Sponsor/Admin).
- `apps/web` build/lint stay green throughout — zero regression from the core additive touch.

## Rollback plan

- **PR0 (API)**: purely additive new endpoint + service method + test; revert removes the route
  with zero contract impact — nothing else calls it yet.
- **PR1/PR2 (core)**: additive-only (`getMe`/hook); revert removes the new function/hook atomically
  — no consumer forced to migrate, `apps/web` unaffected.
- **PR1/PR2 (mobile)**: purely additive — 3 new "Más" rows + new screens; no change to #5 auth, #6
  patients, #7 attachments, #8 consultations, or #9 notifications runtime. Revert the relevant
  feature branch to remove the surface with zero data impact. Each chained PR reverts independently;
  PR0 can stay merged even if PR1/PR2 are rolled back (the endpoint simply goes unused).
