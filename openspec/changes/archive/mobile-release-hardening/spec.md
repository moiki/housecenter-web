
# SDD Spec — Mobile Release Hardening (Change #11, FINAL)

## Requirements

### R1 — PHI-teardown consolidation (highest value)
The system MUST provide a single shared mobile-only teardown routine that, when invoked, clears
BOTH (a) the encrypted MMKV query cache (today's `clearCache()`) AND (b) the `expo-image`
memory+disk caches (`Image.clearMemoryCache()` / `Image.clearDiskCache()`). This routine MUST be
the ONLY code path any of the 3 auth-teardown sites use, so the sites cannot drift independently:
(a) `MoreScreen` manual logout, (b) `api/client.ts`'s `onRefreshFail`, (c) `AuthBootstrap.tsx`'s
cold-start silent-refresh-failure catch — which today calls only a bare `logout()` and MUST be
updated to also invoke the shared routine. No teardown path MUST clear one cache without the other.

### R2 — Screenshot prevention app-wide
The app MUST call `usePreventScreenCapture()` (from `expo-screen-capture`) at the application
root, mounted unconditionally — not gated by auth state or the active screen — so screen-capture
prevention MUST be active across 100% of authenticated and unauthenticated screens.

### R3 — Accessibility sweep (scoped, not all 36 files)
Each of the 4 shared form primitives (`RHFTextInput`, `RHFSelect`, `RHFPickerField`,
`RHFDateField`) and each of the 4 named screens (`AttachmentsSection`, `MoreScreen`,
`DevicesScreen`, `NotificationsScreen`) MUST expose `accessibilityLabel` and an appropriate
`accessibilityRole` on every interactive element they render, and MUST enforce a minimum 44x44 px
touch target on every interactive element (including `AttachmentsSection`'s undersized delete
button). This requirement MUST NOT extend to any other mobile file.

### R4 — i18n stragglers eliminated
`RHFPickerField.tsx` and `RHFDateField.tsx` MUST NOT contain any hardcoded user-facing string
literal for their default placeholder text. Both defaults MUST resolve through `t()` against new
keys added to `es.json`.

### R5 — Version, placeholder assets, and release config
`app.config.ts`'s `version` MUST read `'1.0.0'`. `app.config.ts` MUST reference a committed
`icon`, `splash`, and `android.adaptiveIcon` placeholder asset, each under a new
`apps/mobile/assets/` directory, and each referenced path MUST resolve to an existing file. A
`runtimeVersion` policy MUST be set for dev-client compatibility.

### R6 — PHI-at-rest audit + release runbook
A PHI-at-rest audit document MUST exist, enumerating what PHI is stored, where, and how it is
protected (SecureStore, MMKV encryption, the R1 teardown consolidation), with an explicit verdict
per category. An EAS release runbook document MUST exist, enumerating every remaining Human/ops
step required to actually ship to the stores (see **Release runbook** section below) — so this
change's completion is never misread as an actual store release.

### R7 — Regression containment
`packages/core` MUST remain unmodified. `apps/web` MUST remain byte-unchanged (zero diffs under
`apps/web/**`) and MUST keep building and linting green. `apps/mobile`'s type-check,
`expo-doctor`, and `expo export` MUST all pass after this change.

### R8 — Non-functional constraints
This change MUST NOT raise the existing OS floor (iOS 15.1 / Android API 24). All new or modified
user-facing strings MUST be Spanish-first via `t()`/`es.json`. This change MUST NOT introduce any
new PHI value (patient name, address, photo, or other PHI field) into a `console.*` log statement.

## Scenarios

#### Scenario: teardown-clears-both-caches-all-3-sites **(headless — code trace)**
Traces: R1
- GIVEN the shared teardown routine's 3 call sites (`MoreScreen` logout, `api/client.ts`
  `onRefreshFail`, `AuthBootstrap` cold-start catch)
- WHEN each call site's code path is traced
- THEN all 3 invoke the same shared routine, and that routine clears both the MMKV cache and the
  expo-image memory+disk caches — no site clears one without the other

#### Scenario: screen-capture-mounted-at-root **(headless — code trace)**
Traces: R2
- GIVEN the app's root component tree
- WHEN traced for `usePreventScreenCapture()`
- THEN exactly one unconditional call exists at the root, not gated by auth state or route

