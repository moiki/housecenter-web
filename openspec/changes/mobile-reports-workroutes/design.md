# SDD Design — Mobile Reports & Work Routes

## Change name
`mobile-reports-workroutes`

## Status
`design` (2026-07-13)

Technical HOW for proposal `mobile-reports-workroutes` (change #10, cross-repo). Three
ordered pieces: **PR0 [API]** a new `GET /collaborators/me` (email-match, xUnit test) —
resolves the missing `User`↔`Collaborator` link; **PR1 [MONO]** additive core wrapper +
read-only Work Routes (list/detail) + **Ruta del día** (Más-nested); **PR2 [MONO]**
read-only Reports (session-period only). Core stays additive-only — `apps/web` byte-unchanged.

---

## Target structure

```
HouseCenter.Api/Features/Collaborators/
  CollaboratorService.cs            ← MODIFY: +GetMeAsync (ICollaboratorService +impl)
  CollaboratorEndpoints.cs           ← MODIFY: +GET /collaborators/me

HouseCenter.Api.Tests/
  CollaboratorCrudTests.cs           ← MODIFY: +2 xUnit tests, +email param on helpers

packages/core/src/
  api/modules/collaborators.api.ts          ← MODIFY: +getMe() (existing exports untouched)
  hooks/collaborators/useCollaborators.ts   ← MODIFY: +useMyCollaboratorProfile, +collaboratorKeys.me

apps/mobile/src/
  navigation/TabNavigator.tsx        ← MODIFY: MoreStackParamList +4 routes, +4 <MoreStack.Screen>
  screens/more/
    MoreScreen.tsx                   ← MODIFY: +3 rows (Ruta del día / Rutas de trabajo / Reportes)
    RutaDelDiaScreen.tsx              ← NEW (profile → route → occurrence-today → patients)
    WorkRoutesListScreen.tsx          ← NEW (list + "hoy" badge)
    WorkRouteDetailScreen.tsx         ← NEW (read-only: clinic, recurrence, stops + Maps links)
    ReportsScreen.tsx                 ← NEW (session-period only, RN-native rendering, no recharts)
  i18n/locales/es.json               ← MODIFY: +more.* rows, +rutaDelDia.*, +workRoutes.*, +reports.*

apps/web/*                           ← NO code change; build/lint regression gate only (shared core)
```

Reuse unchanged: `QueryBoundary`, `EmptyState`, `useOnline` (unused here — read-only, no
writes to gate), `useWorkRoute`/`useWorkRoutes` (core, unmodified), `usePatients` (core,
unmodified), `expandOccurrences` (core `lib/recurrence.ts`, unmodified pure function),
`useSessionPeriodReport` (core, unmodified).

---

## Architecture decisions

### D1 — `GET /collaborators/me`, Service pattern, `ClaimTypes.Email`, exact-match, `FirstOrDefaultAsync`, 404 via existing Result convention
**Choice**: Add `GetMeAsync(ClaimsPrincipal, CancellationToken)` to `ICollaboratorService`/
`CollaboratorService` (`Features/Collaborators/CollaboratorService.cs`) — same class as
`ListAsync`/`GetByIdAsync` (Collaborators is a **Service**-pattern module per project
convention, not CQRS). Reads the caller's email via `principal.FindFirstValue(ClaimTypes.Email)!`
— **new to this codebase** (every existing claim-read is `ClaimTypes.NameIdentifier` for
`userId`, e.g. `AuthEndpoints.cs:25`, `GetSessionPeriodReport.cs:31`), but the claim exists:
`TokenService.cs:41` mints `new(JwtRegisteredClaimNames.Email, user.Email)` at login, and
ASP.NET Core's default inbound claim map (never disabled — no `MapInboundClaims = false`
anywhere in `Program.cs`) translates the JWT `"email"` claim to `ClaimTypes.Email`, the exact
same mechanism that turns `"sub"` into `ClaimTypes.NameIdentifier` everywhere else. Query:
`db.Collaborators.AsNoTracking().Where(c => c.Email == userEmail).Select(...).FirstOrDefaultAsync(ct)`
— **exact case-sensitive `==`**, mirroring the codebase's only two existing email-match
precedents (`AuthService.cs:39` login, `InvitationService.cs:43`); **`FirstOrDefaultAsync`, not
`SingleOrDefaultAsync`** — confirmed no unique index/constraint exists on `Collaborator.Email`
(only `User.Email` and `Invitation.Email` have `HasIndex(...).IsUnique()`; there is no
`CollaboratorConfiguration.cs` at all), so a duplicate-email row must not 500. Returns the same
`NotFound = Error.NotFound("collaborators.not_found", ...)` used by `GetByIdAsync`, exposed via
`.ToHttpResult()` (same as every other GET in this file) → RFC 9457 404. Route: new
`group.MapGet("/me", ...)` inside the existing `/collaborators` group — inherits the group's
bare `.RequireAuthorization()` (no extra policy; any authenticated role, matching "Collaborators
readable by any role" convention already on `ListAsync`/`GetByIdAsync`).
**Alternatives considered**: `ClaimTypes.NameIdentifier` + join through `User.Email` (rejected —
extra DB round-trip, `Collaborator` has no `UserId` FK to join on, the email claim is already on
the token); case-insensitive `ToLower()`/`ILike` match (rejected for v1 — codebase has zero
precedent for it; every existing email lookup is exact `==`; flagged as a known limitation/fast-
follow, not actioned here per SKILL rule "follow existing pattern unless the change specifically
addresses it"); `SingleOrDefaultAsync` (rejected — would 500 on a data-entry duplicate instead of
degrading to "first match").
**Rationale**: minimal, convention-matching diff; the 404 path is the one genuinely new piece of
behavior (email-join has no FK, so "no match" is an expected, first-class outcome, not an error).

### D2 — Core additive wrapper: `collaboratorsApi.getMe()` + `useMyCollaboratorProfile()` mirroring `useMe()`, 404-swallowed to `null`
**Choice**:
```ts
// collaborators.api.ts — existing exports untouched
getMe: () => getApiClient().get<CollaboratorResponse>(`${BASE}/me`).then(r => r.data),
```
```ts
// useCollaborators.ts
export const collaboratorKeys = {
  ...
  me: () => [...collaboratorKeys.all, 'me'] as const,   // additive key
}

export function useMyCollaboratorProfile() {
  const useAuthStore = getAuthStore()          // core/auth/registry — mirrors useMe.ts exactly
  const { accessToken } = useAuthStore()
  return useQuery({
    queryKey: collaboratorKeys.me(),
    queryFn: async () => {
      try {
        return await collaboratorsApi.getMe()
      } catch (err) {
        if (isApiError(err) && err.status === 404) return null   // no match — NOT an error
        throw err
      }
    },
    enabled: !!accessToken,
    retry: false,
  })
}
```
Return type: `CollaboratorResponse | null | undefined` (`undefined` = still loading; `null` =
resolved, no match; object = resolved match). `isError` stays `false` for the honest 404 —
only unexpected failures (500/network) flip it.
**Alternatives considered**: let the 404 bubble as `isError` and have every screen special-case
it (rejected — repeats the same `err.status === 404` check in 3 screens; the hook is the single
place that knows "404 here means no profile, not a failure"); a raw `useQuery` without the
try/catch, screens read `error` directly (rejected — same duplication, and a stray toast/error
banner would read as a bug to a Member who simply has no `Collaborator` record yet, e.g. Doctor/
Sponsor/Owner accounts).
**Rationale**: `useMe.ts` (`hooks/auth/useMe.ts`) is the exact precedent for gating a core hook
on `accessToken` via `getAuthStore()`; centralizing 404-swallowing keeps every consuming screen
a simple three-way `undefined | null | data` branch. Existing core/`apps/web` exports untouched
— ships behind the standard web build/lint regression gate.

### D3 — Ruta del día: profile → route → today's occurrence → route's patients, each honest empty state
**Choice**: `useMyCollaboratorProfile()` → if `null`, empty state "no profile match"; if
`profile.workRouteId` is `null`, empty state "no route assigned"; else `useWorkRoute(workRouteId)`
(core's existing `enabled: !!id` guard means **the route query is naturally inert while the
profile is still loading** — passing `workRouteId ?? ''` costs nothing extra, no new guard code
needed) → `expandOccurrences([route], today, today)` where `today = dayjs().format('YYYY-MM-DD')`
(**device-local**, never `.utc()`) → if `occurrences.get(today)` is empty, empty state "no
occurrence today"; else `usePatients(1, DROPDOWN_PAGE_SIZE)` filtered client-side by
`p.workRouteId === profile.workRouteId` → if empty, empty state "route has no patients"; else
render the list.
**Alternatives considered**: "sessions due today" (rejected — not deliverable, no cross-patient
session query exists per exploration #13); server-side "my route" resolution beyond `/me`
(rejected — `/collaborators/me` + client `expandOccurrences` is sufficient and reuses code
already proven correct by web's calendar); fetch all patients pages (rejected for v1 — same
`DROPDOWN_PAGE_SIZE=100` clamp every other "full list" call site accepts; flagged as an open
question below, not solved here).
**Rationale**: four distinct, honest Spanish empty states beat one generic "no data" — each
maps to a real, different cause a Member can act on (nothing to do here vs. "ask an admin to
link my account").

### D4 — Work-routes: list ("hoy" badge) + original read-only detail, no calendar, no mutation
**Choice**: `WorkRoutesListScreen` = `useWorkRoutes(1, DROPDOWN_PAGE_SIZE)` +
`expandOccurrences(routes, today, today)` to badge rows recurring today. `WorkRouteDetailScreen`
= `useWorkRoute(id)` rendering clinic name, a plain-text recurrence summary (local pure helper,
not hoisted to core — web has no equivalent text-summary helper either, `WorkRouteCalendar.tsx`
only renders chips), and `destinations[]` as a **scrollable card list** (name/description/picture
+ `Linking.openURL(d.googleMapUrl)` guarded on non-null, since `DestinationPointDto.googleMapUrl`
is nullable). `destinations` has no stable id — keyed by array index (acceptable: static,
read-only, no reordering).
**Alternatives considered**: month-calendar grid (rejected — ratified in the proposal; too dense
for a phone, `WorkRouteCalendar.tsx` is part of an editor flow, not a reference view); any
create/edit/delete affordance (rejected — management stays web-only, mutations already require
`AdministratorOrAbove` server-side).
**Rationale**: matches the "list + original read-only detail" v1 scope ratified in the proposal;
reuses `expandOccurrences` a second time (already proven for Ruta del día) instead of a new query.

### D5 — Reports: session-period only, RN-native proportional bars (NO recharts), role projection is server-side
**Choice**: Port only `ReportsPage.tsx`'s session-period chart. `useSessionPeriodReport(from, to)`
with the **same default preset as web** ("last 8 weeks", `to = today`, `from = today - 56d`,
plus the same 4 presets). `SessionPeriodReportResponse.weeks: WeeklySessionBucket[]` is
`{weekStart, attentionType, status, count}` — **not** `{label, count}` — so the screen reduces it
client-side: group by `weekStart`, sum `count`, then render each week as a `View` row with a
proportional-width inner `View` (`width: (count/maxCount) * 100 + '%'`) — plain RN primitives,
**no charting library port**. `sessionsByCollaborator` (Admin/Owner only; `null` for Member/
Sponsor/Doctor) renders as a simple sorted name/count list, identical branch to web's
`byCollaborator` array, when non-null and non-empty.
**Alternatives considered**: `react-native-svg`/`victory-native` chart lib (rejected — new
dependency for one bar chart; the DTO is lightweight weekly buckets, not worth a charting
library); porting `SessionsBarChart.tsx` as-is (rejected — it's built on `recharts`, a
web/DOM-only library, does not run on React Native).
**Rationale**: role projection already happens entirely server-side
(`GetSessionPeriodReport.cs:42-49,71-76` — Member: `CollaboratorId == userId`; Sponsor: org-wide
aggregate, `byCollaborator` stays `null`; Admin/Owner: full named breakdown) — the mobile screen
is a pure renderer, zero client-side role branching needed.

### D6 — Nav: 3 rows nested under "Más" (no 4th tab), 4 new `MoreStackParamList` routes
**Choice**: Extend `MoreStackParamList` (`navigation/TabNavigator.tsx`) with `RutaDelDia:
undefined`, `WorkRoutes: undefined`, `WorkRouteDetail: { workRouteId: string }`, `Reports:
undefined` — 4 new `<MoreStack.Screen>` entries (list+detail for routes = 2 screens). `MoreScreen`
gets 3 new `Pressable` rows (mirrors the exact `Devices`/`Notifications` row pattern) placed
**above** the existing Devices/Notifications/Logout rows (they're feature surfaces, not account
management). New es.json keys: `more.rutaDelDia`, `more.workRoutes`, `more.reports` (row labels)
+ new `rutaDelDia.*`, `workRoutes.*`, `reports.*` namespaces (titles, empty-state copy, action
labels) — no `nav.*` change (nesting under "Más", not a new tab, per the ratified UI-placement
decision).
**Alternatives considered**: a 4th bottom tab (rejected — ratified against in the proposal,
matches #9's precedent exactly, "a sometimes-empty dedicated tab would feel broken").
**Rationale**: zero new navigator files, zero cross-tab typed navigation — purely additive
`MoreStackParamList` entries + `MoreScreen` rows, the lowest-risk nav shape available.

### D7 — Cross-repo sequencing: PR0 must merge + deploy before Ruta del día works at runtime, but PR1 can be built against it immediately
**Choice**: PR0 (API) ships and deploys **first**. Mobile PR1 imports/consumes
`useMyCollaboratorProfile()` immediately — `tsc -b`/`expo-doctor`/`expo export` all pass whether
or not PR0 has deployed yet, because the hook's contract (`CollaboratorResponse | null |
undefined`) doesn't change. If PR0 hasn't deployed to the environment the device/build talks to,
`GET /collaborators/me` 404s (route doesn't exist yet → axios throws a non-ProblemDetails error,
or once deployed, a real 404) and Ruta del día renders its **honest "no profile" empty state** —
never a mocked/local-only stand-in for the endpoint. `sdd-tasks`/`sdd-apply` must treat "PR0
merged AND deployed" as a hard gate before the Ruta del día **runtime smoke test** is considered
meaningful (typecheck/build gates are not blocked by it).
**Rationale**: ratified in the proposal's "Cross-repo sequencing risk" section; this is the same
shape as change #1 (`device-bound-sessions`) — API-first, monorepo builds on a stable contract.

---

## Data flow — Ruta del día

```
useMyCollaboratorProfile()          useWorkRoute(workRouteId)         usePatients(1, 100)
  GET /collaborators/me                GET /workroutes/{id}              GET /patients?page=1&pageSize=100
  404 → null (not error)               enabled: !!workRouteId             (fetch-then-filter; no
        │                                    │                            workRouteId param exists)
        ▼                                    ▼                                  │
  profile: null ──────────▶ EmptyState "sin perfil"                             │
  profile.workRouteId==null ─────────▶ EmptyState "sin ruta asignada"           │
  profile.workRouteId ──────────────────────▶ route                            │
                                               │                                │
                                    expandOccurrences([route], today, today)    │
                                               │                                │
                                    no occurrence today ──▶ EmptyState "hoy no toca"
                                               │                                │
                                    occurrence today ◀─────────────────────────┘
                                               │
                                    filter patients by workRouteId
                                               │
                                    empty ──▶ EmptyState "sin pacientes en la ruta"
                                    non-empty ──▶ FlatList of patients
```

---

## Code sketches

**API — `CollaboratorService.cs`** (add to the existing class + interface)
```csharp
public interface ICollaboratorService
{
    ...
    Task<Result<CollaboratorResponse>> GetMeAsync(ClaimsPrincipal principal, CancellationToken ct);
}

public async Task<Result<CollaboratorResponse>> GetMeAsync(ClaimsPrincipal principal, CancellationToken ct)
{
    var userEmail = principal.FindFirstValue(ClaimTypes.Email)!;

    // Exact match (mirrors AuthService.cs:39, InvitationService.cs:43 — no case-insensitive
    // precedent in this codebase). FirstOrDefaultAsync, not Single: no unique index on
    // Collaborator.Email (only User.Email/Invitation.Email are unique-indexed).
    var collaborator = await db.Collaborators
        .AsNoTracking()
        .Where(c => c.Email == userEmail)
        .Select(c => new CollaboratorResponse(
            c.Id, c.FirstName, c.LastName, c.Email, c.PhoneNumber, c.Address,
            c.Country, c.State, c.City, c.ProfilePicture,
            c.ClinicId, c.Clinic.Name, c.WorkRouteId,
            c.Positions.Select(p => new PositionDto(p.Id, p.Name)).ToList(),
            c.IsActive))
        .FirstOrDefaultAsync(ct);

    return collaborator is not null ? collaborator : NotFound;
}
```

**API — `CollaboratorEndpoints.cs`** (add inside the existing `/collaborators` group)
```csharp
using System.Security.Claims;
...
group.MapGet("/me", async (ClaimsPrincipal principal, ICollaboratorService service, CancellationToken ct) =>
        (await service.GetMeAsync(principal, ct)).ToHttpResult())
    .WithName("GetMyCollaboratorProfile");
// No extra .RequireAuthorization(...) — inherits the group's bare RequireAuthorization().
// Registration order vs "/{id:guid}" doesn't matter: "me" fails the :guid route constraint,
// so ASP.NET Core's literal-beats-constrained-parameter precedence resolves it either way.
```

**API test — `CollaboratorCrudTests.cs`** (add; mirrors `ReportTests.cs`'s
`SeedUserAsync`/`LoginUserWithRoleAsync` pattern — TestDataSeeder's seeded Users/Collaborators
deliberately don't share emails, so a real match must be built inline per test)
```csharp
[Fact]
public async Task GetMe_WithMatchingEmail_ReturnsCollaborator()
{
    var admin = await Client(); // Owner — creates the collaborator (AdministratorOrAbove)
    var clinic = await CreateClinicAsync(admin);
    var email = $"me-{Guid.NewGuid():N}@test.local";

    await InsertUserAsync(email, "Member123!test", RoleNames.Member); // direct DbContext insert
    var collaborator = await CreateCollaboratorAsync(admin, clinic.Id, "Ana", "Match", email);

    var memberClient = await LoginAsAsync(email, "Member123!test");
    var response = await memberClient.GetAsync($"{Base}/me");

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var me = await response.Content.ReadFromJsonAsync<CollaboratorResponse>();
    me!.Id.Should().Be(collaborator.Id);
}

[Fact]
public async Task GetMe_WithNoMatchingCollaborator_Returns404()
{
    var email = $"nomatch-{Guid.NewGuid():N}@test.local";
    await InsertUserAsync(email, "Member123!test", RoleNames.Member);

    var client = await LoginAsAsync(email, "Member123!test");
    var response = await client.GetAsync($"{Base}/me");

    response.StatusCode.Should().Be(HttpStatusCode.NotFound);
}
```
> Implementation note for apply: `PostCollaboratorAsync`/`CreateCollaboratorAsync` need an
> optional `email` param (default keeps the current `colab-{guid}@test.local` auto-gen); add
> `InsertUserAsync`/`LoginAsAsync` private helpers mirroring `ReportTests.cs`'s
> `SeedUserAsync`/`LoginUserWithRoleAsync` (direct `HouseCenterDbContext` insert via
> `factory.Services.CreateAsyncScope()`, then `POST /auth/login`).

**Core — `collaborators.api.ts` / `useCollaborators.ts` additions**: see D2 above verbatim.

**Mobile — `RutaDelDiaScreen.tsx`** (new)
```tsx
export function RutaDelDiaScreen() {
  const { t } = useTranslation()
  const today = dayjs().format('YYYY-MM-DD') // device-local, never .utc()
  const { data: profile, isLoading: loadingProfile, isError } = useMyCollaboratorProfile()
  const { data: route, isLoading: loadingRoute } = useWorkRoute(profile?.workRouteId ?? '')
  const { data: patientsPage, isLoading: loadingPatients } = usePatients(1, DROPDOWN_PAGE_SIZE)

  if (isError) return <View style={styles.center}><Text>{t('common.error')}</Text></View>
  if (loadingProfile) return <LoadingState />
  if (profile === null) return <EmptyState messageKey="rutaDelDia.noProfile" />
  if (!profile.workRouteId) return <EmptyState messageKey="rutaDelDia.noRoute" />
  if (loadingRoute || !route) return <LoadingState />

  const occurrences = expandOccurrences([route], today, today)
  if (!occurrences.has(today)) return <EmptyState messageKey="rutaDelDia.noOccurrenceToday" />
  if (loadingPatients) return <LoadingState />

  const routePatients = (patientsPage?.items ?? []).filter((p) => p.workRouteId === profile.workRouteId)
  if (routePatients.length === 0) return <EmptyState messageKey="rutaDelDia.noPatients" />

  return (
    <FlatList
      data={routePatients}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <Text style={styles.row}>{item.firstName} {item.lastName}</Text>}
    />
  )
}
```

**Mobile — `WorkRoutesListScreen.tsx`** (new)
```tsx
export function WorkRoutesListScreen({ navigation }: Props) {
  const { t } = useTranslation()
  const today = dayjs().format('YYYY-MM-DD')
  const { data, isLoading, isError } = useWorkRoutes(1, DROPDOWN_PAGE_SIZE)
  const todayIds = data ? new Set((expandOccurrences(data.items, today, today).get(today) ?? []).map((r) => r.id)) : new Set()

  return (
    <QueryBoundary isLoading={isLoading} isError={isError} data={data} isEmpty={(d) => d.items.length === 0}>
      {(page) => (
        <FlatList data={page.items} keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => navigation.navigate('WorkRouteDetail', { workRouteId: item.id })}>
              <Text style={styles.routeName}>{item.routeName}</Text>
              {todayIds.has(item.id) && <Text style={styles.badge}>{t('workRoutes.today')}</Text>}
            </Pressable>
          )} />
      )}
    </QueryBoundary>
  )
}
```

**Mobile — `WorkRouteDetailScreen.tsx`** (new — read-only, "Abrir en Maps")
```tsx
export function WorkRouteDetailScreen({ route }: Props) {
  const { workRouteId } = route.params
  const { t } = useTranslation()
  const { data, isLoading, isError } = useWorkRoute(workRouteId)

  return (
    <QueryBoundary isLoading={isLoading} isError={isError} data={data}>
      {(wr) => (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>{wr.routeName}</Text>
          <Text style={styles.clinic}>{wr.clinicName}</Text>
          <Text style={styles.recurrence}>{recurrenceSummary(wr, t)}</Text>
          {wr.destinations.map((d, i) => (
            <View key={i} style={styles.stopCard}>
              <Text style={styles.stopName}>{d.name}</Text>
              <Text style={styles.stopDesc}>{d.description}</Text>
              {d.googleMapUrl && (
                <Pressable onPress={() => Linking.openURL(d.googleMapUrl!)}>
                  <Text style={styles.mapsLink}>{t('workRoutes.openInMaps')}</Text>
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </QueryBoundary>
  )
}
// recurrenceSummary(wr, t): small local pure fn — joins wr.recurrenceDays (translated) +
// "desde {recurrenceStartDate}" + (isRecurrenceIndefinite ? "" : "hasta {recurrenceEndDate}").
// Mobile-only; web has no equivalent text-summary helper to hoist from.
```

**Mobile — `ReportsScreen.tsx`** (new — RN-native bars, no recharts)
```tsx
const PRESETS = [
  { key: 'weeks4', days: 28 }, { key: 'weeks8', days: 56 },
  { key: 'months3', days: 91 }, { key: 'months6', days: 182 },
]

export function ReportsScreen() {
  const { t } = useTranslation()
  const [preset, setPreset] = useState(1) // default: last 8 weeks, matches web
  const to = dayjs().format('YYYY-MM-DD')
  const from = dayjs().subtract(PRESETS[preset].days, 'day').format('YYYY-MM-DD')
  const { data, isLoading, isError } = useSessionPeriodReport(from, to)

  return (
    <QueryBoundary isLoading={isLoading} isError={isError} data={data}>
      {(report) => {
        // weeks[] is {weekStart, attentionType, status, count} — reduce to one row per week
        const byWeek = new Map<string, number>()
        for (const w of report.weeks) byWeek.set(w.weekStart, (byWeek.get(w.weekStart) ?? 0) + w.count)
        const rows = [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b))
        const maxCount = Math.max(1, ...rows.map(([, c]) => c))
        const byCollaborator = report.sessionsByCollaborator
          ? Object.entries(report.sessionsByCollaborator).sort(([, a], [, b]) => b - a)
          : []

        return (
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.presets}>
              {PRESETS.map((p, i) => (
                <Pressable key={p.key} onPress={() => setPreset(i)} style={preset === i && styles.presetActive}>
                  <Text>{t(`reports.preset.${p.key}`)}</Text>
                </Pressable>
              ))}
            </View>
            {rows.map(([weekStart, count]) => (
              <View key={weekStart} style={styles.barRow}>
                <Text style={styles.barLabel}>{weekStart}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(count / maxCount) * 100}%` }]} />
                </View>
                <Text style={styles.barCount}>{count}</Text>
              </View>
            ))}
            {byCollaborator.length > 0 && (
              <View style={styles.byCollaborator}>
                <Text style={styles.sectionTitle}>{t('reports.byCollaborator')}</Text>
                {byCollaborator.map(([name, count]) => (
                  <View key={name} style={styles.row}>
                    <Text>{name}</Text><Text>{count}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )
      }}
    </QueryBoundary>
  )
}
```

**Mobile — `TabNavigator.tsx` / `MoreScreen.tsx` additions**
```tsx
export type MoreStackParamList = {
  MoreMain: undefined
  RutaDelDia: undefined                          // NEW
  WorkRoutes: undefined                          // NEW
  WorkRouteDetail: { workRouteId: string }        // NEW
  Reports: undefined                              // NEW
  Devices: undefined
  Notifications: undefined
}
// + 4 <MoreStack.Screen> entries analogous to Devices/Notifications

// MoreScreen.tsx — 3 new rows above Devices/Notifications (same Pressable pattern):
<Pressable style={styles.row} onPress={() => navigation.navigate('RutaDelDia')}>
  <Text style={styles.rowText}>{t('more.rutaDelDia')}</Text>
</Pressable>
<Pressable style={styles.row} onPress={() => navigation.navigate('WorkRoutes')}>
  <Text style={styles.rowText}>{t('more.workRoutes')}</Text>
</Pressable>
<Pressable style={styles.row} onPress={() => navigation.navigate('Reports')}>
  <Text style={styles.rowText}>{t('more.reports')}</Text>
</Pressable>
```

---

## File Changes

| File | Action | Description |
|---|---|---|
| `HouseCenter.Api/Features/Collaborators/CollaboratorService.cs` | Modify | +`GetMeAsync` (interface + impl) |
| `HouseCenter.Api/Features/Collaborators/CollaboratorEndpoints.cs` | Modify | +`GET /collaborators/me` |
| `HouseCenter.Api.Tests/CollaboratorCrudTests.cs` | Modify | +2 xUnit tests, +email param on create helpers, +insert/login helpers |
| `packages/core/src/api/modules/collaborators.api.ts` | Modify | +`getMe()`, existing exports untouched |
| `packages/core/src/hooks/collaborators/useCollaborators.ts` | Modify | +`useMyCollaboratorProfile`, +`collaboratorKeys.me` |
| `apps/mobile/src/screens/more/RutaDelDiaScreen.tsx` | Create | Profile → route → today's occurrence → route's patients |
| `apps/mobile/src/screens/more/WorkRoutesListScreen.tsx` | Create | List + "hoy" badge |
| `apps/mobile/src/screens/more/WorkRouteDetailScreen.tsx` | Create | Read-only detail + Maps links |
| `apps/mobile/src/screens/more/ReportsScreen.tsx` | Create | Session-period, RN-native bars |
| `apps/mobile/src/navigation/TabNavigator.tsx` | Modify | +4 `MoreStackParamList` routes/screens |
| `apps/mobile/src/screens/more/MoreScreen.tsx` | Modify | +3 rows |
| `apps/mobile/src/i18n/locales/es.json` | Modify | +`more.*`, +`rutaDelDia.*`, +`workRoutes.*`, +`reports.*` |
| `apps/web/*` | None | Build/lint regression gate only |

---

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| API integration | `GET /collaborators/me` match/no-match, auth-required | xUnit + `WebApplicationFactory` (`CollaboratorCrudTests.cs`), `dotnet test` |
| Core | New hook/api types compile, additive-only | `pnpm --filter core tsc -b` |
| Web regression | Shared core doesn't break existing app | `pnpm --filter web build` + `pnpm --filter web lint` |
| Mobile | Screens, nav param lists, `expandOccurrences`/`Linking` usage compile | `pnpm --filter mobile exec tsc --noEmit`; `expo-doctor`; `expo export` |
| Human/EAS smoke | Ruta del día end-to-end, reports role-scoping, Maps links | Requires PR0 deployed + a seeded Member whose email matches a `Collaborator` with a `workRouteId` |

No test runner for core/mobile (`strict_tdd:false`); API repo is `strict_tdd:true` → `dotnet test`
is mandatory for PR0.

---

## CRITICAL IMPL NOTES (for apply)

1. **JWT email claim** — read via `principal.FindFirstValue(ClaimTypes.Email)!`. This is the
   first place in the codebase reading an email claim (everywhere else reads
   `ClaimTypes.NameIdentifier` for `userId`); it works because `TokenService.cs:41` mints
   `JwtRegisteredClaimNames.Email` at login and ASP.NET's default inbound claim map (never
   disabled) translates it, identical to how `"sub"` becomes `ClaimTypes.NameIdentifier`.
2. **Exact, case-sensitive email match** — `c.Email == userEmail`, mirroring
   `AuthService.cs:39`/`InvitationService.cs:43`. No case-insensitive precedent exists; do not
   invent one for this endpoint. Known limitation, not actioned in v1.
3. **`FirstOrDefaultAsync`, never `SingleOrDefaultAsync`** — `Collaborator.Email` has no unique
   index/constraint (confirmed: only `User`/`Invitation` do). A duplicate must degrade to "first
   match," not 500.
4. **404-as-empty end-to-end** — server `Error.NotFound` → RFC 9457 404 → core
   `useMyCollaboratorProfile` catches it in `queryFn` and resolves `null` (never rethrows for
   404) → screens branch on `profile === null` as an `EmptyState`, never an error banner/toast.
5. **Device-local "today"** — always `dayjs().format('YYYY-MM-DD')`, never `.utc()`.
   `expandOccurrences` itself is UTC-drift-safe by construction (day-granularity comparisons);
   the mobile screen just needs to feed it the device's own calendar day, exactly like web's
   `WorkRouteCalendar.tsx`.
6. **`expandOccurrences` exact signature** — `(routes: WorkRouteResponse[], fromDate: string,
   toDate: string) => Map<string, WorkRouteResponse[]>`. Ruta del día calls it with a **singleton
   array** `[route]` and `fromDate === toDate === today`.
7. **`usePatients(page, pageSize)` has no default `page`** — always pass `usePatients(1,
   DROPDOWN_PAGE_SIZE)` explicitly; there is no `workRouteId` filter param on the wire — client
   filters after fetch. Known `DROPDOWN_PAGE_SIZE=100` clamp applies (same accepted limitation as
   every other "full list" call site in this codebase).
8. **`Linking.openURL`** only for non-null `d.googleMapUrl` (nullable on `DestinationPointDto`) —
   guard before calling, hide the link when null.
9. **NO recharts / no charting library** — `ReportsScreen` reduces `weeks[]` to one
   `{weekStart, count}` row per week client-side (sum across `attentionType`/`status`) and renders
   plain proportional-width `View` bars. `recharts` does not run on React Native; do not attempt
   to port `SessionsBarChart.tsx`.
10. **Core stays additive-only** — `collaborators.api.ts`/`useCollaborators.ts` gain new exports
    only; run the web build/lint regression gate every PR that touches `packages/core`.
11. **3-PR mapping** — PR0 `[API]` (`/collaborators/me` + xUnit test, must merge + deploy first)
    → PR1 `[MONO]` (core wrapper + work-routes read-only + Ruta del día) → PR2 `[MONO]` (reports).
    PR1 carries the flagged 400-line budget risk (calendar already dropped per the ratified
    proposal); if still tight at `sdd-tasks` time, split list vs. detail vs. Ruta del día into
    further chained slices.

---

## Migration / Rollout

No data migration. PR0 is a purely additive new endpoint + service method + test — zero
existing contract impact (nothing else calls `/collaborators/me` yet). PR1/PR2 are additive-only
core exports + new mobile screens/nav rows — no change to #5 auth, #6 patients, #7 attachments,
#8 consultations, or #9 notifications runtime. Each chained PR reverts independently; PR0 can
stay merged even if PR1/PR2 roll back (the endpoint simply goes unused).

## Open Questions

- [ ] `usePatients(1, DROPDOWN_PAGE_SIZE)` client-filtered by `workRouteId` will silently miss
      patients beyond the first 100 on a route — acceptable for v1 (mirrors the existing
      dropdown-clamp limitation), but should be tracked as a follow-up if any route grows that
      large.
- [ ] Case-sensitive email match (D1) is a known limitation if a `Collaborator.Email` was
      entered with different casing than the matching `User.Email` — flagged, not actioned.
