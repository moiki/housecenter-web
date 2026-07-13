# SDD Proposal — Mobile Release Hardening

## Change name
`mobile-release-hardening`

## Status
`proposed` (2026-07-13)

## Problem

Change #11 of the master plan — the **FINAL** change (10/11 done). `apps/mobile` is functionally
complete after #1–#10. Exploration confirmed PHI-at-rest hardening was **already substantially
done**: MMKV query cache is encrypted with a SecureStore-sourced key, tokens/deviceId/pushToken
live only in SecureStore, and `clearCache()` is already wired into 2 of 3 teardown paths. #11 is
genuinely **config + audit + hardening**, not new features, and splits sharply into
code-actionable/headlessly-verifiable work (version, placeholder assets, a11y sweep, screenshot
prevention, i18n stragglers, 2 real PHI-teardown gaps, audit/runbook docs) vs. Human/EAS/design/ops
work (real artwork, EAS credentials, `eas build`/`submit`, device QA, store listings).

Two real PHI-teardown gaps remain: (a) `AuthBootstrap.tsx`'s cold-start silent-refresh-failure
catch calls only a bare Zustand `logout()`, never `clearCache()`; (b) `expo-image`'s disk+memory
cache of viewed patient/consultation photos (`AuthedImage.tsx`) is never cleared at **any** of the
3 teardown sites — it lives outside the encrypted MMKV store entirely.

