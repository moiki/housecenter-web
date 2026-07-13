# PHI-at-Rest Audit — HouseCenter Mobile

**Status**: reflects `apps/mobile` as of change `mobile-release-hardening` PR1 (code hardening),
branch `feat/mobile-release-hardening`.

**Scope**: what patient-identifying / clinical data exists on an authenticated device, where it
lives, how it's protected, and what gets cleared on logout / forced-logout.

**Method**: static code trace + grep against the shipped `apps/mobile` source. This is NOT a
runtime-instrumented audit, a penetration test, or a live-device confirmation — those are Human/EAS
smokes, enumerated in `eas-release-runbook.md`.

## 1. Inventory — what PHI-adjacent data exists on-device, and where

| Data | Where it lives | At rest? |
|---|---|---|
| Offline read-cache of API responses (patients, consultations, treatments, attention sessions, work routes, collaborators, reports, notifications) | Encrypted MMKV instance (`housecenter-cache`), persisted via `@tanstack/query-async-storage-persister` (`apps/mobile/src/lib/persister.ts`), gated by `PersistQueryClientProvider` with `maxAge: 24h` (`AppProviders.tsx`) | Yes — MMKV `encryptionKey` |
| Patient/consultation photo bytes (attachment thumbnails, `AuthedImage.tsx`) | `expo-image`'s native disk+memory cache — OS-managed, outside MMKV/SecureStore | Plain files under the app's sandboxed cache dir, NOT MMKV-encrypted |
| Refresh token (`hc_rt`) | `expo-secure-store` (Keychain/Keystore-backed), via `secureStoreAuthStorage` (`lib/secureStore.ts`) | Yes — SecureStore |
| Access token | In-memory only (`useAuthStore`, zustand) — never written to any storage adapter | N/A — never at rest |
| MMKV cache-encryption key (`hc_cache_key`) | SecureStore | Yes |
| Device UUID (`hc_device_id`) | SecureStore — deliberately survives logout so the same `(userId, deviceId)` session row is reused across a logout/re-login, never orphaning device-session records | Yes |
| Push token (`hc_push_token`) | SecureStore — cleared ONLY on `MoreScreen.onLogout()` (after a best-effort unsubscribe); deliberately NOT cleared by `api/client.ts`'s forced-logout path, `AuthBootstrap`'s cold-start catch, or `DevicesScreen.confirmRevokeAll()` (the session is designed to survive revoke-all) | Yes |

## 2. Encryption details — the MMKV offline cache

`apps/mobile/src/lib/mmkv.ts`'s `getCacheStorage()`: the encryption key is generated once via
`expo-crypto`'s `Crypto.randomUUID()`, persisted in SecureStore under `hc_cache_key`, and is never
a static/hardcoded literal. `new MMKV({ id: 'housecenter-cache', encryptionKey: key })` is
constructed lazily, exactly once, gated on that SecureStore read resolving — no plaintext MMKV
instance exists anywhere in this file. `persister.ts` awaits `getCacheStorage()` before every
read/write, so cache hydration/persistence transparently waits for the key to be ready.

## 3. Tokens / deviceId / pushToken — SecureStore only, never MMKV/AsyncStorage

Confirmed by code trace: `secureStoreAuthStorage`, `deviceId.ts`, and `pushToken.ts` all route
exclusively through `expo-secure-store`. None of the three ever touch MMKV or React Native's plain
AsyncStorage. The access token is the only credential that is genuinely never persisted to disk at
all (memory-only, zustand store), by design (`createAuthStore.ts`: "Access token stays in memory
only (security)").

## 4. Teardown coverage — after PR1, uniform across all 3 sites

Before this change, only 2 of 3 auth-teardown sites cleared the MMKV/query cache, and NONE cleared
the `expo-image` disk/memory cache. `apps/mobile/src/lib/teardown.ts`'s `clearAllLocalData()` is
now the single shared routine, wired identically at all 3 sites:

1. **`MoreScreen.tsx`'s `onLogout()`** — `finally { await clearAllLocalData() }`, after
   `logout.mutateAsync()` (which revokes the session server-side and clears `user`/tokens).
2. **`api/client.ts`'s `onRefreshFail`** — `void clearAllLocalData()`, fired immediately after
   `tokenStore.clear()` on a forced/refresh-failure logout.
3. **`AuthBootstrap.tsx`'s cold-start silent-refresh-failure `.catch()`** — previously bare
   `logout()`; now `{ logout(); void clearAllLocalData() }`. **This was the actual gap**: a stale
   refresh token from a prior session (e.g. rotated/revoked server-side while the device was
   offline) would call `logout()` but leave the encrypted MMKV cache AND the plaintext
   `expo-image` disk cache fully intact from the previous session.

`clearAllLocalData()` clears, in order: `clearCache()` (MMKV `clearAll()`), `queryClient.clear()`
(in-memory), then `Image.clearMemoryCache()` + `await Image.clearDiskCache()` — the latter pair
wrapped in a try/catch, since a disk I/O failure must never block or crash a logout.

## 5. Screenshot / screen-recording prevention

`usePreventScreenCapture()` (from `expo-screen-capture`) is called unconditionally inside
`AppProviders`'s function body — mounted once, at the app root, active across every screen (not
gated by auth state or route). Android gets `FLAG_SECURE` automatically; iOS gets a native secure
overlay. No config plugin or permission entry is required for this package.

