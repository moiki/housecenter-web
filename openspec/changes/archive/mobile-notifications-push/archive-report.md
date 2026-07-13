# Archive Report — mobile-notifications-push (change #9)

**Status**: SHIPPED
**Archived**: 2026-07-13
**Artifact store**: engram (memory-persisted)

## Outcome
Added Firebase Cloud Messaging push notifications to mobile: token registration via expo-notifications, cold-start + foreground/background handlers, Notifications tab (badge count), device revocation stops push, logout unsubscribes, reference dispatch for Consultation taps, dynamic deep-link routing. 4 stacked PRs — all 28/28 tasks complete, all 13 headless-provable scenarios verified, 7 Human/EAS-smoke pending.

## Verification
PASS WITH WARNINGS (0 CRITICAL / 3 WARNING / 3 SUGGESTION) — All 13 headless scenarios proven via real gate execution. 11/11 adversarial code-review checks passed (core additive-only, getDevicePushTokenAsync used, unsubscribe ordered before logout, shared registerTokenIfChanged, permission-denied silent, cold-start one-shot useRef-gated, REFERENCE_ROUTES single-key, 3 exact tabs, googleServicesFile conditional real, zero PHI logging, scope discipline clean).

## Delivery
PRs #35-38 stacked on moiki/housecenter-web (issue #23 tracking). PR1+PR2a committed, PR2b pending orchestrator commit before archive.

## Residual / follow-ups
WARNING 1: 7/7 Human/EAS-smoke scenarios pending (permission-prompt-and-registration, token-registers-subscription-post, foreground-push-received, tap-live-deep-link, tap-cold-start-deep-link, logout-unsubscribes, revoke-all-stops-push) — live FCM creds + real device required. WARNING 2: 4 documented apply-time deviations from design (env-var-only googleServicesFile, fully-async pushToken.ts, expo-install pinning, no icon config) — all reviewed and reasonable. WARNING 3: android-channel-noop-below-api26 classified headless but design/tasks flag for real-emulator re-confirmation — documentation-consistency note.

## Verification source
Observation #585: sdd/mobile-notifications-push/verify-report
