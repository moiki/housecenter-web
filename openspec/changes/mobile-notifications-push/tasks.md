# Tasks: Mobile Notifications & Push

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | PR1 ~190–250; PR2a ~100–160; PR2b ~320–420 raw (plausibly 420–520 once styles/effect-wiring inflate it, per the ~1.6x actual/estimate ratio `mobile-consultations` PR2 showed) |
| 400-line budget risk | High (driven entirely by PR2b) |
| Chained PRs recommended | Yes |
| Suggested split | 3 PRs (PR1 → PR2a → PR2b), with a documented internal PR2b fallback split if it swells past ~380 at apply time |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

**Basis:** PR1 = `NotificationsScreen.tsx` (~150–200, sized against `DevicesScreen.tsx`'s 153
lines plus mark-all/pull-to-refresh/offline-gating on top) + `TabNavigator.tsx` diff (badge +
route, ~15) + `MoreScreen.tsx` diff (~10) + `es.json` (~15–20) ≈ 190–250. PR2a = `navigationRef.ts`
new (~50–70: ref + `PushNotificationData` + `REFERENCE_ROUTES` + `dispatchNotificationTap`) +
`RootNavigator.tsx`/`TabNavigator.tsx` typing diffs (~25–30) + `AppProviders.tsx` ref attach (~4)
≈ 100–160 — pure TS, no runtime behavior change, lowest risk. PR2b = core additive (~38: types +
api + new hook file) + `package.json`/`app.config.ts` (~20) + `pushToken.ts` new (~45–55, mirrors
`deviceId.ts`'s 42 lines) + `PushBootstrap.tsx` new (~150–220 — module-scope handler + gated
registration effect + shared cache-compare fn + tap listener + token-rotation listener +
ref-guarded cold-start one-shot, the single largest and most effect-dense file in this change) +
`MoreScreen.tsx`/`DevicesScreen.tsx` unsubscribe wiring (~25–35) + `AppProviders.tsx` mount (~3)
≈ 320–420 raw. **`mobile-consultations` PR2 landed at 412 actual vs. a 253-line estimate (1.63x)**
for a screen/effect-heavy PR — applying the same inflation factor to PR2b's raw estimate plausibly
lands it at 420–520, over budget. **Fallback split if PR2b swells past ~380 during apply:**
**PR2b-core+config** (core additive D6 + `expo-notifications` dep/config plugin D8 +
`pushToken.ts`, ~90–110 lines, tsc/expo-doctor-verifiable, no behavior change) →
**PR2b-lifecycle+listeners** (`PushBootstrap.tsx` D2–D4 + `MoreScreen`/`DevicesScreen` unsubscribe
wiring D3 + `AppProviders.tsx` mount, ~230–290 lines, where Human/EAS smoke actually lives). Both
still stack to main in order; smoke-testing only becomes meaningful once the second lands, so the
split reduces reviewer diff size, not smoke-test lead time. Not pre-applied here — flagged as an
apply-time contingency, same pattern `mobile-consultations` used for its own PR2 swing factor.

### Suggested Work Units

| Unit | Goal | PR | Notes |
|---|---|---|---|
| 1 | Notifications list/unread UI, no push, core untouched | PR1 | Zero core diff — no web regression gate required this PR |
| 2 | Nav infra: typed `navigationRef`/`RootStackParamList`/`TabParamList`/`REFERENCE_ROUTES` | PR2a | Pure TS, inert until PR2b wires a caller; zero runtime change |
| 3 | Core additive push surface + `expo-notifications` + `PushBootstrap` lifecycle + unsubscribe wiring | PR2b | Highest risk; first core touch (web regression gate mandatory); Human/EAS smoke required; split into PR2b-core+config / PR2b-lifecycle+listeners if apply-time diff exceeds ~380 |

---

## Phase 1: Notifications list/unread UI — PR1

- [x] 1.1 `apps/mobile/src/screens/more/NotificationsScreen.tsx` — new: reuse
      `useNotifications()`/`useUnreadCount()`/`useMarkNotificationRead()`/
      `useMarkAllNotificationsRead()` **unmodified**; render list wrapped in
      `QueryBoundary`/`EmptyState`; unread rows visually distinct (R6)
