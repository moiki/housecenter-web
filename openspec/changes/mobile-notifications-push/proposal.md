# SDD Proposal — Mobile Notifications & Push

## Change name
`mobile-notifications-push`

## Status
`proposed` (2026-07-13)

## Problem

Change #9 of the master plan (8/11 done): a **Notificaciones** surface + **remote push** for
`apps/mobile`. Core already ships a complete in-app notifications data layer
(list/unreadCount/markRead/markAllRead) but **zero mobile UI** consumes it, and **zero
push-subscription surface** exists anywhere (core or mobile). The API already fully implements
push register/remove (upsert-by-token, dead-token pruning, raw-FCM delivery via FirebaseAdmin) —
proposal #5 explicitly deferred **all** push register/deregister work to this change. Two
non-obvious gaps block a naive build:

1. The backend requires the **native device token** (`getDevicePushTokenAsync()`), not Expo's
   own push token — `FirebasePushSender.cs` builds `MulticastMessage` from raw FCM tokens.
2. Deep-linking a push tap into a different tab needs the app's **first `navigationRef`-based
   cross-tab navigation** — `RootNavigator`/`TabNavigator` are entirely untyped today.

Branch off `main` (all #1–#8 merged).

## Proposed change

Two additive layers, reusing #5/#6/#7/#8 primitives: (1) an in-app **Notificaciones** list/unread
UI nested under **"Más"** (mirrors Devices) with a tab-level unread badge, calling core's existing
hooks **unmodified**; (2) remote **push** via `expo-notifications` — post-login permission +
native-token registration, foreground/tap/cold-start handling, and tap-to-deep-link routed through
a new `navigationRef`. Core gets one small **additive** push-subscription surface; zero changes to
existing core exports — web bundle byte-unchanged (the #7/#8 additive-only discipline holds).
`AttentionSession` notifications remain non-deep-linkable (mirrors web's own accepted limitation);
tapping one just opens the list. This diverges from the master plan's literal "Notificaciones tab"
wording — see Open Q7.

## Core change

One new file + two new exported functions. **No existing export signatures change.**

| File | Change |
|---|---|
| `packages/core/src/api/modules/notifications.api.ts` | Add `subscribePush({token, platform})` → `POST /notifications/push-subscriptions`; `unsubscribePush(token)` → `DELETE /notifications/push-subscriptions/{token}`. Reuses existing `DevicePlatform` from `types/auth.types.ts` — no new type. Existing 4 exports untouched. |
| `packages/core/src/hooks/notifications/usePushSubscription.ts` | **New file** — `useSubscribePush()` / `useUnsubscribePush()` mutation pair (mirrors `useMarkNotificationRead`'s shape). `useNotifications.ts` untouched — zero diff. |

Because core is shared, PR2b (below) carries a **web build/lint regression gate** despite the
change being additive-only.

## Mobile push lifecycle & navigation

1. **Registration** — `PushBootstrap` (new, non-visual, mounted as a sibling of `AuthBootstrap`
   inside `AppProviders`'s `NavigationContainer`), gated on `useAuthStore((s) => s.user) != null`
   — **post-login, not cold-start splash**. Requests permission, resolves
   `getDevicePushTokenAsync()`, calls `useSubscribePush()`, caches the last-registered token via a
   new `lib/pushToken.ts` (mirrors `deviceId.ts`'s SecureStore + sync-getter pattern), re-registers
   on `addPushTokenListener` (backend upsert-by-token is idempotent — safe to re-send). Permission
   denial is handled gracefully: the list still works, no blocking UI.
2. **Unsubscribe** — `unsubscribePush(cachedToken)` fires **before** `logout.mutateAsync()` inside
   `MoreScreen.onLogout()` (core's `useLogout` clears `accessToken` in `onSettled`, so ordering
   matters). Best-effort also wired into `DevicesScreen.confirmRevokeAll()` (current device's own
   token only — the client cannot reach other devices' tokens). Both best-effort: backend dead-token
   pruning is the safety net for a missed call.
3. **Foreground/tap/cold-start** — `setNotificationHandler` (foreground display),
   `addNotificationResponseReceivedListener` (live tap → deep-link), `getLastNotificationResponseAsync()`
   (cold-start tap, deferred until `navigationRef.isReady()` **and** auth is resolved).
4. **Deep-link routing** — new `navigation/navigationRef.ts`: `createNavigationContainerRef` +
   typed `RootParamList`/tab param lists, attached via `ref={navigationRef}` on `AppProviders`'s
   `NavigationContainer` — the app's **first** cross-tab imperative navigation. `REFERENCE_ROUTES`
   maps **only** `"Consultation"` → Consultas tab → `ConsultationDetail{consultationId}` (mirrors
   web's `NotificationBell`). `AttentionSession` has no reachable route (only `sessionId`, no
   `patientId`, no `GET /sessions/{id}`) — tapping one just opens the Notificaciones list, no-op.
5. **UI** — `NotificationsScreen` (new, `screens/more/`) reuses `useNotifications` /
   `useUnreadCount` / `useMarkNotificationRead` / `useMarkAllNotificationsRead` as-is (list +
   mark-read/all, `QueryBoundary`/`EmptyState`), registered as `Notifications` in
   `MoreStackParamList` (mirrors `Devices`), linked from a new row on `MoreScreen`. `TabNavigator`
   reads `useUnreadCount()` to set `tabBarBadge` on the "More" tab — no 4th tab.
6. **Config** — `expo-notifications ~55.0.20` + its config plugin (Android channel/icon/color);
   `googleServicesFile` added to `app.config.ts` for Android native-token init; iOS APNs
   entitlement via EAS. `expo-dev-client` already installed, `eas.json` profiles already exist —
   only a **new dev-client build** is needed.

## Scope

- Core additive surface: `subscribePush`/`unsubscribePush` + `useSubscribePush`/`useUnsubscribePush`
  (reusing `DevicePlatform`); zero changes to existing core exports.
- `NotificationsScreen` (list + unread, reusing core hooks unmodified) nested under "Más"; tab-level
  unread badge on the "More" tab.
- `navigationRef` + typed `RootParamList`/tab param lists + `REFERENCE_ROUTES` (`Consultation` only)
  — the app's first cross-tab imperative navigation.
- `PushBootstrap`: post-login permission + `getDevicePushTokenAsync()` registration + local token
  caching (mirrors `deviceId.ts`) + re-register on `addPushTokenListener`.
- Unsubscribe wiring: before `logout.mutateAsync()` in `MoreScreen`; best-effort in `DevicesScreen`'s
  revoke-all (current device only).
- Foreground display, live tap, cold-start tap — all deep-linking via `REFERENCE_ROUTES`.
- `expo-notifications` config plugin (Android channel/icon/color), `googleServicesFile`, iOS APNs
  entitlement; new dev-client build.
- Spanish-first i18n (`notifications` namespace).

## Out of scope

- **PHI-in-push-body** — consultation `Title` (free text) flows verbatim into the FCM title/body,
  a lock-screen PHI leak risk. Backend/product gap; #9 **cannot fix it client-side**. Flag upstream.
- **`AttentionSession` deep-link** — no reachable target (`sessionId` only, no `patientId`, no
  `GET /sessions/{id}`); accept as non-deep-linkable, mirroring web.
- **Admin/Doctor/Sponsor push parity** beyond what the shared register/remove/deliver endpoints
  already give — no role-specific push logic added.
- **Push delivery ops setup** (FCM/APNs credentials, `Push:CredentialsJson`) — a backend/ops
  prerequisite outside this change's control; `LoggingPushSender` (log-only) ships if left blank.
- Any backend/API change (contract already fully supports register/remove/deliver).

## Open questions (positions taken)

| # | Question | Position taken |
|---|---|---|
| 1 | Core surface | **Smallest additive fix**: `subscribePush`/`unsubscribePush` on `notificationsApi` + a new `usePushSubscription.ts` mutation-hook pair, reusing `DevicePlatform`. Zero changes to existing core exports — web bundle byte-unchanged (#7/#8 discipline). |
| 2 | Token type | **`getDevicePushTokenAsync()`** (native FCM/APNs), NOT `getExpoPushTokenAsync()` — confirmed against `FirebasePushSender.cs`'s raw-FCM-token design. |
| 3 | Registration lifecycle | **Post-login** via `PushBootstrap` gated on `user != null` (not cold-start splash); cache last-registered token (mirrors `deviceId.ts`); re-register on `addPushTokenListener` (idempotent backend upsert); permission-denied degrades gracefully — list still works. |
| 4 | Unsubscribe sequencing | Fire `unsubscribePush(token)` **before** `logout.mutateAsync()` in `MoreScreen.onLogout()` (logout clears `accessToken` on settle); best-effort also in `DevicesScreen.confirmRevokeAll()` (current device's own token only — client can't reach other devices'). Both best-effort; backend dead-token pruning is the safety net. |
| 5 | Foreground/tap/cold-start | `setNotificationHandler` (foreground), `addNotificationResponseReceivedListener` (live tap), `getLastNotificationResponseAsync()` (cold-start, deferred until nav + auth ready). |
| 6 | Deep-link routing | **New `navigationRef`** + typed root/tab param lists — the app's first cross-tab imperative nav. `REFERENCE_ROUTES` maps **only** `"Consultation"` (mirrors web's `NotificationBell`); `AttentionSession` accepted as non-deep-linkable (no reachable route). |
| 7 | UI surface | **"Notificaciones" nested under "Más"** (mirrors Devices) + a tab-level unread badge, **NOT a 4th tab** — only 3 tabs exist today; a 4th raises cognitive load on low-end devices for a Member-first, rural-connectivity app. This diverges from the master plan's literal "Notificaciones tab" line — flagged explicitly as a proposal-time decision, not a given. |
| 8 | Config / OS-floor | `expo-notifications ~55.0.20` + config plugin + `googleServicesFile` + iOS APNs entitlement. Android notification **channels are API 26+ only** — a documented no-op below that, so the API 24 floor is safe; `expo-notifications`/minSdk-24 compat re-verified via `expo-doctor`/gradle at apply time. Push is **EAS/dev-client-only** (Expo Go dropped remote push at SDK 53) — moot, dev-client is already mandatory app-wide; only a new dev-client build is needed, no new EAS setup. |

## Affected files / packages

- `packages/core/src/api/modules/notifications.api.ts` — add `subscribePush`/`unsubscribePush`;
  existing exports untouched.
- `packages/core/src/hooks/notifications/usePushSubscription.ts` — **new** (mutation hook pair).
- `packages/core/src/hooks/notifications/useNotifications.ts` — no change.
- `apps/web/*` — **zero code change**; asserted via the existing build/lint regression gate (core
  touched additively only).
- `apps/mobile/package.json` — add `expo-notifications ~55.0.20`.
- `apps/mobile/app.config.ts` — `expo-notifications` config plugin (Android channel/icon/color);
  `googleServicesFile`; iOS APNs entitlement.
- `apps/mobile/src/lib/pushToken.ts` — **new** (cached last-registered token, mirrors `deviceId.ts`).
- `apps/mobile/src/navigation/navigationRef.ts` — **new** (`navigationRef` + typed param lists +
  `REFERENCE_ROUTES`).
- `apps/mobile/src/providers/AppProviders.tsx` — attach `ref={navigationRef}` to
  `NavigationContainer`; mount `<PushBootstrap />`.
- `apps/mobile/src/components/PushBootstrap.tsx` — **new** (permission/registration/listeners/
  cold-start dispatch).
- `apps/mobile/src/navigation/TabNavigator.tsx` — add `Notifications: undefined` to
  `MoreStackParamList`; register `NotificationsScreen`; `tabBarBadge` via `useUnreadCount()` on
  the "More" tab.
- `apps/mobile/src/screens/more/NotificationsScreen.tsx` — **new** (list + unread, reuses core
  hooks unmodified).
- `apps/mobile/src/screens/more/MoreScreen.tsx` — add "Notificaciones" row; wire
  `unsubscribePush()` before `logout.mutateAsync()` in `onLogout()`.
- `apps/mobile/src/screens/more/DevicesScreen.tsx` — wire best-effort `unsubscribePush()` in
  `confirmRevokeAll()`.
- Reuse (no change): `components/shared/{QueryBoundary,EmptyState}`, i18n `es`, `expo-dev-client`
  + `eas.json` profiles.

## Delivery plan (chained PRs)

Three ordered, independently green PRs.

| PR | Scope | Gate / smoke |
|---|---|---|
| **PR1 — Notificaciones list/unread UI (~150-250 lines)** | `NotificationsScreen` (reuses core hooks, no push); `Notifications` route on `MoreStackParamList`; "Notificaciones" row on `MoreScreen`; tab badge via `useUnreadCount()` | mobile `tsc --noEmit`, `expo-doctor`, `expo export`; smoke: list renders, mark-read/mark-all works, badge updates, empty state |
| **PR2a — Navigation infra (nav-only, no native deps)** | `navigationRef.ts` (typed `RootParamList`/tab param lists + `REFERENCE_ROUTES`); ref attached in `AppProviders`. Pure TS, unused until PR2b wires it — zero runtime behavior change | `tsc --noEmit`, `expo-doctor`, `expo export`; no human smoke needed (no visible behavior change); verify app still boots unchanged |
| **PR2b — Push lifecycle (highest risk, budget Medium-High)** | Core additive surface (`subscribePush`/`unsubscribePush` + `usePushSubscription.ts`); `expo-notifications` dep + config plugin; `PushBootstrap` (permission/registration/re-register); unsubscribe wiring in `MoreScreen`/`DevicesScreen`; foreground/tap/cold-start listeners; deep-link dispatch via PR2a's `navigationRef` | core `tsc -b` + **web build/lint regression** (shared, additive); mobile `tsc --noEmit`, `expo-doctor`, `expo export`; **Human/EAS smoke required** (new dev-client build): permission prompt, real device registers + backend upserts, foreground banner, live tap deep-links to `ConsultationDetail`, cold-start tap deep-links after launch, logout unsubscribes |

No test runner (`strict_tdd:false`) — verify via `tsc` / `expo-doctor` / `expo export` / web build;
conventional commits, one work unit per PR. PR2b cannot be automated-gate-verified alone — real
push delivery/permission/deep-link requires a Human/EAS smoke pass.

## Rollback plan

- **Core additive surface (PR2b)** is purely additive: two new functions on `notificationsApi` +
  one new hook file; zero changes to `useNotifications.ts`/`notification.types.ts`/existing
  exports. Reverting removes the new lines/file atomically — no consumer forced to migrate, web
  bundle byte-unchanged.
- **PR1 (list/unread UI)** is purely additive — one new screen + one new stack route + a tab
  badge; no change to auth/patients/consultations/attachments runtime. Revert removes the
  screen/route/badge with zero data impact.
- **PR2a (nav infra)** is inert until PR2b wires it — a ref and typed param lists with no runtime
  behavior change; reverting is pure file removal, zero risk of orphaned state.
- **PR2b (push lifecycle)** is the highest-risk slice: reverting removes `expo-notifications` +
  its config plugin + `PushBootstrap` + the unsubscribe wiring; requires a new dev-client rebuild
  to fully drop the native module. No data/contract impact — the backend's push endpoints simply
  stop receiving calls (existing dead-token pruning already tolerates stale/missing subscriptions).
  Each chained PR reverts independently; revert the feature branch
  (`feat/mobile-notifications-push`) to remove the whole feature.