#### Scenario: a11y-props-present-in-scoped-files **(headless — grep)**
Traces: R3
- GIVEN the 8 named files (4 RHF primitives + 4 screens)
- WHEN grepped for interactive elements missing `accessibilityLabel`/`accessibilityRole`
- THEN zero matches are found, and `tsc` passes with no errors from the added props

#### Scenario: i18n-stragglers-zero **(headless — grep)**
Traces: R4
- GIVEN `RHFPickerField.tsx` and `RHFDateField.tsx`
- WHEN grepped for the literals `'Seleccionar'` and `'Seleccionar fecha'`
- THEN zero matches remain outside `es.json`, and both defaults resolve via `t()` keys present in
  `es.json`

#### Scenario: version-and-assets-configured **(headless — config-read)**
Traces: R5
- GIVEN `app.config.ts` and `apps/mobile/assets/`
- WHEN the config is parsed and referenced asset paths are checked
- THEN `version` reads `'1.0.0'`, `icon`/`splash`/`android.adaptiveIcon` each resolve to an
  existing committed file, and `runtimeVersion` is set

#### Scenario: docs-exist-and-enumerate-remainder **(headless — code trace)**
Traces: R6
- GIVEN the PHI-at-rest audit doc and the EAS release runbook doc
- WHEN both files are inspected
- THEN the audit doc states an explicit verdict per PHI category, and the runbook enumerates every
  item listed in **Release runbook** below

#### Scenario: core-and-web-unbroken **(headless — build)**
Traces: R7
- GIVEN this change touches only `apps/mobile`
- WHEN `git diff --stat -- packages/core apps/web` is inspected and
  `pnpm --filter web build && pnpm --filter web lint` run
- THEN the diff is empty and both commands exit 0

#### Scenario: mobile-toolchain-green **(headless — build)**
Traces: R5, R7
- GIVEN all code-hardening and config changes are in place
- WHEN `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, and `npx expo export` run in
  `apps/mobile`
- THEN all three exit 0 with no failing checks or bundling errors

#### Scenario: screenshots-blocked-on-device **(Human/EAS smoke)**
Traces: R2
- GIVEN a physical/simulator Android device and iOS device on a dev-client build with this change
- WHEN a screenshot/recording is attempted while any screen is foregrounded
- THEN Android blocks/blackens the capture (`FLAG_SECURE`) and iOS blocks/obscures it — NOT
  provable headlessly

#### Scenario: screen-reader-reads-labels **(Human/EAS smoke)**
Traces: R3
- GIVEN VoiceOver (iOS) or TalkBack (Android) enabled on a real/simulator device
- WHEN a user navigates the 8 scoped files' interactive elements
- THEN the screen reader announces the configured labels/roles — NOT provable headlessly

#### Scenario: large-font-scaling-holds **(Human/EAS smoke)**
Traces: R3
- GIVEN the device OS font-scale set to its largest accessibility setting
- WHEN the 8 scoped files render on a real/simulator device
- THEN touch targets remain reachable and text does not clip/overlap — NOT provable headlessly

#### Scenario: real-eas-build-succeeds **(Human/EAS smoke)**
Traces: R5
- GIVEN valid EAS credentials and this change's placeholder assets/config committed
- WHEN a real `eas build` runs for iOS and Android
- THEN both builds complete using the placeholder icon/splash/adaptiveIcon — NOT provable
  headlessly, requires real EAS credentials (out of scope per proposal)

## API surface

**N/A** — this change touches no API endpoint. No route is added, modified, or removed.

## DTOs

**N/A** — no request/response shape is added or changed.

## Validation rules

**N/A** — this change is config, hardening, and docs only; no request-body or form-schema
validation is introduced.

## Release runbook (Human/ops — out of scope, enumerated)

Shipping to the App Store / Play Store requires, beyond this change:
- Real branded icon/splash/adaptiveIcon artwork + store screenshots (design deliverable).
- EAS credentials: Apple Developer account + ASC API key; Google Play service account (ops).
- Actual `eas build --profile production` / `eas submit` runs (iOS + Android).
- Device QA on real iOS 15.1 / Android 7 hardware.
- Store listing metadata; populating `submit.production` in `eas.json`.
- A deployed production API, including `GET /collaborators/me` and the `Push:CredentialsJson` FCM
  credential.
- The accumulated Human/EAS device smokes from changes #5–#10.