- [x] 1.2 Same file — single mark-read on row tap, "mark all read" action, `RefreshControl`
      pull-to-refresh; all write actions gated on `useOnline()` (disabled/hidden offline); reads
      still render from persisted cache offline (R6)
- [x] 1.3 `apps/mobile/src/navigation/TabNavigator.tsx` — add `Notifications: undefined` to
      `MoreStackParamList`; register `<MoreStack.Screen name="Notifications"
      component={NotificationsScreen}>` (R7)
- [x] 1.4 Same file — `TabNavigator()` calls `useUnreadCount()`, sets `tabBarBadge` on the
      "More" `Tab.Screen` (`badge > 0 ? badge : undefined`, no badge at 0) (R7)
- [x] 1.5 `apps/mobile/src/screens/more/MoreScreen.tsx` — add "Notificaciones" row (mirrors the
      existing `Devices` row) navigating to `Notifications` (R7)
- [x] 1.6 `apps/mobile/src/i18n/locales/es.json` — add `notifications.{title,empty,markRead,
      markAllRead}` namespace, Spanish-first (R6, R8)
- [x] 1.7 Constraint check: `packages/core/src/hooks/notifications/useNotifications.ts` shows
      zero diff (`git diff` empty for that file) (R6)
- [x] 1.8 Gates: `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, `npx expo export` —
      all green (R6, R7). Core untouched this PR — no core/web gate required.

**PR1 done when:** mobile tsc/expo-doctor/expo export all green; code trace confirms
mark-read/mark-all are gated on `useOnline()`; badge reflects `useUnreadCount()` with no 4th tab
introduced. No Human/EAS smoke needed — no native module touched.

## Phase 2: Nav infra (navigationRef, typed param lists) — PR2a

- [x] 2.1 `apps/mobile/src/navigation/navigationRef.ts` — new: `export const navigationRef =
      createNavigationContainerRef<RootStackParamList>()`; `PushNotificationData` interface
      (`type`, `referenceType`, `referenceId`); `REFERENCE_ROUTES` map with **only** the
      `Consultation` key → `navigationRef.navigate('Tabs', { screen: 'Consultas', params: {
      screen: 'ConsultationDetail', params: { consultationId: id } } })`; `dispatchNotificationTap`
      guarded by `navigationRef.isReady()`. Pure function — no `expo-notifications` import (R5)
- [x] 2.2 `apps/mobile/src/navigation/RootNavigator.tsx` — type
      `Stack = createNativeStackNavigator<RootStackParamList>()`; export `RootStackParamList =
      { Login: undefined; Tabs: NavigatorScreenParams<TabParamList> }` (R5)
- [x] 2.3 `apps/mobile/src/navigation/TabNavigator.tsx` — type
      `Tab = createBottomTabNavigator<TabParamList>()`; export `TabParamList = { Pacientes:
      NavigatorScreenParams<PatientsStackParamList>; Consultas:
      NavigatorScreenParams<ConsultationsStackParamList>; More:
      NavigatorScreenParams<MoreStackParamList> }` (R5)
- [x] 2.4 `apps/mobile/src/providers/AppProviders.tsx` — attach `ref={navigationRef}` on
      `NavigationContainer` (import from `navigationRef.ts`); no caller wired yet (R5)
- [x] 2.5 Gate: `pnpm --filter mobile exec tsc --noEmit` exits 0 (confirms the typed nested-navigate
      call compiles against real screen names `'Tabs'`/`'Consultas'`/`'ConsultationDetail'`); core
      untouched, `pnpm --filter web build`/`lint` unaffected (R5)

**PR2a done when:** mobile tsc green; code trace confirms `REFERENCE_ROUTES` has exactly one key
(`Consultation`); ref is attached but has zero callers — inert, no runtime behavior change, no
Human/EAS smoke needed.

## Phase 3: Push lifecycle (core additive + native + listeners) — PR2b

- [ ] 3.1 `packages/core/src/types/notification.types.ts` — add `PushSubscriptionRequest {
      token: string; platform: DevicePlatform }`, importing `DevicePlatform` from
      `./auth.types` (no new type) (R1)
- [ ] 3.2 `packages/core/src/api/modules/notifications.api.ts` — add `subscribePush(body)` →
      `POST /notifications/push-subscriptions`, `unsubscribePush(token)` → `DELETE
      /notifications/push-subscriptions/{token}`; existing 4 exports (`list`, `unreadCount`,
      `markRead`, `markAllRead`) untouched (R1)
- [ ] 3.3 `packages/core/src/hooks/notifications/usePushSubscription.ts` — new:
      `useSubscribePush()`/`useUnsubscribePush()` mutation hooks (mirrors
      `useMarkNotificationRead`'s shape); no `invalidateQueries` (R1)
- [ ] 3.4 Gate: `pnpm --filter core exec tsc -b` exits 0; `pnpm --filter web build` +
      `pnpm --filter web lint` green with **zero** `git diff` lines under `apps/web` (R1)
- [ ] 3.5 `apps/mobile/package.json` — add `expo-notifications ~55.0.20` (`expo install`) (R2)
- [ ] 3.6 `apps/mobile/app.config.ts` — add `['expo-notifications', { icon, color }]` to
      `plugins`; add `android.googleServicesFile`; note iOS APNs entitlement is an EAS
      credentials concern, not an `app.config.ts` field (R2)
- [ ] 3.7 `apps/mobile/src/lib/pushToken.ts` — new: mirrors `deviceId.ts`'s SecureStore +
      sync-getter pattern — `getCachedPushToken()`/`setCachedPushToken(token)`/
      `clearCachedPushToken()` (R3)
- [ ] 3.8 `apps/mobile/src/components/PushBootstrap.tsx` — new: module-scope
      `Notifications.setNotificationHandler(...)`; component self-gates on
      `useAuthStore((s) => s.user) != null`; registration effect
      (permission → Android channel (API-26+ guard, documented no-op below) →
      `getDevicePushTokenAsync()` → cache-compare against `getCachedPushToken()` → skip if equal →
      else `useSubscribePush().mutateAsync({token, platform})` → `setCachedPushToken(token)`);
      extract the cache-compare-then-subscribe logic into one shared function reused by the
      `addPushTokenListener` rotation effect — do not duplicate it (R3)
- [ ] 3.9 Same file — permission-denied path returns silently, no throw, no blocking UI (R3)
- [ ] 3.10 Same file — tap listener effect: `addNotificationResponseReceivedListener` →
      `dispatchNotificationTap(data)`; cold-start one-shot effect (`useRef` flag,
      `[user]` dep) gated on `navigationRef.isReady() && user != null`, calls
      `getLastNotificationResponseAsync()` once → `dispatchNotificationTap` (R5)
- [ ] 3.11 `apps/mobile/src/providers/AppProviders.tsx` — mount `<PushBootstrap />` as a sibling
      of `<AuthBootstrap>` inside `NavigationContainer` (neither wraps the other) (R3)
- [ ] 3.12 `apps/mobile/src/screens/more/MoreScreen.tsx` — `onLogout()`:
      `getCachedPushToken()` → if present, `await unsubscribePush.mutateAsync(token)` wrapped in
      try/catch (swallow — best-effort) → `clearCachedPushToken()` — **all before**
      `logout.mutateAsync(getDeviceId())`, since `useLogout`'s `onSettled` clears `accessToken`
      the instant the mutation settles (R4)
- [ ] 3.13 `apps/mobile/src/screens/more/DevicesScreen.tsx` — `confirmRevokeAll()`'s `onPress`:
      best-effort `getCachedPushToken()` → `unsubscribePush.mutateAsync(token)` (swallow errors),
      current device's token only, before `revokeAllSessions.mutate()` (R4)
- [ ] 3.14 Gate: `pnpm --filter mobile exec tsc --noEmit`; `npx expo-doctor` (no failing checks);
      `npx expo export` — **note:** may fail or require a dev-client rebuild since
      `expo-notifications` is a native module; document the expected dev-client-build
      requirement rather than treating a native-surface failure as a regression (R2–R5)
- [ ] 3.15 Human/EAS smoke (see consolidated checklist below) — cannot be verified headlessly (R3, R4, R5)

**PR2b done when:** core tsc + web build/lint green (zero `apps/web` diff) + mobile
tsc/expo-doctor green (`expo export` outcome documented per 3.14) + code trace confirms (a) the
shared cache-compare function is used by both the mount effect and the token-rotation listener,
(b) unsubscribe fires and is awaited before `logout.mutateAsync()`, (c) permission-denied never
throws. Human/EAS smoke required before this slice is considered fully verified (new dev-client
build with push credentials).

---

## Consolidated Human/EAS Smoke Checklist (PR2b only)

Requires: a new dev-client build (`expo-notifications` changes the native surface), FCM/APNs
credentials configured via `eas credentials`, and a real device (or API-24/25 emulator for the
channel-guard check).

- [ ] **permission-prompt-and-registration** — log in on the dev-client build; OS permission
      prompt appears; granting resolves a native device token (R3)
- [ ] **token-registers-subscription-post** — after grant, `useSubscribePush()` fires; backend
      receives `POST /notifications/push-subscriptions` and upserts (verify via API logs/DB) (R3)
- [ ] **foreground-push-received** — with the app foregrounded, backend sends a push;
      `setNotificationHandler` displays it without crashing (R2, R5)
- [ ] **tap-live-deep-links-to-consultation-detail** — app running (fg/bg, not killed), tap a
      `referenceType: "Consultation"` push; navigates to Consultas → `ConsultationDetail{id}` (R5)
- [ ] **tap-cold-start-deep-links-to-consultation-detail** — app fully killed, tap the push to
      launch; navigates to `ConsultationDetail{id}` after `navigationRef.isReady()` + auth resolve
      (no race/blank screen) (R5)
- [ ] **logout-unsubscribes** — log out via `MoreScreen.onLogout()`; `unsubscribePush` completes
      before `logout.mutateAsync()`; backend no longer has the subscription (R4)
- [ ] **revoke-all-stops-push** — trigger `DevicesScreen.confirmRevokeAll()`; current device's
      subscription is best-effort removed, no further push delivered to it (R4)
- [ ] **android-channel-noop-below-api26** — on an API-24/25 emulator, confirm channel setup is
      a documented no-op and does not throw (R2)

---

## Verification Commands (per PR)

| PR | Commands |
|---|---|
| PR1 | `pnpm --filter mobile exec tsc --noEmit` · `npx expo-doctor` (in `apps/mobile`) · `npx expo export` (in `apps/mobile`) |
| PR2a | `pnpm --filter mobile exec tsc --noEmit` (core untouched — no web/core gate required) |
| PR2b | `pnpm --filter core exec tsc -b` · `pnpm --filter web build` · `pnpm --filter web lint` (zero `apps/web` diff) · `pnpm --filter mobile exec tsc --noEmit` · `npx expo-doctor` · `npx expo export` (expected to require a dev-client rebuild — document, don't treat as a regression) · 7 Human/EAS-smoke scenarios above, run manually |

---

## Risks / Notes Carried From Design

- **Cold-start race** (D4): gate the one-shot dispatch on `navigationRef.isReady() && user !=
  null` — `RootNavigator` renders `Login` OR `Tabs`, never both; `Tabs`'s subtree doesn't exist
  pre-auth. Residual risk needs Human/EAS confirmation, not just `tsc`.
- **Unsubscribe-before-logout ordering** (D3) is load-bearing, not stylistic — never reorder.
- **Cache-compare** (D2) must be one shared function, reused by both the mount effect and
  `addPushTokenListener` — duplicating it inline risks drift and re-subscribe loops.
- **Permission-denied is an expected outcome**, not an error path — no `Alert`/`console.error`.
- **REFERENCE_ROUTES** is intentionally `Consultation`-only; `AttentionSession`/unknown always
  no-op, never throw.
- **No PHI in logs**: never log raw push token strings or notification title/body content.
- `strict_tdd:false` — no test runner; verification is `tsc`/`expo-doctor`/`expo export` + code
  trace + Human/EAS smoke. 7 of 20 spec scenarios are Human/EAS smoke, all in PR2b — sdd-apply
  should report these as "needs dev-client build + FCM creds + real device," not attempt to
  automate them.
