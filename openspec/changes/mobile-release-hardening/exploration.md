# Exploration — Mobile Release Hardening (Change #11, FINAL)

## Summary

`apps/mobile` (Expo SDK 55, RN 0.83.6, iOS 15.1 / Android API 24 floor) has 10/11 prior changes shipped.
PHI-at-rest hardening was **already substantially done**: MMKV query cache is encrypted with a
SecureStore-sourced key; tokens/deviceId/pushToken live only in SecureStore; `clearCache()` is wired into
2 of 3 teardown paths. #11 is genuinely config + audit + hardening, not new features. The work splits sharply
into **code-actionable/headlessly-verifiable** (version, placeholder assets, a11y sweep, FLAG_SECURE, i18n
stragglers, 2 real PHI-teardown gaps, audit/runbook docs) vs **Human/EAS/design/ops** (real artwork, EAS
credentials, `eas build`/`submit`, device QA, store listings). **Confidence: High** on PHI/a11y/i18n/assets/EAS.

## Confirmed

1. **PHI storage is sound.** `lib/mmkv.ts:20-33` — MMKV built with `encryptionKey` read-or-created via
   `expo-crypto` + persisted in SecureStore (`hc_cache_key`), never a literal. `secureStore.ts`/`deviceId.ts`/
   `pushToken.ts` all SecureStore-backed. NO `console.*` PHI/token leak in `apps/mobile/src` or `packages/core`
   (only a benign `console.warn` in `config/env.ts:7`).
2. **PHI-teardown gap (highest-value).** 3 teardown paths: `screens/more/MoreScreen.tsx:52` (manual logout)
   → `clearCache()` ✓; `api/client.ts:24-33` (`onRefreshFail`) → `clearCache()` + `queryClient.clear()` ✓;
   **`components/AuthBootstrap.tsx:34-44` (cold-start silent-refresh failure) → calls only bare Zustand
   `logout()` (`createAuthStore.ts:54-57`), does NOT call `clearCache()`.** Fix: add `clearCache()` to that
   catch (trivial, defense-in-depth, removes a backend-status-code-dependent ambiguity).
3. **expo-image disk cache never cleared.** `components/attachments/AuthedImage.tsx` (used by
   `AttachmentsSection.tsx` + `MessageAttachmentThumb.tsx`) uses `expo-image`, which persists a disk+memory
   cache of viewed patient photos OUTSIDE the encrypted MMKV store; none of the 3 teardown sites clear it.
   Real APIs: `Image.clearMemoryCache()` / `Image.clearDiskCache()` — add alongside `clearCache()` at all 3.
4. **FLAG_SECURE / screenshot prevention absent.** `expo-screen-capture` not a dep; `55.0.14` is SDK-55
   compatible, no plugin/permission needed. `usePreventScreenCapture()` app-wide (root) recommended.
5. **a11y: 1 of 36 tsx files** uses accessibility props (`NotificationsScreen.tsx:39`); 122 `Pressable`
   occurrences across 20 files otherwise unlabeled. Highest-leverage sweep: the 4 shared form primitives
   (`RHFTextInput/RHFSelect/RHFPickerField/RHFDateField`, reused across ~8 screens) + `AttachmentsSection`/
   `MoreScreen`/`DevicesScreen`/`NotificationsScreen`. Undersized target e.g. `AttachmentsSection.tsx:141-147`
   delete button (`paddingVertical:6`, `fontSize:12` — under 44px).
6. **i18n es.json internally consistent.** Every static + dynamic `t()` key resolves. Only 2 hardcoded
   stragglers: `RHFPickerField.tsx:33` (`placeholder='Seleccionar'`) + `RHFDateField.tsx:36`
   (`'Seleccionar fecha'`). dayjs `es` locale not set — NON-ISSUE (dayjs used only for date math, never
   locale-formatted display).