## 6. No PHI in logs

A grep of every `console.log|warn|error|info` call across `apps/mobile/src/**/*.{ts,tsx}`
(excluding tests) returns exactly 2 hits, neither PHI: `config/env.ts`'s startup warning about a
missing `API_BASE_URL` env var, and a code COMMENT (not a call) in `PushBootstrap.tsx` explicitly
documenting the decision not to log/alert on notification-permission denial. `pushToken.ts`
additionally carries an explicit comment: "NEVER log the raw token value — it is
device-identifying." No token, deviceId, or clinical-record value is passed to any `console.*` call
anywhere in the scanned tree. (Static grep, not runtime-traced — third-party library logging is out
of scope for this method.)

## 7. Residual risks (honest — not resolved by this change)

- **`Collaborator`/`User` are joined by email match, not a foreign key** (`GET /collaborators/me`,
  shipped in change #10). The mobile client trusts this endpoint's response as "the caller's own
  collaborator record." If two `Collaborator` rows ever shared an email (a backend data-integrity
  concern, not a mobile-client one), the wrong record could be attributed to a session. Out of this
  change's scope; flagged here because it affects who the offline cache attributes cached
  session/patient data to.
- **`expo-image`'s disk cache has no explicit TTL** in this codebase (`AuthedImage.tsx` sets no
  `cachePolicy`) — cached photo files persist until `clearDiskCache()` is explicitly invoked (now
  uniform across all 3 teardown sites) or the OS evicts them under storage pressure. Unlike the
  MMKV query cache's `maxAge: 24h`, there is no independent time-based auto-expiry for photo bytes.
- **The `AuthBootstrap` gap's real-world severity was backend-status-dependent** — it depended on
  how often a device's refresh token actually goes stale/revoked while the app is cold-started
  (e.g. an admin-triggered "revoke all devices," or a token past its server-side TTL). That
  question is now moot: all 3 sites converge on the same `clearAllLocalData()` call, so the gap is
  closed regardless of how frequently that code path fires in practice.
- `Image.clearDiskCache()`'s failure mode is swallowed by design (best-effort — a disk I/O error
  must never block/crash a logout). In the rare case it throws, the memory cache and MMKV/query
  cache are still cleared, but the on-disk photo cache could theoretically survive one logout
  cycle. Not observed during implementation; flagged as a known trade-off, not a guarantee.
- The accessibility sweep (R3, PR1) is scoped to 8 files, not exhaustive across all 36 mobile
  screens. Not a PHI-at-rest concern, noted here only because it shipped in the same PR1 pass.

## 8. Verdict summary

| Category | Verdict |
|---|---|
| Offline read-cache (patients/consultations/treatments/sessions/routes/reports) | **Protected** — encrypted at rest (MMKV + SecureStore-sourced key), 24h auto-expiry, cleared uniformly on all 3 logout/forced-logout paths |
| Patient/consultation photos (`expo-image` cache) | **Protected as of this change** — previously never cleared anywhere; now cleared (best-effort) at all 3 teardown sites. Residual: unencrypted plain files on disk during an active session, no TTL |
| Refresh token | **Protected** — SecureStore (Keychain/Keystore-backed), cleared on logout |
| Access token | **Protected** — never persisted, memory-only |
| Device ID / push token | **Protected at rest** (SecureStore); intentionally NOT tied to the PHI-teardown routine — device ID survives logout by design (session continuity), push token is cleared only on manual logout (not forced-logout/revoke-all) |
| Logs | **Clean** — no PHI/token/deviceId value found in any `console.*` call (static grep, not runtime-traced) |
| Screenshots/recording | **Blocked app-wide** as of this change (code-verified; on-device confirmation is a pending Human/EAS smoke — see `eas-release-runbook.md`) |

This is a static/code-trace audit, not a penetration test or a live-device confirmation. The
Human/EAS smokes that would empirically confirm screenshot-blocking, screen-reader behavior, and a
real EAS build are enumerated in `apps/mobile/docs/eas-release-runbook.md`.