**`#11 completes the plan in CODE-READINESS terms; shipping to the App Store/Play Store is a
separate Human/ops milestone, captured in a runbook, not attempted here.`** Branch off `main` (all
#1–#10 merged).

## Proposed change

Two ordered PRs, both scoped to `apps/mobile` only.

**PR1 — code hardening:**
1. **PHI-teardown (highest value)** — add `clearCache()` to `AuthBootstrap`'s cold-start catch;
   add `Image.clearMemoryCache()`/`Image.clearDiskCache()` at all 3 teardown sites (`MoreScreen`
   logout, `api/client.ts` `onRefreshFail`, `AuthBootstrap` cold-start). Extract a single shared
   teardown helper (new `apps/mobile/src/lib/` file) so the 3 sites stop drifting — design phase
   picks the exact shape/name.
2. **Screenshot prevention** — `expo-screen-capture` (~55.0.14), `usePreventScreenCapture()`
   mounted app-wide at root (Android `FLAG_SECURE` + iOS screenshot block).
3. **a11y sweep** — scoped to the 4 shared RHF form primitives (`RHFTextInput`/`RHFSelect`/
   `RHFPickerField`/`RHFDateField`) + 4 top screens (`AttachmentsSection`/`MoreScreen`/
   `DevicesScreen`/`NotificationsScreen`): `accessibilityLabel`/`accessibilityRole` on interactive
   elements + ≥44px touch targets (e.g. `AttachmentsSection`'s undersized delete button).
   Deliberately **not** all 36 mobile files — bounded to keep the PR reviewable.
4. **i18n** — fix the 2 hardcoded stragglers (`RHFPickerField.tsx:33` `'Seleccionar'`,
   `RHFDateField.tsx:36` `'Seleccionar fecha'`) via `t()` + new `es.json` keys.
5. **Version/assets/config** — `version` `'0.0.0'` → `'1.0.0'`; new `apps/mobile/assets/` dir with
   placeholder `icon`/`splash`/`android.adaptiveIcon` + `app.config.ts` wiring (unblocks the
   release path; real branded artwork is a **design** deliverable, explicitly not attempted here);
   set a `runtimeVersion` policy for dev-client compatibility (no `expo-updates` → OTA moot today).

**PR2 — docs:** PHI-at-rest audit (what's protected, how, verdict) + EAS release runbook
enumerating every remaining Human/ops step.

## Scope

### In scope
- PHI-teardown hardening across 3 files (+ optional shared helper).
- `expo-screen-capture` app-wide.
- a11y sweep: 4 shared form primitives + 4 top screens.
- 2 i18n hardcoded-string fixes.
- Version bump, placeholder icon/splash/adaptiveIcon assets, `app.config.ts` wiring,
  `runtimeVersion` policy.
- PHI-at-rest audit doc + EAS release runbook.

### Out of scope (Human/EAS/design/ops — enumerated as the runbook, not attempted)
- Real branded artwork + store screenshots (design).
- EAS credentials: Apple Developer account + ASC API key, Google Play service account (ops).
- Actual `eas build`/`eas submit` runs.
- Device QA on real iOS 15.1 / Android 7 hardware.
- Store listing metadata; populating `submit.production` in `eas.json`.
- The accumulated #5–#10 Human/EAS device smokes.
- Deploying the API (incl. `/collaborators/me` + `Push:CredentialsJson` FCM creds).

## Capabilities

### New Capabilities
- `mobile-release-hardening`: PHI-teardown hardening, screenshot prevention, scoped a11y sweep,
  i18n fix, and release version/assets/config wiring for `apps/mobile`.

### Modified Capabilities
- None — hardens existing auth-teardown and attachment-image-display behavior without changing
  any previously-shipped capability's external contract.

## Ratified decisions (do not re-open)

| # | Decision | Position |
|---|---|---|
| 1 | PHI-teardown scope | Fix both real gaps: `AuthBootstrap` missing `clearCache()`; `expo-image` cache never cleared at any of the 3 sites. Consider one shared helper to prevent future drift. |
| 2 | Screenshot prevention | `expo-screen-capture` ~55.0.14, `usePreventScreenCapture()` app-wide at root — no new native permission, no config plugin needed. |
| 3 | a11y scope | 4 shared RHF primitives + 4 top screens only — **not** all 36 files, to bound the review budget. |
| 4 | i18n scope | Exactly the 2 confirmed stragglers; `es.json` and dayjs usage are otherwise non-issues (date math only, never locale-displayed). |
| 5 | Assets/version | Placeholder assets + config wiring unblock the release path; real branded artwork is explicitly deferred to a design deliverable, not this change. |
| 6 | Framing | #11 = CODE-READINESS. Store shipping is a separate Human/ops milestone, captured as a runbook, not executed here. |

## Affected packages

| Package | Impact | Description |
|---|---|---|
| `apps/mobile` | Modified | Screens (`AttachmentsSection`, `MoreScreen`, `DevicesScreen`, `NotificationsScreen`), shared form components (`RHFTextInput`/`RHFSelect`/`RHFPickerField`/`RHFDateField`), `AuthBootstrap.tsx`, `api/client.ts`, new teardown helper, `app.config.ts`, new `assets/` dir, `package.json` (+`expo-screen-capture`) |
| `packages/core` | None | All 3 PHI-teardown call sites are mobile-only (`MoreScreen`, `api/client.ts`, `AuthBootstrap`) — the shared teardown helper is recommended to live in **mobile**, not core; core stays untouched |
| `apps/web` | None | Byte-unchanged — no core touch means no regression gate is even required, but asserted explicitly |

## OS-floor / dependency risk

- `expo-screen-capture` ~55.0.14 confirmed SDK-55 compatible; no new native permission (Android
  `FLAG_SECURE` is automatic, iOS screenshot block uses a secure overlay) — no config plugin
  needed beyond adding the dependency.
- a11y changes are additive props only — zero change to existing interaction/event logic.
- No `expo-updates` present — `runtimeVersion` only affects dev-client compatibility today, not OTA.

## Delivery plan (chained PRs)

| PR | Scope | Notes |
|---|---|---|
| **PR1 — code hardening** | PHI-teardown (3 files + helper) + screen-capture (root) + a11y sweep (8 files) + i18n fix (2 files) + version/assets/config (~4-5 files) | ~12-14 files, est. 150-250 lines — likely under 400; `sdd-tasks` re-forecasts. PHI-teardown is the highest-value, most-reviewable slice. If combined risk exceeds 400 lines, split security+config (PHI-teardown + screen-capture + version/assets) from a11y+i18n (lower urgency, deferrable). |
| **PR2 — docs** | PHI-at-rest audit + EAS release runbook | Low risk, docs-only; could fold into PR1 if PR1 lands small. |

## Rollback plan

- PR1 is purely additive/hardening — no removed exports, no schema change, no new store-review-triggering permission. Each sub-item reverts independently:
  - PHI-teardown: revert the 3 diffs (or the helper) — degrades to today's already-shipped 2/3 coverage, never below current behavior.
  - Screen-capture: drop the dependency + the `usePreventScreenCapture()` call — no other coupling.
  - a11y: prop-only — revert leaves screens functionally identical.
  - i18n: revert 2 lines + 2 `es.json` keys.
  - Version/assets/config: revert `app.config.ts` + delete `assets/` — nothing at runtime depends on the new version string beyond EAS build metadata.
- PR2 (docs) carries zero code risk — revert is a file deletion.
- No data migration, no API contract change, no `packages/core` change — `apps/web` unaffected by definition.

## Success criteria

- [ ] `AuthBootstrap`'s cold-start silent-refresh catch calls `clearCache()`.
- [ ] `Image.clearMemoryCache()`/`clearDiskCache()` called at all 3 teardown sites.
- [ ] `usePreventScreenCapture()` mounted app-wide; screenshot block confirmed via Human/EAS smoke.
- [ ] 4 shared RHF primitives + 4 top screens carry `accessibilityLabel`/`Role` + ≥44px touch targets.
- [ ] Both i18n stragglers replaced with `t()` + `es.json` keys.
- [ ] `version` `1.0.0`; placeholder icon/splash/adaptiveIcon wired; `runtimeVersion` policy set.
- [ ] PHI-at-rest audit doc + EAS release runbook written, enumerating every Human/ops remainder.
- [ ] `apps/web` build/lint stay green; mobile `tsc -b`, `expo-doctor`, `expo export` all pass.
