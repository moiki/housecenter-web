# Archive Report — mobile-auth-session (change #5)

**Status**: SHIPPED
**Archived**: 2026-07-13
**Artifact store**: engram (memory-persisted)

## Outcome
Wired apps/mobile to device-bound-sessions API + added session-mgmt to core's auth module. 3 stacked PRs — all 26/26 tasks complete, all 12 requirements verified. Cold-start silent refresh before Tabs, MMKV encrypted cache, refresh token in SecureStore, access token memory-only, deviceId survives logout, platform explicit.

## Verification
PASS WITH WARNINGS (0 CRITICAL / 4 WARNING / 3 SUGGESTION) — 7/13 scenarios proven via real gate execution; 6/13 Human/EAS smoke pending (login happy/401, cold-start silent refresh, device list, revoke device, revoke-all-logout, MMKV cache wipe on-device). Highest-risk item: actual login/refresh/logout/device-revoke round-trip MUST be run before production rollout.

## Delivery
PRs #21-23 stacked on moiki/housecenter-web (issue #20 tracking). All 3 commits merged to main.

## Residual / follow-ups
WARNING 1: 6/13 scenarios are security-sensitive auth round-trips requiring live dev-client+API `:5080` before considered end-to-end done. WARNING 2: spec.md logout() code snippet stale vs. design.md-matching actual signature. WARNING 3: state.yaml shows stale phase/status. Android module count varied (876 vs 954) — iOS stable (982); hash identity confirmed, metro non-determinism noted.

## Verification source
Observation #550: sdd/mobile-auth-session/verify-report
