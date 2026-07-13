# SDD Design — Mobile Notifications & Push

## Change name
`mobile-notifications-push`

## Status
`design` (2026-07-13)

Technical HOW for proposal `mobile-notifications-push` (change #9). Two additive layers:
(1) a Notificaciones list/unread UI nested under "Más" reusing core's complete
list/unreadCount/markRead/markAllRead hooks **unmodified**, and (2) `expo-notifications`
remote push — post-login native-token registration, foreground/tap/cold-start handling,
and the app's **first `navigationRef`-based cross-tab imperative navigation**. Core gets
one small additive push-subscription surface; zero changes to existing core exports.

---

## Target structure

```
packages/core/src/
  types/notification.types.ts        ← MODIFY: add PushSubscriptionRequest (reuses DevicePlatform)
  api/modules/notifications.api.ts   ← MODIFY: add subscribePush/unsubscribePush (existing 4 exports untouched)
  hooks/notifications/usePushSubscription.ts  ← NEW (useSubscribePush/useUnsubscribePush mutation pair)

apps/mobile/src/
  navigation/
    RootNavigator.tsx        ← MODIFY: type the stack (RootStackParamList), export it
    TabNavigator.tsx         ← MODIFY: type the tab navigator (TabParamList), add Notifications
                                route to MoreStackParamList, tabBarBadge via useUnreadCount()
    navigationRef.ts         ← NEW (navigationRef + REFERENCE_ROUTES + dispatchNotificationTap)
  providers/AppProviders.tsx ← MODIFY: ref={navigationRef} on NavigationContainer, mount <PushBootstrap/>
  components/PushBootstrap.tsx ← NEW (permission/registration/listeners/cold-start dispatch)
  lib/pushToken.ts           ← NEW (cached last-registered push token; SecureStore, async)
  screens/more/
    NotificationsScreen.tsx  ← NEW (list + unread, reuses core hooks unmodified)
    MoreScreen.tsx           ← MODIFY: "Notificaciones" row; wire unsubscribePush before logout
    DevicesScreen.tsx        ← MODIFY: best-effort unsubscribePush in confirmRevokeAll()
  i18n/locales/es.json       ← MODIFY: notifications.* namespace + nav/more keys
  app.config.ts              ← MODIFY: expo-notifications plugin, googleServicesFile
  package.json                ← MODIFY: add expo-notifications ~55.0.20

apps/web/*                    ← NO code change; build/lint regression gate only (shared core)
```

Reuse unchanged: `QueryBoundary`, `EmptyState`, `useNotifications`/`useUnreadCount`/
`useMarkNotificationRead`/`useMarkAllNotificationsRead` (zero diff), `deviceId.ts`'s
SecureStore pattern (mirrored, not modified), `LoginScreen.tsx:14`'s
`Platform.OS → DevicePlatform` mapping precedent.

---

## Architecture decisions

### D1 — navigationRef contract: type the existing navigators, don't invent new ones
**Choice**: `RootNavigator.tsx` and `TabNavigator.tsx` both currently call their factory
functions untyped (`createNativeStackNavigator()`, `createBottomTabNavigator()`). Type them
in place, exporting the param list next to each navigator (matching `PatientsStack.tsx`/
`ConsultationsStack.tsx`'s existing convention of co-locating and exporting the param list):
```ts
// RootNavigator.tsx
import type { NavigatorScreenParams } from '@react-navigation/native'
import type { TabParamList } from './TabNavigator'

export type RootStackParamList = {
  Login: undefined
  Tabs: NavigatorScreenParams<TabParamList>
}
const Stack = createNativeStackNavigator<RootStackParamList>()
```
```ts
// TabNavigator.tsx
import type { NavigatorScreenParams } from '@react-navigation/native'
import type { PatientsStackParamList } from './PatientsStack'
import type { ConsultationsStackParamList } from './ConsultationsStack'

export type TabParamList = {
  Pacientes: NavigatorScreenParams<PatientsStackParamList>
  Consultas: NavigatorScreenParams<ConsultationsStackParamList>
  More: NavigatorScreenParams<MoreStackParamList>
}
export type MoreStackParamList = {
  MoreMain: undefined
  Devices: undefined
  Notifications: undefined   // NEW, PR1
}
const Tab = createBottomTabNavigator<TabParamList>()
```
`navigation/navigationRef.ts` (new) creates the ref against the root type only:
```ts
export const navigationRef = createNavigationContainerRef<RootStackParamList>()
```
Attached via `ref={navigationRef}` on `AppProviders.tsx`'s `NavigationContainer`.
**Alternatives considered**: a standalone `types/navigation.types.ts` duplicating the param
lists (rejected — two sources of truth, drifts the moment a stack adds a route); leaving
navigators untyped and casting `navigationRef.navigate(name as never, params as never)`
at the call site (rejected — defeats the entire point of introducing the ref; a typo in
`'ConsultationDetail'` would silently no-op in production).
**Rationale**: `NavigatorScreenParams<X>` composition is the documented React Navigation
pattern for typed nested navigate; exporting from the navigator file (not a parallel types
file) keeps one source of truth per stack, exactly like the `mobile-consultations` PR2
established for `PatientsStackParamList`. **The typed nested-navigate call**
(Consultas → ConsultationDetail):
```ts
navigationRef.navigate('Tabs', {
  screen: 'Consultas',
  params: { screen: 'ConsultationDetail', params: { consultationId } },
})
```
This is the app's first cross-tab imperative navigation — verified against the REAL
`RootNavigator`("Tabs")/`TabNavigator`("Consultas")/`ConsultationsStack`("ConsultationDetail")
screen names (not "MainTabs" — that name does not exist in this codebase).

### D2 — PushBootstrap lifecycle: cache-compare before every subscribe call
**Choice**: `PushBootstrap.tsx`, mounted as a sibling of `AuthBootstrap` inside
`AppProviders`'s `NavigationContainer` (both children of the same `NavigationContainer`,
neither wraps the other):
```tsx
<NavigationContainer ref={navigationRef}>
  <AuthBootstrap>{children}</AuthBootstrap>
  <PushBootstrap />
</NavigationContainer>
```
`PushBootstrap` is non-visual (`return null`) and self-gates on
`useAuthStore((s) => s.user) != null` — it does not wait for `AuthBootstrap`'s `ready` flag
because it has its own, narrower precondition (authenticated, not "device/auth hydrated").
Ordered steps (registration effect, re-runs when `user` flips null→non-null):
1. `Notifications.getPermissionsAsync()`; if not granted, `requestPermissionsAsync()`. If
   still not granted → **return silently, no throw, no blocking UI** (list screen still works).
2. Android only: `Notifications.setNotificationChannelAsync('default', {...})` (see D8).
3. `const { data: token } = await Notifications.getDevicePushTokenAsync()`.
4. `const prev = await getCachedPushToken()`. **If `token === prev`, stop — no network call.**
   This is the cache-compare that prevents a re-subscribe loop on every remount/foreground.
5. Else: `platform: DevicePlatform = Platform.OS === 'ios' ? 'iOS' : 'Android'` (mirrors
   `LoginScreen.tsx:14` exactly) → `subscribePush.mutateAsync({ token, platform })` →
   `setCachedPushToken(token)`.
6. Separate effect (mount once, cleanup on unmount): `Notifications.addPushTokenListener`
   for OS-driven rotation — runs the **same** steps 4-5 cache-compare-then-subscribe logic
   (extracted into a shared function) so a rotation event can't double-post either.
`Notifications.setNotificationHandler({...})` is called at **module scope** in
`PushBootstrap.tsx` (top of the file, outside the component) — it runs exactly once, the
first time the module is imported, regardless of auth state (it only configures how
foreground notifications are displayed; it needs no user context).
**Alternatives considered**: registering at cold-start splash before login (rejected —
proposal explicitly requires post-login: unauthenticated devices have no user to attribute
the subscription to, and the backend's `RegisterPushSubscription` re-assigns owner on
login, implying it expects an authenticated caller); re-subscribing unconditionally on every
mount (rejected — the trap this decision exists to avoid: hammering the backend on every
app foreground/focus).
**Rationale**: idempotent backend upsert-by-token means re-sending an unchanged token is
harmless but wasteful; the local cache-compare is a pure client-side optimization with no
correctness downside (worst case on cache-miss: one harmless extra upsert).

### D3 — Unsubscribe sequencing: before token-clearing, before logout, best-effort
**Choice**: exact order inside `MoreScreen.onLogout()`:
```ts
async function onLogout() {
  setLoggingOut(true)
  try {
    const token = await getCachedPushToken()
    if (token) {
      try { await unsubscribePush.mutateAsync(token) } catch { /* best-effort, swallow */ }
      await clearCachedPushToken()
    }
    await logout.mutateAsync(getDeviceId())      // existing call, unchanged position
  } finally {
    clearCache()
    setLoggingOut(false)
  }
}
```
Same best-effort call (token-only, no cache-clear needed since the session survives) added
to `DevicesScreen.confirmRevokeAll()`'s `onPress`, before `revokeAllSessions.mutate()`.
**Why before, not after**: `useLogout.ts:14-17`'s `onSettled` calls
`getAuthStore().getState().logout()` (`createAuthStore.ts:54-58`), which clears
`accessToken` **the instant the mutation settles** — success or failure. The axios request
interceptor reads `accessToken` from the store on every outgoing request. If `unsubscribePush`
fired after `logout.mutateAsync()` resolves, it would race (or lose to) that store clear and
go out unauthenticated. Firing unsubscribe first, while the token is still guaranteed live,
is the only correct ordering.
**If the unsubscribe network call fails**: swallow the error and proceed with logout/revoke-
all regardless — never block session teardown on a push-cleanup call. Backend dead-token
pruning (`PushNotificationHandler.cs` auto-prunes tokens FCM reports
`Unregistered`/`InvalidArgument`) is the accepted safety net for a missed unsubscribe.
**Alternatives considered**: fire-and-forget without awaiting (rejected — a genuine race,
not just a style choice, since the very next line clears the token needed to identify which
subscription to remove); block logout on unsubscribe success (rejected — would strand a
user mid-logout on a flaky network, exactly what "best-effort" exists to prevent).

### D4 — Listener wiring + cold-start: one-shot guarded by isReady() and auth
**Choice**: three independent effects inside `PushBootstrap`:
- **Tap listener** (mount once): `Notifications.addNotificationResponseReceivedListener`,
  cleaned up via `.remove()` on unmount. Fires `dispatchNotificationTap(data)` (D5) on every
  live tap while the app is foregrounded/backgrounded-but-running.
- **Token rotation listener** (mount once): `Notifications.addPushTokenListener` (D2 step 6).
- **Cold-start one-shot** (guarded by a `useRef(false)` flag + `[user]` dep): only runs its
  body once `user != null` **and** `navigationRef.isReady()`, calls
  `Notifications.getLastNotificationResponseAsync()` once, dispatches if non-null, then
  flips the ref so it never re-runs.
**The trap avoided**: `RootNavigator` conditionally renders **either** `Login` **or** `Tabs`
as its single screen (v7 auth-flow idiom, see `RootNavigator.tsx`'s own comment) — the
`Tabs`/`Consultas`/`ConsultationDetail` route tree does not exist in the navigator at all
until `user` is non-null. Firing `navigationRef.navigate('Tabs', {...})` before that swap
has committed is not just "too early UX", it targets a screen that is not mounted. Gating
the one-shot on **both** `navigationRef.isReady()` (the container has an active navigator)
**and** `user != null` (the conditional swap to `Tabs` has happened) closes this race for
the common case (session already restored by the time cold-start dispatch runs, since
`AuthBootstrap`'s silent refresh runs first). **Residual risk**: because `isReady()` only
asserts *some* navigator is mounted, not specifically that `ConsultationsStack` has mounted
within `Tabs`, this exact ordering needs a Human/EAS smoke pass — it cannot be fully proven
by `tsc`/`expo export` alone (flagged again in CRITICAL IMPL NOTES).
**Alternatives considered**: a fixed `setTimeout` delay before cold-start dispatch (rejected
— a timing hack, not a real gate, and either too short on slow devices or wastefully long
on fast ones); dispatching cold-start unconditionally on module load (rejected — `user` is
almost certainly still `null` at that instant, since `AuthBootstrap`'s async hydration
hasn't resolved yet).

### D5 — Deep-link routing table: REFERENCE_ROUTES lives with the ref, not with PushBootstrap
**Choice**: `navigation/navigationRef.ts` owns both the ref and the routing table (mirrors
web's `NotificationBell.tsx:14-17` `REFERENCE_ROUTES` precedent, adapted from "return a URL
string" to "perform an imperative navigate"):
```ts
export interface PushNotificationData {
  type: string
  referenceType: string | null
  referenceId: string | null
}

// Mirrors apps/web's NotificationBell.tsx REFERENCE_ROUTES — only 'Consultation' has a
// reachable standalone detail route. AttentionSession carries only sessionId (no patientId,
// no GET /sessions/{id}) and is intentionally absent from this map (see proposal Out of scope).
const REFERENCE_ROUTES: Record<string, (id: string) => void> = {
  Consultation: (id) =>
    navigationRef.navigate('Tabs', {
      screen: 'Consultas',
      params: { screen: 'ConsultationDetail', params: { consultationId: id } },
    }),
}

export function dispatchNotificationTap(data: PushNotificationData): void {
  if (!navigationRef.isReady()) return
  const toRoute = data.referenceType ? REFERENCE_ROUTES[data.referenceType] : undefined
  if (toRoute && data.referenceId) toRoute(data.referenceId)
  // AttentionSession / unknown referenceType: no-op — caller/UI may open the Notificaciones
  // list itself; this function makes no assumption about what "no-op" should show.
}
```
`PushBootstrap.tsx` imports `dispatchNotificationTap` and calls it from both the tap
listener and the cold-start one-shot — one dispatch function, two call sites, no logic
duplication.
**Alternatives considered**: defining `REFERENCE_ROUTES`/`PushNotificationData` inside
`PushBootstrap.tsx` (rejected — couples "how to navigate to a reference" with "when to
check for one"; `navigationRef.ts` is the natural single owner of navigation intent, and
keeps `PushBootstrap.tsx` focused on lifecycle timing).
**Rationale**: same reasoning as web's own comment — only reference types with a
standalone, cross-context-reachable detail route belong in this map.

### D6 — Core additive surface: two functions, one hook file, DevicePlatform reused
**Choice**: `packages/core/src/types/notification.types.ts` (add, not a new file):
```ts
import type { DevicePlatform } from './auth.types'

export interface PushSubscriptionRequest {
  token: string
  platform: DevicePlatform
}
```
`packages/core/src/api/modules/notifications.api.ts` (existing 4 exports untouched, add 2):
```ts
subscribePush: (body: PushSubscriptionRequest) =>
  getApiClient().post<void>(`${BASE}/push-subscriptions`, body).then((r) => r.data),

unsubscribePush: (token: string) =>
  getApiClient().delete<void>(`${BASE}/push-subscriptions/${token}`).then((r) => r.data),
```
`packages/core/src/hooks/notifications/usePushSubscription.ts` (new file):
```ts
export function useSubscribePush() {
  return useMutation({ mutationFn: (body: PushSubscriptionRequest) => notificationsApi.subscribePush(body) })
}
export function useUnsubscribePush() {
  return useMutation({ mutationFn: (token: string) => notificationsApi.unsubscribePush(token) })
}
```
No query invalidation — push subscription state isn't cached/rendered anywhere, unlike
`useMarkNotificationRead`'s `invalidateQueries`.
**Alternatives considered**: folding subscribe/unsubscribe into `useNotifications.ts`
(rejected — that file is explicitly required to stay a zero-diff; a new concern gets a new
file, mirroring how `mobile-consultations` hoisted a schema into its own new file rather
than editing an existing one); a new `DevicePlatform`-like `PushPlatform` type mirroring the
backend enum name (rejected — the backend's `PushPlatform` enum values (`Android|iOS|Web`)
are identical to core's existing `DevicePlatform`; introducing a second identical type is
pure duplication the exploration explicitly flagged against).
**Rationale**: additive-only in both files; `apps/web` never imports either new export, so
the web bundle is byte-unchanged (verified by the build/lint regression gate, not by
inspection alone).

### D7 — Unread badge: reuse useUnreadCount() as-is, rely on query-key dedup
**Choice**: `TabNavigator()` calls `useUnreadCount()` (unmodified core hook) and sets
`tabBarBadge` on the "More" `Tab.Screen`:
```tsx
export function TabNavigator() {
  const { t } = useTranslation()
  const { data: unread } = useUnreadCount()
  const badge = unread?.count ?? 0
  return (
    <Tab.Navigator>
      {/* Pacientes, Consultas unchanged */}
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{ title: t('nav.more'), headerShown: false, tabBarBadge: badge > 0 ? badge : undefined }}
      />
    </Tab.Navigator>
  )
}
```
**Reconciling with over-fetch concern**: `TabNavigator` is mounted for the app's entire
authenticated lifetime, and `NotificationsScreen` will *also* call `useUnreadCount()` while
open. TanStack Query dedupes subscribers sharing the same query key — both call sites share
one network request per interval, not two. The hook's existing
`refetchInterval: 60_000` (unmodified — `useNotifications.ts` is a hard zero-diff
constraint) is accepted as-is for badge freshness; no `staleTime` tuning is possible without
touching core, and 60s is adequate for a low-urgency unread count.
**Offline/persisted-cache story**: `PersistQueryClientProvider` (`AppProviders.tsx`) already
persists this query; offline, the badge shows the last-cached count rather than blanking,
consistent with the rest of the app's offline-read story.
**Alternatives considered**: a dedicated lightweight badge-only query with a longer
`staleTime` (rejected — requires touching core's `useNotifications.ts`, violating the
proposal's zero-diff constraint for that file, for a marginal fetch-count saving that
query-dedup already provides for free).

### D8 — Config plugin: expo-notifications + googleServicesFile + API-26 channel guard
**Choice**: `app.config.ts` additions:
```ts
plugins: [
  'expo-localization',
  '@react-native-community/datetimepicker',
  ['expo-image-picker', { /* existing */ }],
  ['expo-notifications', {
    icon: './assets/notification-icon.png',
    color: '#2563eb',
  }],
],
android: {
  package: 'net.housecenter.mobile',
  googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
},
```
iOS APNs entitlement is an EAS/Apple Developer credentials concern (push capability + APNs
key), not an `app.config.ts` field — configured via `eas credentials` at build time, not in
this file.
**Android channel API-26 guard**: `Notifications.setNotificationChannelAsync('default', {...})`
(called from `PushBootstrap`, D2 step 2) is Android-only and, per Expo's own implementation,
a safe no-op below API 26 (channels don't exist pre-Oreo) — but this is a **native runtime
claim**, not something `tsc`/`expo export` can verify. minSdk is 24 (`app.config.ts:18`,
already verified via `expo-doctor` in a prior change) — this decision must be re-confirmed
at apply time against the installed `expo-notifications` version's actual behavior on an
API-24/25 emulator, not assumed from documentation alone.
**Dev-client rebuild**: `expo-notifications` is a native module — adding it changes the
native surface, forcing a **new dev-client build** (`expo-dev-client` already installed,
`eas.json` profiles already exist per exploration point 8). `expo export`/`tsc --noEmit`
verify the JS/TS surface only; real permission prompts, token registration, and delivery
require a Human/EAS smoke pass on the new dev-client build — this cannot be gated by any
automated command in this repo.
**Alternatives considered**: skipping the config plugin and manually editing native
projects (rejected — this app has no checked-in `ios`/`android` folders; it's a managed
Expo workflow, config-plugin is the only sanctioned path); a custom notification icon
generated at apply time (deferred — a placeholder icon path is acceptable for PR2b, real
asset is a design/content task, not architecture).

---

## Push lifecycle sequence

```
Cold start                     Post-login                        Tap (live or cold-start)
──────────                     ───────────                        ─────────────────────────
bootstrap.ts (module load)     PushBootstrap effect (user!=null)  addNotificationResponseReceivedListener
  initDeviceId()                 1. getPermissionsAsync()           OR getLastNotificationResponseAsync()
PushBootstrap.tsx (module load)    → request if needed                   │
  setNotificationHandler()         → denied? return, no throw          data:{type,referenceType,referenceId}
AppProviders                     2. Android: setNotificationChannelAsync    │
  NavigationContainer            3. getDevicePushTokenAsync() → token       ▼
    ref={navigationRef}          4. getCachedPushToken() → prev       dispatchNotificationTap(data)
    AuthBootstrap (gate)           if token===prev: STOP                    │
    PushBootstrap (self-gated)   5. subscribePush({token,platform})    REFERENCE_ROUTES[referenceType]?
                                  6. setCachedPushToken(token)              │
                                                                    'Consultation' → navigationRef.navigate(
                                  [separate effect, mount-once]        'Tabs',{screen:'Consultas',params:
                                    addPushTokenListener → 4-5 again    {screen:'ConsultationDetail',
                                                                         params:{consultationId}}})
                                  [cold-start one-shot, ref-guarded]  else (AttentionSession/unknown) → no-op
                                    if user && navigationRef.isReady()
                                      && !handledRef.current:
                                        handledRef.current = true
                                        getLastNotificationResponseAsync()
                                        → dispatchNotificationTap(data)

Logout (MoreScreen.onLogout)                    Revoke-all (DevicesScreen.confirmRevokeAll)
─────────────────────────────                    ────────────────────────────────────────
getCachedPushToken() → token                     getCachedPushToken() → token (current device only)
if token: unsubscribePush(token) [best-effort]   if token: unsubscribePush(token) [best-effort]
clearCachedPushToken()                           revokeAllSessions.mutate()
logout.mutateAsync(deviceId)  ← accessToken cleared onSettled AFTER unsubscribe already fired
```

---

## CRITICAL IMPL NOTES (for apply)

1. **Cold-start-before-ready race** (D4): `RootNavigator` renders `Login` OR `Tabs` as its
   *only* screen — `Tabs`'s subtree (incl. `ConsultationDetail`) doesn't exist pre-auth.
   Gate the cold-start dispatch on `navigationRef.isReady() && user != null`, guarded by a
   `useRef` so it only ever fires once per app session. Verify the exact timing on a real
   device — this is a genuine residual risk `tsc`/`expo export` cannot catch.
2. **Unsubscribe-before-logout ordering** (D3): `useLogout.ts`'s `onSettled` clears
   `accessToken` the instant the mutation settles. `unsubscribePush` MUST fire and be
   awaited **before** `logout.mutateAsync()`, using the still-live token. Never reorder.
3. **Cache-compare to avoid re-subscribe loops** (D2): every code path that calls
   `subscribePush` (initial mount effect AND the `addPushTokenListener` rotation handler)
   must go through the same `getCachedPushToken()` compare-then-write logic. Extract it into
   one shared function inside `PushBootstrap.tsx` — do not duplicate the comparison inline
   in two places, it will drift.
4. **Permission-denied must never throw**: `requestPermissionsAsync()` returning
   `status !== 'granted'` is an expected, common outcome (not an error) — return early, no
   `Alert`, no console.error. The Notificaciones list screen works identically either way.
5. **Typed nested-navigate exact shape**: `navigationRef.navigate('Tabs', { screen:
   'Consultas', params: { screen: 'ConsultationDetail', params: { consultationId } } })`.
   Screen names are `'Tabs'`, `'Consultas'`, `'ConsultationDetail'` — verified against the
   real files, not assumed (`'MainTabs'` does not exist anywhere in this codebase).
6. **Android channel API-26 guard**: `setNotificationChannelAsync` is a documented no-op
   pre-API-26, but this app's minSdk is 24 — confirm on a real API-24/25 emulator during the
   Human/EAS smoke pass, don't rely on documentation alone.
7. **Keep push tokens out of logs**: never `console.log`/log the raw token string in error
   handlers around `subscribePush`/`unsubscribePush`; if diagnostic logging is added, log a
   truncated form (e.g. `token.slice(0, 8) + '…'`) — tokens are less sensitive than refresh
   tokens but still device-identifying.
8. **Three-slice PR mapping** (unchanged from proposal, restated for apply sequencing):
   - **PR1** — `NotificationsScreen` (list/unread, reuses core hooks, no push) + `Notifications`
     route on `MoreStackParamList` + "Notificaciones" row on `MoreScreen` + `tabBarBadge` via
     `useUnreadCount()` (D7). No native deps.
   - **PR2a** — `navigationRef.ts` + typed `RootStackParamList`/`TabParamList` (D1) +
     `REFERENCE_ROUTES`/`dispatchNotificationTap` (D5). Pure TS, `ref={navigationRef}`
     attached but unused until PR2b wires a caller — zero runtime behavior change, no human
     smoke needed.
   - **PR2b** — core additive surface (D6); `expo-notifications` dep + config plugin (D8);
     `PushBootstrap` (D2, D3, D4); unsubscribe wiring in `MoreScreen`/`DevicesScreen` (D3).
     Highest risk — **Human/EAS smoke required** (new dev-client build): permission prompt,
     real device registers + backend upserts, foreground banner, live tap deep-links to
     `ConsultationDetail`, cold-start tap deep-links after launch, logout unsubscribes.

---

## Verification

- **Core**: `pnpm --filter core tsc -b` (new `PushSubscriptionRequest` type-checks against
  `subscribePush`/`unsubscribePush`; existing 4 exports' signatures unchanged).
- **Web regression**: `pnpm --filter web build` + `pnpm --filter web lint` — additive-only
  core must not break the existing web app; web bundle byte-unchanged.
- **Mobile**: `pnpm --filter mobile exec tsc --noEmit` (typed `RootStackParamList`/
  `TabParamList`/nested-navigate call all compile); `expo-doctor`; `expo export`.
- **Human/EAS smoke** (PR2b only, new dev-client build required): permission prompt appears
  once post-login; real device token registers, backend upserts (verify via API); foreground
  banner displays; live tap deep-links to `ConsultationDetail{consultationId}`; cold-start
  tap (app killed, notification tapped from tray) deep-links after launch; logout
  unsubscribes (verify token removed server-side); Android API-24/25 emulator doesn't crash
  on channel setup.

## Rollback

- **Core additive surface (PR2b)** — two new functions + one new hook file; zero change to
  `useNotifications.ts`/existing exports; revert is atomic, web bundle byte-unchanged.
- **PR1** — one new screen + one route + a tab badge; revert removes with zero data impact.
- **PR2a** — inert until PR2b wires a caller; a ref + typed param lists with no runtime
  behavior change; reverting is pure file removal.
- **PR2b** — highest-risk slice: reverting removes `expo-notifications` + its config plugin
  + `PushBootstrap` + unsubscribe wiring; requires a new dev-client rebuild to fully drop the
  native module. No data/contract impact — backend's existing dead-token pruning already
  tolerates stale/missing subscriptions. Each chained PR reverts independently; revert
  `feat/mobile-notifications-push` to remove the whole feature.
