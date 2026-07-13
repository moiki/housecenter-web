# Exploration — Mobile Reports & Work Routes (Change #10)

## Summary

Core's `reports.api.ts`/`useReports.ts` and `workroutes.api.ts`/`useWorkRoutes.ts` are read-complete for a
straightforward port (list/detail/summary/session-period exist). Recurrence is expanded 100% client-side via
`core/lib/recurrence.ts`'s pure `expandOccurrences()` — even web's management calendar uses it that way, so
"today's route" needs no new query, just `from=to=today`. The one **critical gap**: there is no reliable link
between the logged-in `User` and their `Collaborator` HR record (which carries `workRouteId`/`clinicId`) —
`Collaborator` is a deliberately separate entity from `User` with no FK, and no `/collaborators/me` exists.
"Sessions due today" is not deliverable server-side (sessions are only queryable per-patient). Reports: only 2
of 4 API report endpoints are wired in core/web (`summary`, `session-period`).

**Confidence: High** on API contracts/RBAC/core surface (read directly, both repos). **Medium** on UI placement
(product judgment — flagged for user confirmation).

## Confirmed

1. **Core reports surface is PARTIAL.** `reports.api.ts:6-14` exposes only `getSummary()`/`getSessionPeriod()`;
   `hooks/reports/useReports.ts:9-24` wraps those two. API also has `GET /reports/clinics/{id}` +
   `GET /reports/work-routes/{id}` (`Features/Reports/ReportEndpoints.cs:19-27`) — neither wired in core/web.
2. Web `ReportsPage.tsx:28` uses only session-period; `useSummaryReport` only in the admin `DashboardPage`.
   Clinic/work-route reports have zero frontend callers.
3. Reports API auth: any authenticated role (`ReportEndpoints.cs:12-13` — `.RequireAuthorization()` only),
   per-role projection inside handlers.
4. `GetSummaryReportHandler` (`GetSummaryReport.cs:14-43`) has ZERO role projection — identical org-wide
   totals for every role.
5. `GetSessionPeriodReportHandler` (`GetSessionPeriodReport.cs:15-83`) IS role-scoped: Doctor → assigned
   patients' sessions; **Member → own sessions only (`CollaboratorId == userId`, l.47-48)**; Sponsor →
   org-wide aggregate no names; Admin/Owner → all + named breakdown.
6. Clinic/work-route report handlers: any role by id; `collaboratorNames` null unless Admin/Owner;
   `GetWorkRouteReport.cs:24-26` forbids Doctor.
7. **Work-routes read is unrestricted for ANY authenticated role incl. Member** (`WorkRouteEndpoints.cs:12,14,18`
   group `.RequireAuthorization()`); mutations require `AdministratorOrAbove` (l.29,35,41). Core mirrors 1:1 —
   NO "my routes"/"routes for date" query.
8. `WorkRouteResponse` has NO assigned-collaborator field (`types/workroute.types.ts:17-30`) — only clinic +
   `destinations[]` (name/description/picture/googleMapUrl; no patientId/lat/lng) + recurrence fields.
9. **Recurrence expansion is 100% client-side** (`lib/recurrence.ts:24-59` pure `expandOccurrences`); web's
   `WorkRouteCalendar.tsx:6,29-31` uses it the same way. No server "routes for date" endpoint.
10. Web `WorkRouteDetailPage.tsx:108-138` is a full EDIT form, not a read-only view — mobile builds an original
    read-only detail screen.
11. **CRITICAL GAP — `Collaborator` is NOT linked to `User`.** `Domain/Entities/{Collaborator,User}.cs` are
    independent, no FK; `Seeding/TestDataSeeder.cs:121` confirms it's deliberate. `CollaboratorEndpoints.cs:12-46`
    readable by any role but **no `/collaborators/me`, no email filter**. Collaborator DOES carry an email field
    (the client heuristic uses `c.email`).
12. `AttentionSession.CollaboratorId` is actually a `User.Id` (`AttentionSession.cs:15-16`,
    `CreateAttentionSession.cs:37`) — resolves #6's still-open D6 risk (surface back to #6). Does NOT resolve
    #10's distinct need (#11).
13. NO cross-patient sessions query — `SessionEndpoints.cs:15-58` scopes to `/patients/{patientId}/sessions`.
    Only cross-patient aggregate is the Reports weekly-bucket counts (no per-session rows, no "due" flag).
