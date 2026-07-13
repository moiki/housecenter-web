# Exploration — Mobile Notifications & Push (Change #9)

## Summary

Core already ships a complete in-app notifications surface (list / unread-count / mark-read / mark-all)
but **zero push-subscription surface** — a genuine, small additive gap. The API already fully implements
push register/remove (upsert-by-token, dead-token pruning, raw FCM/APNs delivery via FirebaseAdmin). The
backend design **requires the native device token** (`getDevicePushTokenAsync()`), not an Expo push token.
Mobile's root/tab navigators are **entirely untyped today** — deep-linking a push tap into a different tab
requires introducing the app's first `navigationRef`-based cross-tab navigation, a bigger gap than #8 faced.
`AttentionSession`-referencing notifications have **no reachable deep-link target** (mirrors web's own
accepted limitation). Proposal #5 already explicitly deferred **all** push register/deregister work to #9.
**Confidence: High** — every claim backed by a direct file read in one of the two repos.

## Confirmed

1. Core notifications surface is list/unreadCount/markRead/markAllRead **only** — no push-subscription
   api/hook exists. `packages/core/src/api/modules/notifications.api.ts:8-18`,
   `packages/core/src/hooks/notifications/useNotifications.ts:13-47`,
   `packages/core/src/types/notification.types.ts:1-22`.
2. API push-subscription contract: `POST /notifications/push-subscriptions` body `{token, platform}` upserts
   by token, re-assigning owner on login — `Features/Notifications/RegisterPushSubscription.cs:24-44`;
   `DELETE /notifications/push-subscriptions/{token}`, scoped to caller, idempotent —
   `RemovePushSubscription.cs:19-22`; routes in `NotificationEndpoints.cs:39-49`. `PushPlatform` enum =
   `Android|iOS|Web` (`Domain/Entities/PushSubscription.cs:3-8`), serialized as string via global
   `JsonStringEnumConverter` — **matches core's existing `DevicePlatform` type** (`types/auth.types.ts:3`);
   reuse it, don't duplicate.
3. `PushNotificationHandler.cs:19-51` sends `{type, referenceType, referenceId}` as the FCM data payload
   and auto-prunes tokens FCM reports `Unregistered`/`InvalidArgument` — a missed client-side unsubscribe is
   **not catastrophic** (self-healing).
4. `referenceType` values are `"Consultation"` (`InAppNotificationHandlers.cs:37,68,98`) and
   `"AttentionSession"` (`SessionInAppHandlers.cs:28,58`). **No `GET /sessions/{id}` cross-patient endpoint
   exists** — sessions are nested `/patients/{patientId}/sessions` only. An AttentionSession notification
   carries only `sessionId`, not `patientId`, so it **cannot be deep-linked today**.
5. Consultation `Title` is free-text (`OpenConsultation.cs:59`) flowing verbatim into push title/body —
   **PHI-in-push-body risk** (patient-identifying text on a lock screen). Backend/product gap.
6. `FirebasePushSender.cs:34-38` builds a `MulticastMessage` from **raw FCM tokens**. `Push:CredentialsJson`
   blank ⇒ `LoggingPushSender` (log-only). So real delivery needs ops credentials.
7. `apps/mobile/package.json`: `expo ~55`, `expo-device ~55.0.18`, `expo-constants ~55.0.16`,
   **`expo-dev-client ~55.0.36` already installed**; `expo-notifications` absent (`@55.0.20` exists on npm).
8. `apps/mobile/eas.json` already has dev/preview/prod profiles with `developmentClient: true` — EAS/dev-client
   infra exists; #9 only needs a **new dev-client build** (native module addition), not new EAS setup.
9. `app.config.ts:14,17-18` — `platforms: ['ios','android']`, minSdk 24; **no `googleServicesFile` yet** —
   needed for `getDevicePushTokenAsync()` on Android (else "Default FirebaseApp is not initialized").
10. Push lifecycle hook points: `bootstrap.ts:1-13` (setAuthStore→setApiClient→initDeviceId);
    `AuthBootstrap.tsx:19-55` (render gate); `createAuthStore.ts:54-58` + `hooks/auth/useLogout.ts:14-17` —
    `logout()` clears `accessToken` once the mutation settles, so an unsubscribe call must fire **before**
    `logout.mutateAsync()`; `MoreScreen.tsx:22-35`; `DevicesScreen.tsx:39-48`.
11. **Critical**: `RevokeAllAsync` (`UserSessionService.cs:201-224`) revokes **all** sessions incl. the
    current device (no exclusion), despite UI copy "todos los demás dispositivos" (`es.json:37`);
    `useRevokeAllSessions()` doesn't clear local state on success. Best-effort unsubscribe the current
    device's own token in this flow too (the only token the client can reach).