7. **Assets + versioning.** `app.config.ts:23` `version:'0.0.0'`; no `icon`/`splash`/`android.adaptiveIcon`;
   no `apps/mobile/assets/` dir; no `runtimeVersion`. No `expo-updates` → OTA out of scope; `runtimeVersion`
   only matters for dev-client compat today. Expo provides default icon/splash if unset — a real EAS build
   won't hard-fail, but a placeholder + config wiring unblocks the release path cleanly.
8. **EAS** `eas.json:18` `submit.production:{}` empty stub — pure ops/credentials (Apple Developer + ASC API
   key; Google Play service account). Cannot be filled without those.
9. **Bundle/low-end**: no heavy deps (no lodash/moment/chart libs — ReportsScreen uses plain `View` bars);
   ~1280 modules. Mostly QA/Human.

## Discrepancies / corrections
- dayjs `es` locale not set — NON-ISSUE (date math only, no locale display).
- i18n stragglers: exactly 2 (RHFPickerField/RHFDateField defaults), not spread across screens.

## Additional considerations for the proposal (recommended positions)

1. **Code/config scope of #11**: version `1.0.0` + placeholder icon/splash/adaptiveIcon + config wiring +
   `runtimeVersion` policy (config) · a11y sweep of the 4 shared form primitives + 4 screens (code) ·
   `expo-screen-capture` app-wide (code, new dep) · i18n 2-straggler fix (code) · PHI-teardown across 3 files
   — AuthBootstrap `clearCache()` + `expo-image` cache-clear at all 3 sites (code, HIGHEST value) · PHI-at-rest
   audit doc + EAS release runbook (docs). Only the binary placeholder assets are non-code.
2. **Explicitly OUT (Human/EAS/design/ops — enumerate as a runbook, don't attempt)**: real branded artwork +
   store screenshots; EAS credentials (Apple Developer + ASC API key, Google Play service account); actual
   `eas build`/`eas submit`; device QA on real iOS 15.1 / Android 7; store listing metadata; populating
   `submit.production`.
3. **PHI-at-rest verdict**: encrypted + cleared on 2/3 paths today (good prior work). #11 closes the 1 remaining
   teardown gap (AuthBootstrap) + the expo-image disk-cache gap (both real small code fixes) + adds FLAG_SECURE
   + writes the audit doc. NOT a from-scratch security fix.
4. **PR shape**: PR1 = code hardening (~12-14 files, est 150-250 lines — likely under 400; tasks re-forecasts)
   — version/assets/config + a11y shared-primitives + FLAG_SECURE + i18n fixes + PHI-teardown. PR2 = PHI-audit +
   release-runbook docs (low risk; could fold into PR1 if small).
5. **Risks**: #11 is inherently partially unverifiable in-repo (real builds/store review/device QA are not
   headless) — "#11 done" = CODE-READINESS, not an actual store release. AuthBootstrap gap's real severity is
   backend-status-code-dependent + unverifiable here (the fix sidesteps needing that answer). a11y scope creep
   beyond shared primitives + top screens risks the budget.

## Recommendation

Ratify: #11 code slice = version 1.0.0 + placeholder assets/config + `runtimeVersion` + a11y sweep (4 shared
form primitives + 4 top screens) + `expo-screen-capture` app-wide + i18n 2-straggler fix + PHI-teardown
hardening (AuthBootstrap `clearCache()` + `expo-image` disk/memory cache-clear at all 3 teardown sites);
docs = PHI-at-rest audit + EAS release runbook enumerating the Human/ops remainder. PR1 (code) + PR2 (docs).

**What shipping ACTUALLY requires beyond this change (runbook outline)**: real branded icon/splash/adaptive +
store screenshots (design); Apple Developer acct + ASC API key + Google Play service account (ops) →
populate `submit.production`; deployed API with all endpoints incl. `/collaborators/me` + `Push:CredentialsJson`
FCM creds; `eas build --profile production` (iOS + Android) on a dev-client; the accumulated Human/EAS device
smokes from #5–#10; device QA on real iOS 15.1 + Android 7 hardware; store listing metadata + submission.

**Ready for Proposal: Yes.** Scope sharply divided code-actionable vs Human/ops.
