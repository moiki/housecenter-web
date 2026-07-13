# Tasks: Mobile Release Hardening

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | PR1 ~150-280 (18 files, mostly 2-8 line diffs; 3 binary PNGs excluded from line count); PR2 ~90-160 (2 markdown docs) |
| 400-line budget risk | Low for both PRs |
| Chained PRs recommended | No — beyond the design-ratified PR1 -> PR2 sequence (code vs docs), which is architecture-driven, not size-driven |
| Suggested split | 2 PRs, single-shot each: PR1 [code hardening] -> PR2 [docs]. No further split of PR1 (a11y+i18n sweep stays with security+config — see Basis) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

**Basis:** PR1 touches 18 files but nearly all are tiny, mechanical diffs: 1 new ~15-line file
(`teardown.ts`), 3 one-to-three-line wire-ups (`client.ts`, `AuthBootstrap.tsx`,
`MoreScreen.tsx`'s `finally`), 2 dependency-manifest lines (`package.json` x2 via `expo install`),
2 i18n keys (`es.json`), and 8 files getting 2-10 lines of `accessibility*`/`hitSlop` props each
(reusing strings the component already has — no new copy, no new logic branches). `app.config.ts`
picks up ~10-15 lines (version, icon/adaptiveIcon fields, splash plugin entry, runtimeVersion). The
3 placeholder PNGs are binary and do not count against the text-diff review budget. Terse-sketch
arithmetic totals ~110 lines; even applying `mobile-reports-workroutes`' observed 63% inflation
factor (new-screen precedent, not directly comparable — that change added whole new screens with
StyleSheet blocks, this change is prop-level edits to existing files) puts PR1 at ~180, comfortably
under 400 with buffer to spare. **Recommendation: keep PR1 as a single PR** — splitting
security+config from a11y+i18n (the fallback flagged in design D7) is unnecessary; the a11y sweep
is trivial and cohesive with the rest of the hardening pass, and fragmenting it would add PR-count
overhead for no review-load benefit. PR2 (2 markdown docs, zero code touch) is independently
low-risk regardless.

### Suggested Work Units

| Unit | Goal | PR | Notes |
|---|---|---|---|
| 1 | Teardown consolidation + screen-capture + a11y sweep + i18n fix + version/assets/config | PR1 [MONO] | All 18 files under `apps/mobile/`; `packages/core` untouched, `apps/web` byte-unchanged (assertion gate) |
| 2 | PHI-at-rest audit + EAS release runbook | PR2 [MONO] | Depends on PR1 merged (audits PR1's teardown coverage); zero code risk |

---

## Phase 1: Teardown, screen-capture, a11y, i18n, version/assets/config — PR1 [MONO]

- [x] 1.1 `apps/mobile/src/lib/teardown.ts` — new: `clearAllLocalData(): Promise<void>` calling
      `clearCache()` (MMKV) + `queryClient.clear()` + `Image.clearMemoryCache()` +
      `await Image.clearDiskCache()` (best-effort, try/catch-wrapped — a disk-cache failure must
      never block/crash a logout). Cache-only; does NOT touch tokens/auth state. Imports only
      `./mmkv` + `./queryClient` + `expo-image` — confirm no circular import back from either (R1)
- [x] 1.2 `apps/mobile/src/api/client.ts` — wire `onRefreshFail` to `void clearAllLocalData()`;
      drop the now-unused direct `clearCache()`/`queryClient.clear()` calls and their imports (R1)
- [x] 1.3 `apps/mobile/src/components/AuthBootstrap.tsx` — wire the cold-start
      silent-refresh-failure `.catch()` to `{ logout(); void clearAllLocalData() }` — **the primary
      gap fix**: today this path calls bare `logout()` and never touches the cache (R1)
- [x] 1.4 `apps/mobile/src/screens/more/MoreScreen.tsx` — wire `onLogout`'s `finally` block to
      `await clearAllLocalData()` before `setLoggingOut(false)` (R1)
- [x] 1.5 `apps/mobile/package.json` — add `expo-screen-capture` via `expo install
      expo-screen-capture` (SDK-pinned, not hand-written) (R2)
- [x] 1.6 `apps/mobile/src/providers/AppProviders.tsx` — import + call
      `usePreventScreenCapture()` unconditionally in the component's function body (hook — must run
      in component scope), mounted once at the app root, not gated by auth state or route (R2)
- [x] 1.7 `apps/mobile/src/components/shared/form/RHFTextInput.tsx` — add
      `accessibilityLabel={label}` + `accessibilityHint={rest.placeholder}` on the `TextInput` (R3)
- [x] 1.8 `apps/mobile/src/components/shared/form/RHFSelect.tsx` — add
      `accessibilityRole="button"` + `accessibilityLabel={opt.label}` +
      `accessibilityState={{selected: active}}` + `hitSlop={{top:8,bottom:8}}` on each pill
      `Pressable` (R3)
- [x] 1.9 `apps/mobile/src/components/shared/form/RHFPickerField.tsx` — add `useTranslation()`;
      compute `placeholder ?? t('common.select')` in the function body (not as a default param —
      hooks can't be called there); add `accessibilityRole="button"` +
      `accessibilityLabel={label ?? resolvedPlaceholder}` on the trigger and
      `accessibilityRole="button"` + `accessibilityLabel={item.label}` on option rows (R3, R4)
- [x] 1.10 `apps/mobile/src/components/shared/form/RHFDateField.tsx` — add `useTranslation()`;
      compute the `t('common.selectDate')` fallback in the function body; add
      `accessibilityRole="button"` + `accessibilityLabel={label}` +
      `accessibilityHint={display}` on the trigger `Pressable` (R3, R4)
- [x] 1.11 `apps/mobile/src/i18n/locales/es.json` — add `common.select: "Seleccionar"` +
      `common.selectDate: "Seleccionar fecha"` under the existing `common` namespace (R4)
- [x] 1.12 `apps/mobile/src/components/attachments/AttachmentsSection.tsx` — add
      `accessibilityRole="button"` + `accessibilityLabel={t(...)}` (reusing each button's existing
      i18n key) on the take-photo/choose-library/delete `Pressable`s; add
      `hitSlop={{top:10,bottom:10,left:10,right:10}}` on the undersized delete button (R3)
- [x] 1.13 `apps/mobile/src/screens/more/DevicesScreen.tsx` — add `accessibilityRole="button"` +
      `accessibilityLabel={t(...)}` on the revoke and revoke-all buttons; add
      `hitSlop={{top:8,bottom:8,left:8,right:8}}` on the revoke button (R3)
- [x] 1.14 `apps/mobile/src/screens/more/NotificationsScreen.tsx` — add
      `accessibilityRole="button"` on the row `Pressable` (label logic unchanged); add
      `accessibilityRole="button"` + `accessibilityLabel={t('notifications.markAllRead')}` +
      `hitSlop={{top:6,bottom:6}}` on the mark-all `Pressable` (R3)
- [x] 1.15 `apps/mobile/src/screens/more/MoreScreen.tsx` — add `accessibilityRole="button"` +
      `accessibilityLabel={t(...)}` on the 6 nav rows (Ruta del día / Rutas de trabajo / Reportes /
      Devices / Notifications / Logout) (R3)
- [x] 1.16 Generate 3 valid, correctly-sized, decodable placeholder PNGs via a dependency-free
      Node/stdlib script (`zlib`/`struct` — no ImageMagick/sharp/canvas): `icon.png` +
      `adaptive-icon.png` at 1024x1024 solid `#2563eb`, `splash.png` at 1284x2778 solid `#ffffff`.
      Commit all 3 under `apps/mobile/assets/`. **MUST complete before task 1.18** — an
      icon/splash path pointing at a missing or corrupt file breaks `expo export`/`expo prebuild`.
      The generation script itself is scratch/ephemeral (not required to be committed) — only the 3
      PNG binaries are committed (R5)
- [x] 1.17 `apps/mobile/package.json` — add `expo-splash-screen` via `expo install
      expo-splash-screen` (R5)
- [x] 1.18 `apps/mobile/app.config.ts` — set `version: '1.0.0'` (do NOT touch `package.json`'s
      separate `"version"` field — npm workspace metadata, out of scope); add
      `icon: './assets/icon.png'`; add `android.adaptiveIcon: {foregroundImage:
      './assets/adaptive-icon.png', backgroundColor:'#2563eb'}`; add `['expo-splash-screen',
      {image:'./assets/splash.png', resizeMode:'contain', backgroundColor:'#2563eb'}]` to the
      `plugins` array — **NOT** the legacy top-level `splash` key (deprecated SDK 50+); add
      `runtimeVersion: {policy:'appVersion'}` (R5)
- [x] 1.19 Verify PR1 (see Per-PR Verification Commands below): typecheck/doctor/export green with
      the new assets+plugin; core/web untouched; grep gates for a11y coverage, i18n stragglers, and
      the 3 teardown call sites all pass (R7, R8)

**PR1 done when:** `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, and `npx expo
export` all exit 0 (the PNG-validity + plugin-schema gate); `pnpm --filter core exec tsc -b` exits
0 with zero diff (confirms untouched); `pnpm --filter web build` exits 0 with zero
`apps/web/**` diff; grep confirms `accessibilityLabel`/`accessibilityRole` present in all 8 scoped
files, zero `'Seleccionar'`/`'Seleccionar fecha'` literals outside `es.json`, and
`clearAllLocalData` referenced at exactly 3 call sites (`client.ts`, `AuthBootstrap.tsx`,
`MoreScreen.tsx`). No Human/EAS smoke required for this PR alone.

---

## Phase 2: PHI-at-rest audit + EAS release runbook — PR2 [MONO]

> Depends on PR1 merged — the audit doc documents PR1's teardown coverage as already-shipped.

- [ ] 2.1 `apps/mobile/docs/phi-at-rest-audit.md` — new: (1) what's encrypted/where (MMKV
      query-cache blob, SecureStore-backed encryption key, tokens/deviceId/pushToken SecureStore-
      only); (2) teardown coverage after PR1 — the 3 sites now uniformly wired through
      `clearAllLocalData()`, including the `expo-image` disk/memory cache gap this change closes;
      (3) the new `FLAG_SECURE`/iOS screenshot-block addition; (4) residual risks (no OTA/patch
      channel yet, `Image.clearDiskCache()` failure is best-effort/swallowed, a11y sweep is scoped
      not exhaustive) — explicit verdict per PHI category (R6)
- [ ] 2.2 `apps/mobile/docs/eas-release-runbook.md` — new: enumerate every remaining Human/ops
      step — real branded icon/splash/adaptiveIcon artwork + store screenshots (design); EAS
      credentials (Apple Developer account + ASC API key; Google Play service account); `eas build
      --profile production` + `eas submit` (iOS + Android); populate `submit.production` in
      `eas.json`; device QA on real iOS 15.1 / Android 7 hardware; store listing metadata; the
      deployed production API dependency (incl. `GET /collaborators/me` and `Push:CredentialsJson`
      FCM credential); the accumulated Human/EAS device smokes from changes #5-#10; plus this
      change's own screenshot-block + a11y (VoiceOver/TalkBack) + large-font + real-build smokes
      (R6)
- [ ] 2.3 Verify PR2: both docs exist under `apps/mobile/docs/`; the runbook's enumerated items
      match the spec's **Release runbook** section 1:1; `git diff --stat` shows only the 2 new doc
      files (no code touched, no build impact) (R6, R7)

**PR2 done when:** both docs exist, the audit states an explicit verdict per PHI category, and the
runbook enumerates every item from spec's Release runbook section. No build/typecheck gate applies
(docs-only) — code trace confirms zero non-doc files changed in this PR.

---

## Consolidated Human/EAS Smoke Checklist (needs real device/EAS credentials — not headless)

1. **screenshots-blocked-on-device** (R2) — on a physical/simulator Android + iOS device running
   a dev-client build with this change, attempting a screenshot/recording on any foregrounded
   screen is blocked/blackened (Android `FLAG_SECURE`) or obscured (iOS).
2. **screen-reader-reads-labels** (R3) — with VoiceOver (iOS) or TalkBack (Android) enabled,
   navigating the 8 scoped files' interactive elements announces the configured labels/roles.
3. **large-font-scaling-holds** (R3) — with the device OS font-scale at its largest accessibility
   setting, the 8 scoped files' touch targets stay reachable and text doesn't clip/overlap.
4. **real-eas-build-succeeds** (R5) — with valid EAS credentials and this change's placeholder
   assets/config committed, a real `eas build` completes for iOS and Android using the placeholder
   icon/splash/adaptiveIcon.

See `apps/mobile/docs/eas-release-runbook.md` (PR2) for the full Human/ops ship checklist — these
4 items are a subset of it, not a substitute.

## Per-PR Verification Commands (recap)

| PR | Commands |
|---|---|
| PR1 | `pnpm --filter mobile exec tsc --noEmit`; `npx expo-doctor`; `npx expo export` (must stay green WITH the new assets/plugin); `pnpm --filter core exec tsc -b` (confirm untouched); `pnpm --filter web build` (confirm unaffected); `git diff --stat -- packages/core apps/web` (must be empty); grep for `accessibilityLabel\|accessibilityRole` across the 8 scoped files; grep for `'Seleccionar'` / `'Seleccionar fecha'` outside `es.json` (must be 0); grep for `clearAllLocalData` call sites (must be exactly 3: `client.ts`, `AuthBootstrap.tsx`, `MoreScreen.tsx`) |
| PR2 | Confirm both doc files exist under `apps/mobile/docs/`; diff each doc's enumerated runbook items against spec's Release runbook section; `git diff --stat` shows only the 2 doc files |

## Risks / Notes Carried From Design

- **The `AuthBootstrap` gap (D1)** is the highest-value fix in this change — verify task 1.3 lands
  exactly as `{ logout(); void clearAllLocalData() }`, not a bare `logout()` retained by mistake.
- **Placeholder-PNG trap (D5)**: task 1.16 MUST complete (valid, decodable, correctly-sized PNGs
  committed) before task 1.18 wires `app.config.ts` — an icon/splash/adaptiveIcon path pointing at
  a missing or corrupt file hard-fails `expo export`/`expo prebuild`, the exact trap already
  documented for `googleServicesFile` in this same config file.
- **`splash` is a config-plugin field in SDK 50+ (D5)**, not a top-level `ExpoConfig` key — task
  1.18 must use the `expo-splash-screen` plugin entry, not the legacy top-level `splash` key.
  `icon`/`android.adaptiveIcon` remain top-level fields, unaffected by that migration.
- **No new a11y-only copy (D3)**: every `accessibilityLabel`/`Hint` added in tasks 1.7-1.15 must
  resolve from a value the component already has (a prop, an `options[].label`, or an existing
  `t()` call) — never a newly authored hardcoded literal.
- **`packages/core` stays untouched; `apps/web` is an assertion-only gate (D7)** — every call site
  in this change (teardown, screen-capture, RHF wrappers, `app.config.ts`) is mobile-only by
  construction; the web/core verification commands in PR1 are expected to pass trivially, not to
  catch a real regression.
- `strict_tdd:false` for `apps/mobile` — no test runner exists; verification is
  `tsc`/`expo-doctor`/`expo export`/grep/code-trace, matching the `apps/web` convention. 4/12 spec
  scenarios are Human/EAS smoke — `sdd-apply` should report these as pending/non-headless rather
  than attempt to automate them.
- **Framing reminder (carried from proposal/state)**: "#11 done" = code-readiness for this repo,
  not an actual store release. PR2's runbook exists precisely so this distinction is never lost.
