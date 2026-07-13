# SDD Spec — Mobile Notifications & Push

## Requirements

### R1 — Core additive push-subscription surface
`packages/core/src/api/modules/notifications.api.ts` MUST gain two new exported functions:
`subscribePush({token, platform})` → `POST /notifications/push-subscriptions`, and
`unsubscribePush(token)` → `DELETE /notifications/push-subscriptions/{token}`, reusing the existing
`DevicePlatform` type from `types/auth.types.ts` (no new type). The 4 existing exports (`list`,
`unreadCount`, `markRead`, `markAllRead`) MUST keep identical signatures. A new file
`packages/core/src/hooks/notifications/usePushSubscription.ts` MUST export `useSubscribePush()` /
`useUnsubscribePush()` mutation hooks (mirrors `useMarkNotificationRead`'s shape); `useNotifications.ts`
MUST remain untouched (zero diff). Because core is shared, `apps/web` MUST stay byte-unchanged and
`pnpm --filter web build` / `pnpm --filter web lint` MUST remain green.

### R2 — `expo-notifications` dependency & config plugin
`apps/mobile/package.json` MUST add `expo-notifications ~55.0.20`; `app.config.ts` MUST configure its
Expo config plugin (Android notification channel name/icon/color) and add `googleServicesFile`
(required for Android native-token init) plus an iOS APNs entitlement (via EAS). Android notification
channels are API-26+ only; on the app's API-24 floor, channel creation MUST be a documented no-op and
MUST NOT throw or crash.

### R3 — Permission request & native-token registration lifecycle
A new non-visual `PushBootstrap` component, mounted as a sibling of `AuthBootstrap` inside
`AppProviders`'s `NavigationContainer`, MUST gate permission request + registration on
`useAuthStore((s) => s.user) != null` (post-login, NOT cold-start splash). Once eligible it MUST
request notification permission, resolve `getDevicePushTokenAsync()` (native FCM/APNs token — NOT
`getExpoPushTokenAsync()`), and call `useSubscribePush()` with `{token, platform}` where `platform`
is derived from `Platform.OS`. The last-registered token MUST be cached locally via a new
`apps/mobile/src/lib/pushToken.ts` (mirrors `deviceId.ts`'s SecureStore + sync-getter pattern).
Registration MUST re-fire on `addPushTokenListener` token-change events (backend upsert-by-token is
idempotent). WHEN permission is denied, the app MUST degrade gracefully — the notifications list and
all other functionality MUST continue to work, with no blocking UI.

### R4 — Unsubscribe lifecycle (logout & revoke-all)
`unsubscribePush(cachedToken)` MUST fire before `logout.mutateAsync()` inside
`MoreScreen.onLogout()` (core's `useLogout` clears `accessToken` in `onSettled`, so ordering is
load-bearing). `DevicesScreen.confirmRevokeAll()` MUST also best-effort call
`unsubscribePush(cachedToken)` for the current device's own token only (the client cannot reach other
devices' tokens). Both calls MUST be best-effort — a failure MUST NOT block or fail the
logout/revoke-all flow (backend dead-token pruning is the safety net).

### R5 — Foreground handling, tap deep-link & navigation infra
A new `apps/mobile/src/navigation/navigationRef.ts` MUST export a `navigationRef`
(`createNavigationContainerRef`) plus typed `RootParamList` and per-tab param lists, attached via
`ref={navigationRef}` on `AppProviders`'s `NavigationContainer` (the app's first cross-tab imperative
navigation). A `REFERENCE_ROUTES` lookup MUST map ONLY `"Consultation"` → Consultas tab →
`ConsultationDetail{consultationId}` (mirrors web's `NotificationBell`); any other `referenceType`
(including `"AttentionSession"`) MUST NOT navigate — tapping such a notification MUST just open the
Notificaciones list (no-op, no crash). `setNotificationHandler` MUST control foreground display;
`addNotificationResponseReceivedListener` MUST handle live taps; `getLastNotificationResponseAsync()`
MUST handle cold-start taps, dispatched only once both `navigationRef.isReady()` and auth resolution
are true.

### R6 — In-app notifications list & unread actions
`NotificationsScreen` (new, `screens/more/`) MUST reuse core's `useNotifications`, `useUnreadCount`,
`useMarkNotificationRead`, and `useMarkAllNotificationsRead` hooks unmodified to render the list with
unread state, support marking a single notification read and marking all read, and support
pull-to-refresh. The list MUST be wrapped in `QueryBoundary`/`EmptyState`. All write actions
(mark-read, mark-all-read) MUST be gated on `useOnline()` and disabled/hidden when offline; reads
MUST continue to render from the persisted TanStack Query cache while offline. New strings MUST be
Spanish-first under a new `notifications` i18n namespace.

### R7 — Tab-level unread badge & "Más" entry point
`TabNavigator` MUST register `NotificationsScreen` as `Notifications` on `MoreStackParamList`
(mirrors `Devices`), and MUST read `useUnreadCount()` to set a `tabBarBadge` on the "More" tab
reflecting the current unread count (no badge when count is 0). `MoreScreen` MUST add a
"Notificaciones" row navigating to the new route. No 4th bottom tab MUST be introduced.

### R8 — Non-functional constraints
Client-side code MUST NOT log notification `title`/`body` content (no PHI in client logs); the
notification body/text content itself is backend-controlled and is explicitly OUT OF SCOPE for this
change (flagged upstream, not fixed client-side — see proposal's PHI-in-push-body note). All new
behavior MUST function on the existing Android 7 (API 24) / iOS 15.1 floor. All new mobile strings
MUST be Spanish-first.

## Scenarios

#### Scenario: core-additive-typechecks
Traces: R1
- GIVEN `subscribePush`/`unsubscribePush` and `usePushSubscription.ts` are added
- WHEN `pnpm --filter core exec tsc -b` runs
- THEN it exits 0 with no type errors

#### Scenario: web-build-unbroken
Traces: R1
- GIVEN core is touched additively only and `apps/web` has zero code changes
- WHEN `pnpm --filter web build` and `pnpm --filter web lint` run
- THEN both pass with no regressions, and `git diff` shows zero lines changed under `apps/web`

#### Scenario: mobile-typechecks
Traces: R2, R3, R4, R5, R6, R7
- GIVEN `PushBootstrap`, `navigationRef.ts`, `NotificationsScreen`, and the tab/badge wiring are implemented
- WHEN `pnpm --filter mobile exec tsc --noEmit` runs
- THEN it exits 0 with no type errors

#### Scenario: expo-doctor-clean
Traces: R2
- GIVEN `expo-notifications` + its config plugin + `googleServicesFile` are added
- WHEN `npx expo-doctor` runs in `apps/mobile`
- THEN no failing checks are reported

#### Scenario: expo-export-bundles
Traces: R2, R3, R4, R5, R6, R7
- GIVEN all new screens/components/navigation infra are wired
- WHEN `npx expo export` runs in `apps/mobile`
- THEN the export succeeds with no bundling errors

#### Scenario: notifications-list-renders-from-cache
Traces: R6
- GIVEN a previously-fetched notifications page is persisted in the TanStack Query cache
- WHEN `NotificationsScreen` renders via `useNotifications()` inside `QueryBoundary`/`EmptyState`
- THEN the cached list displays, including while offline

#### Scenario: mark-read-and-mark-all-read-update-state
Traces: R6
- GIVEN an unread notification is visible in the list
- WHEN the user marks it read (single) and then taps "mark all read"
- THEN `useMarkNotificationRead`/`useMarkAllNotificationsRead` fire, the query cache invalidates, and
  the item(s) reflect `isRead: true` on refetch

#### Scenario: android-channel-noop-below-api26
Traces: R2
- GIVEN the app runs on Android API 24 (the floor)
- WHEN code-traced against the channel-creation guard
- THEN channel setup is skipped as a documented no-op and does not throw

#### Scenario: unread-badge-reflects-count
Traces: R7
- GIVEN `useUnreadCount()` returns a non-zero count
- WHEN `TabNavigator` renders the "More" tab
- THEN `tabBarBadge` displays that count, and displays no badge when the count is 0

#### Scenario: offline-blocks-writes
Traces: R6
- GIVEN the device has no connectivity (`useOnline() === false`)
- WHEN the user attempts mark-read or mark-all-read on `NotificationsScreen`
- THEN the write controls are disabled/hidden (code trace of the gating guard), while the cached list
  still renders

#### Scenario: reference-routes-maps-consultation-only
Traces: R5
- GIVEN `REFERENCE_ROUTES` as defined in `navigationRef.ts`
- WHEN code-traced for `referenceType === "Consultation"`
- THEN it resolves to Consultas tab → `ConsultationDetail{consultationId}`, and no other key is
  registered

#### Scenario: attention-session-tap-is-noop
Traces: R5
- GIVEN a notification with `referenceType === "AttentionSession"`
- WHEN the tap-handling code path is code-traced against `REFERENCE_ROUTES`
- THEN no navigation occurs (lookup miss falls through to opening the Notificaciones list), with no
  crash

#### Scenario: permission-prompt-and-registration **(Human/EAS smoke)**
Traces: R3
- GIVEN a user logs in on a dev-client build with push credentials configured
- WHEN `PushBootstrap` mounts post-login
- THEN the OS permission prompt appears, and granting it resolves a native device token

#### Scenario: token-registers-subscription-post **(Human/EAS smoke)**
Traces: R3
- GIVEN permission is granted and `getDevicePushTokenAsync()` resolves
- WHEN `useSubscribePush()` fires
- THEN the backend receives `POST /notifications/push-subscriptions` and upserts the subscription
  (verified via API logs/DB)

#### Scenario: foreground-push-received **(Human/EAS smoke)**
Traces: R2, R5
- GIVEN a registered device with the app in the foreground
- WHEN the backend sends a push
- THEN `setNotificationHandler` displays it (banner/alert) without crashing

#### Scenario: tap-live-deep-links-to-consultation-detail **(Human/EAS smoke)**
Traces: R5
- GIVEN the app is running (foreground or backgrounded, not killed) and receives a push with
  `referenceType: "Consultation"`
- WHEN the user taps the notification
- THEN `addNotificationResponseReceivedListener` fires and the app navigates to Consultas →
  `ConsultationDetail{consultationId}`

#### Scenario: tap-cold-start-deep-links-to-consultation-detail **(Human/EAS smoke)**
Traces: R5
- GIVEN the app was fully killed and a `"Consultation"` push is tapped to launch it
- WHEN `getLastNotificationResponseAsync()` resolves after `navigationRef.isReady()` and auth is
  resolved
- THEN the app navigates to `ConsultationDetail{consultationId}` (not a race/blank screen)

#### Scenario: logout-unsubscribes **(Human/EAS smoke)**
Traces: R4
- GIVEN a registered device with an active push subscription
- WHEN the user logs out via `MoreScreen.onLogout()`
- THEN `unsubscribePush(cachedToken)` completes before `logout.mutateAsync()`, and the backend no
  longer has that subscription

#### Scenario: revoke-all-stops-push **(Human/EAS smoke)**
Traces: R4
- GIVEN a registered device, the user triggers `DevicesScreen.confirmRevokeAll()`
- WHEN the flow completes
- THEN the current device's push subscription is best-effort removed and no further push is
  delivered to that device

## API surface

| Method / Path | Body | Notes |
|---|---|---|
| `POST /notifications/push-subscriptions` | `{ token: string, platform: DevicePlatform }` | Upserts by token (existing backend endpoint); wrapped by new `subscribePush`. |
| `DELETE /notifications/push-subscriptions/{token}` | — | Idempotent, scoped to caller; wrapped by new `unsubscribePush`. |
| `GET /notifications` | query `{page?, pageSize?, unreadOnly?}` | Existing, unchanged — wrapped by `notificationsApi.list`. |
| `GET /notifications/unread-count` | — | Existing, unchanged. |
| `PATCH /notifications/{id}/read` | — | Existing, unchanged. |
| `POST /notifications/read-all` | — | Existing, unchanged. |

## DTOs

```ts
// New — push-subscription request (core additive surface)
export interface PushSubscriptionRequest {
  token: string
  platform: DevicePlatform // 'Android' | 'iOS' | 'Web' — reused from types/auth.types.ts
}

// Existing, unchanged — packages/core/src/types/notification.types.ts
export type NotificationType =
  | 'ConsultationMessage' | 'ConsultationOpened' | 'ConsultationResolved'
  | 'SessionUpcoming' | 'SessionMissed'

export interface NotificationResponse {
  id: string
  type: NotificationType
  title: string
  body: string
  referenceType: string | null   // 'Consultation' | 'AttentionSession' | null
  referenceId: string | null
  isRead: boolean
  readAt: string | null
  createdDate: string
}

export interface UnreadCountResponse { count: number }
```

## Validation rules

- `token` MUST be a non-empty string before `subscribePush`/`unsubscribePush` is invoked.
- `platform` MUST be derived from `Platform.OS` (never hardcoded); on mobile this always resolves to
  `'Android'` or `'iOS'` (the `'Web'` member of `DevicePlatform` is never sent from `apps/mobile`).
- `DevicePlatform` values MUST match the backend `PushPlatform` enum (`Android | iOS | Web`) —
  DTO-enum-matches-API rule.
- No client-side gate is required on the notification list/unread-count reads — the backend already
  scopes results to the authenticated user.
- The `REFERENCE_ROUTES` lookup MUST be a pure function keyed only on `referenceType === "Consultation"`;
  any other or unknown value MUST fall through to the no-op list-open behavior, never throw.

## Verification rules

| Check | Command | Expected |
|---|---|---|
| Core typecheck | `pnpm --filter core exec tsc -b` | exits 0 |
| Web regression | `pnpm --filter web build && pnpm --filter web lint` | both pass; zero diff under `apps/web` |
| Mobile typecheck | `pnpm --filter mobile exec tsc --noEmit` | exits 0 |
| Expo config sanity | `npx expo-doctor` (in `apps/mobile`) | no failing checks |
| Mobile bundlable | `npx expo export` (in `apps/mobile`) | export succeeds |
| REFERENCE_ROUTES scope | code trace of `navigationRef.ts` | only `"Consultation"` registered; `"AttentionSession"` falls through to no-op |
| Android floor safety | code trace of channel-creation guard | no-op below API 26, no throw |
| Write-gating | code trace of `NotificationsScreen` mark-read/mark-all handlers | `useOnline()` guard present before every mutate call |
| Human/EAS smoke | manual dev-client run with real push credentials + device | permission-prompt-and-registration, token-registers-subscription-post, foreground-push-received, tap-live-deep-links-to-consultation-detail, tap-cold-start-deep-links-to-consultation-detail, logout-unsubscribes, revoke-all-stops-push all behave per the Scenarios marked **(Human/EAS smoke)** |