14. `Patient.workRouteId` exists (`patient.types.ts:20-21`) — patients structurally assignable to a route,
    independent of Collaborator assignment. `patients.api.ts` has no filter params (fetch-then-filter).
15. Mobile patients list is unscoped today (`PatientsListScreen.tsx:17-82`); #6 never attempted "mine" scoping.
16. Versioning confirmed — only `/api/v{n}/clinics` versioned (`Program.cs:278-293`); workroutes/reports
    unprefixed, matching core `BASE`.
17. Mobile foundation reusable unmodified: `TabNavigator`, `MoreScreen.tsx:71-77` row pattern,
    `QueryBoundary`/`EmptyState`, `useAuthStore().user.roles`, `hooks/collaborators/useCollaborators.ts`.
18. `DROPDOWN_PAGE_SIZE = 100` (`constants.ts:7`) is the backend clamp for full-list fetches.

## Discrepancies / corrections

- The plan's assumption that a Member's work route is directly resolvable is **wrong as modeled** — no
  identity/FK between `User` and `Collaborator` (#11). Bigger risk than anticipated.
- "Sessions due today" is **not literally deliverable** (#13) — only structural `workRouteId` assignment.
- Reports aren't cleanly "Member basic vs Sponsor aggregate" — `summary` is unscoped for everyone; only
  `session-period` is genuinely role-scoped.
- Recurrence/timezone risk is small — `recurrence.ts` is UTC-drift-safe by construction; mobile just uses
  device-local `dayjs()` today.
- Report DTOs are lightweight, not bandwidth-heavy.
- Web's route "detail page" is an editor, not a read-only reference UI.

## Additional considerations (recommended positions)

1. **Core change**: minimal. Reuse work-routes/recurrence + `useSessionPeriodReport` as-is. With the ratified
   backend `/collaborators/me`, ADD a small additive core wrapper (`collaboratorsApi.getMe()` +
   `useMyCollaboratorProfile()`); web unaffected.
2. **Ruta del día model**: resolve my-collaborator via the new `/collaborators/me` → if `workRouteId`, run
   `expandOccurrences([route], today, today)` → "patients on this route" = `usePatients` filtered client-side by
   `workRouteId`. Reframe away from "sessions due" (not deliverable).
3. **Reports scope**: v1 = session-period only (`ReportsPage.tsx`'s chart; the `sessionsByCollaborator` guard
   already handles Sponsor/Member). Exclude summary (unscoped) + clinic/work-route reports (unwired).
4. **Work-routes UX**: list + original read-only detail (stops with "Open in Maps" links, recurrence). Skip the
   month-calendar grid for v1 (too dense for phone) — list + "hoy" badge.
5. **UI placement**: nest Ruta del día + Rutas + Reportes under "Más" (RATIFIED by user; matches #9 precedent;
   a sometimes-empty dedicated tab would feel broken).
6. **RBAC**: Member full read on routes + reports (self-scoped) + collaborators; Sponsor same route read +
   org-aggregate reports; Doctor forbidden only from the work-route *report* (moot). Management/edit stays on web.
7. **PR shape**: backend PR0 (`/collaborators/me` + xUnit test, API repo) → mobile PR1 (work-routes read-only +
   Ruta del día) → mobile PR2 (reports). Watch PR1 budget (drop calendar to stay under 400).
8. **Risks**: below.

## Recommendation

Ratify (post-user-decision): **backend `/collaborators/me` first** (email-match server-side, xUnit test,
API repo, strict_tdd:true) → additive core wrapper → mobile-only screens; reports v1 = session-period only;
work-routes v1 = list+detail, no calendar; **UI nested under "Más"** (ratified). PR shape: PR0 backend → PR1
routes+Ruta del día → PR2 reports.

## Risks

- User↔Collaborator link resolved server-side by email match (`/collaborators/me`) — still an email join (no FK);
  needs an honest empty state if no match. Robust vs the client heuristic (not 100-clamped, data stays server-side).
- "Sessions due today" isn't a real data point — reframe to "patients on today's route" or accept as a v2 API ask.
- `summary` report exclusion is deliberate/correct, not a gap.
- Route destination lists can be long/media-heavy — scrollable card list, not a table.
- PR1 line-budget risk if calendar/"sessions due" scope creeps back.

**Ready for Proposal: Yes.** Ratified decisions: backend-`/collaborators/me`-first + nest-under-Más.