12. `deviceId.ts:14-42` — the sync-getter pattern to mirror for caching the last-registered push token.
13. Navigation: `RootNavigator.tsx` + `TabNavigator.tsx` (3 tabs Pacientes/Consultas/More) are **both
    untyped**; `ConsultationsStack.tsx:7-10` has `ConsultationDetail:{consultationId}` reachable;
    `PatientsStack.tsx` has no session-level route. Cross-tab deep-link needs a `navigationRef` + typed
    root/tab param lists — the app's **first** cross-tab imperative navigation.
14. `AppProviders.tsx:26-39` — `NavigationContainer` has no `ref` yet; the attach point for `navigationRef`.
15. Web precedent: `apps/web/.../NotificationBell.tsx:14-17,35-36` — `REFERENCE_ROUTES` maps **only**
    `'Consultation'`, with an explicit comment that `AttentionSession` has no standalone route. Mirror this.
16. `QueryBoundary`, `EmptyState`, `useOnline` are the reusable list-screen primitives.
17. i18n Spanish-only (`es.json`), no `notifications` namespace yet.
18. `mobile-auth-session/proposal.md:35,94-107` — Proposal #5 **explicitly** deferred all push
    register/deregister to #9 (the plan's #5 "ciclo push" line was a correction). Its Decision #4: always
    send `platform` explicitly from `Platform.OS`.
19. Remote push in Expo Go unavailable since SDK 53 — moot: this app already requires a dev-client build.

## Discrepancies / corrections

- None in the plan's expo-notifications API/token claims — `getDevicePushTokenAsync()` (NOT
  `getExpoPushTokenAsync()`) is confirmed correct vs `FirebasePushSender.cs`'s raw-FCM-token design.
- The plan's "Notificaciones tab" is a proposal-time decision, not a given — tab bar has exactly 3 tabs;
  **nesting under "Más" (mirroring Devices) recommended** over a 4th tab (low-end/Member-first UX).
- "Revoke-all" push cleanup is necessarily limited to the current device (backend revoke-all already kills
  the current session; client can't reach other devices' tokens).

## Additional considerations for the proposal (recommended positions)

1. **Core change**: smallest additive fix — add `subscribePush`/`unsubscribePush` to `notificationsApi` +
   a small mutation-hook pair, reusing `DevicePlatform`. Zero changes to existing core exports; web bundle
   unaffected (the #7/#8 additive-only discipline).
2. **Token type**: `getDevicePushTokenAsync()` confirmed correct.
3. **Permission + registration lifecycle**: request post-login via a `PushBootstrap`-style component gated
   on `user != null`; cache last-registered token locally (mirror `deviceId.ts`); re-register on
   `addPushTokenListener` (backend upsert is idempotent).
4. **Unsubscribe on logout**: fire before `logout.mutateAsync()`; best-effort also on revoke-all (current
   device only). Both best-effort — backend dead-token pruning is the safety net.
5. **Foreground vs background**: `setNotificationHandler` (foreground), `addNotificationResponseReceivedListener`
   (live tap), `getLastNotificationResponseAsync()` (cold-start tap, deferred until nav + auth ready).
6. **UI surface**: nest "Notificaciones" under "Más" with a tab-level unread badge rather than a 4th tab;
   flag as a decision point.
7. **PR shape**: 3 slices — PR1 (list/unread UI, reuse core, ~150-250); PR2a (navigationRef + typed param
   lists + REFERENCE_ROUTES, pure nav infra, tsc-verifiable); PR2b (expo-notifications + config plugin +
   permission/registration/unsubscribe lifecycle + listeners, needs dev-client rebuild + Human/EAS smoke).
   **400-line budget risk: Medium-High** for PR2b.
8. **Risks**: Android channel requirement; EAS-only push (de-risked — infra exists); FCM/APNs credentials
   are ops prerequisites (`Push:CredentialsJson` blank today); cold-start race; PHI-in-push-body (backend
   gap #9 can't fix client-side); AttentionSession non-deep-linkable (accept); untyped navigators = new
   architectural surface.

## Recommendation

Ratify: core additive-only push-subscription surface; `getDevicePushTokenAsync()` token source; post-login
permission/registration via `PushBootstrap`; unsubscribe sequenced before token-clearing on both logout
paths (best-effort); Notifications nested under "Más" with a tab badge; a 3-slice PR shape (list UI / nav
infra / push lifecycle). PR2b is the highest-risk slice — closest review + a Human/EAS smoke pass (automated
gates can't verify real push delivery).

**Ready for Proposal: Yes.** Open decisions for propose/design: (a) Notificaciones Más-nested vs 4th tab,
(b) exact 3-slice split + where the `navigationRef` contract lives, (c) accept AttentionSession as
non-deep-linkable for now.
