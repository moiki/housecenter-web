# Tasks: Mobile App Foundation

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated reviewable lines (hand-written; lockfile + generated native `ios/`/`android/` dirs excluded) | PR1 ~160–190, PR2 ~130–160, PR3 ~130–160 → ~420–510 total across all 3 |
| 400-line budget risk | Low per PR (each comfortably under 400) |
| Chained PRs recommended | Yes |
| Suggested split | 3 PRs — one per phase below, per design.md's build/PR sequence |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

**Basis:** purely additive scaffolding under a previously-empty `apps/mobile/` placeholder —
no renames, no rename discount. PR1's config/boilerplate (`package.json` ~50 lines/~20 deps,
`app.config.ts` ~20, `metro.config.js` ~15, `tsconfig.json` ~15, `eas.json` ~20,
`index.ts`+`App.tsx`+`env.ts` ~35) lands ~160–190. PR2's providers
(`queryClient`/`mmkv`/`persister` ~35, `AppProviders.tsx` ~45, `connectivity.ts` ~15,
`i18n` index+`es.json` ~30) lands ~130–160. PR3's nav+primitives (`RootNavigator`/
`TabNavigator` ~35, 4 shared components ~90–110) lands ~130–160. Each PR is well under the
400-line budget on its own; chaining is recommended per design.md's own 3-PR sequence for
clean separation of concerns (scaffold → providers → navigation), not because any single PR
risks overflow. **Decision needed before apply is No**: the user has pre-authorized
implementing this change (#4); chain strategy (stacked-to-main) is recorded per the delivery
strategy default and design.md's sequence — no further gate is needed before apply.

**Environment caveat:** gates that shell out to `expo-doctor`/`expo export`/native installs
need network access + the Expo CLI toolchain. If the apply environment cannot run these
headlessly, files must still be created and the gate reported honestly as "could not run —
needs dev/CI environment," never faked as passing.

## Phase 1: Scaffold + Workspace Wiring — PR1 (~160–190 lines)
- [x] 1.1 `apps/mobile/package.json` — `core: workspace:*`, `expo ~55.0.0`, `react 19.2.x`/`react-native 0.83.x`, `@tanstack/react-query ^5.101.0` (+persist-client+async-storage-persister), `expo-dev-client`, `expo-constants`, `expo-localization`, nav/mmkv/netinfo/i18n stack, scripts (R1, R2, R8)
- [x] 1.2 `apps/mobile/index.ts` — `registerRootComponent(App)`; `package.json#main = "index.ts"` (R1)
- [x] 1.3 `apps/mobile/App.tsx` — minimal default-export root (placeholder render; providers/nav land in PR2/PR3) (R1)
- [x] 1.4 `apps/mobile/app.config.ts` — `extra.API_BASE_URL` from `process.env`, `ios.bundleIdentifier`/`android.package` (R8) — DEVIATION: no `newArchEnabled` key; SDK 55's `ExpoConfig` type dropped it (New Arch is now mandatory, not a toggle — setting it is a `tsc` error). Also added `platforms: ['ios','android']` (not in original sketch) so `expo export`/`expo-doctor` don't default to a `web` bundle target, which `apps/web` (Vite) already owns.
- [x] 1.5 `apps/mobile/metro.config.js` — `getDefaultConfig` + `resolver.unstable_enablePackageExports = true` + `watchFolders`/`nodeModulesPaths` anchored to monorepo root (R2) — DEVIATION: `watchFolders` is merged with Expo's own auto-detected defaults (`[...new Set([...config.watchFolders, monorepoRoot])]`), not a wholesale replacement — `expo-doctor`'s Metro check requires our list to be a superset of Expo's defaults on SDK <56, and a wholesale replace failed that check.
- [x] 1.6 `apps/mobile/tsconfig.json` — extends `../../tsconfig.base.json`; `lib: ["ES2023"]`; no `core/*` paths entry (R2)
- [x] 1.7 `apps/mobile/eas.json` — `development`(dev-client)/`preview`/`production` profiles, each own `env.API_BASE_URL` (R8)
- [x] 1.8 `apps/mobile/src/config/env.ts` — reads `Constants.expoConfig.extra.API_BASE_URL` via `expo-constants` (R8)
- [x] 1.9 root `package.json` — added `pnpm.overrides.react: "^19.2.6"`. Drift WAS detected (see 1.10): mobile's exact `react@19.2.0` pin (SDK 55 bundled) hoisted to root, forcing `apps/web`/`packages/core` into a locally-nested `react@19.2.7`. Override forces one workspace-wide copy. Also declared `apps/mobile/package.json#expo.install.exclude: ["react","typescript"]` (Expo's own documented mechanism, https://expo.fyi/dependency-validation) to formalize the two remaining *intentional* `expo-doctor` version deviations (react 19.2.7 > SDK's 19.2.0; typescript 6.0.3 > Expo template's ~5.9.2, matching the repo's single-TS-version convention) as declared, not accidental.
- [x] 1.10 Gate: `pnpm install` at root exits 0 (verified) — PASS; `pnpm why react -r` / physical `node_modules/react` scan confirms exactly **one** resolved `react@19.2.7` across `apps/web`/`apps/mobile`/`packages/core` after the 1.9 override (before the override: two physical copies — root-hoisted `19.2.0` + locally-nested `19.2.7` in `apps/web` and `packages/core`). Also discovered and fixed a real, registry-confirmed peer mismatch: `@tanstack/react-query-persist-client` free-floated to its own latest (5.101.2, peer `^5.101.2`) while `@tanstack/react-query` stayed locked at 5.101.0 elsewhere — pinned mobile's `persist-client`/`async-storage-persister` to exact `5.101.0` (matching the already-locked `react-query` version) instead of bumping `apps/web`/`packages/core` (which must stay untouched per design's rollback assumption; an earlier `pnpm update -r` attempt did touch `apps/web/package.json`'s range and was reverted).
- [x] 1.11 Gate: `pnpm --filter mobile exec tsc --noEmit` exits 0 (R2) — PASS, after removing the invalid `newArchEnabled` key (see 1.4 deviation).
- [x] 1.12 Gate: `npx expo-doctor` (in `apps/mobile`) — PASS, 19/19 checks (after the 1.5 watchFolders merge fix + 1.9 `expo.install.exclude` declaration + pinning `react-native` to the registry/expo-install-confirmed `0.83.6`, not the newer `0.83.10` a live template branch suggested). Android `minSdkVersion == 24` confirmed via source inspection of the bundled `expo-modules-autolinking@55.0.24` Gradle plugin (`ExpoRootProjectPlugin.kt` line 28: default fallback `"24"`) — a full native `expo prebuild`/`eas build` was NOT run (out of scope for a headless apply).
- [x] 1.13 Gate: `npx expo export` (in `apps/mobile`) — PASS (ios: 428 modules, android: 567 modules, both `.hbc` bundles emitted, no unresolved-module errors). Baseline sanity only, per design ADR-5 — `apps/mobile/src` doesn't import from `core` yet (that value-import lands at task 2.1).
- [x] 1.14 Gate: `pnpm --filter web build` exits 0 — PASS (`tsc -b && vite build`, unchanged pre-existing chunk-size warning only).

**PR1 done when:** gates 1.10–1.14 pass or are honestly reported as "needs dev/CI env"; `apps/mobile` boots a blank dev-client screen. **All 5 gates ran for real and passed — none were env-blocked.** Native on-device dev-client boot (an actual screen render) was NOT performed — that requires an EAS build or a physical/simulator device run, out of scope for this headless apply environment; `expo export`'s successful bundle is the closest automatable proxy.

## Phase 2: Providers — PR2 (~130–160 lines) — **COMPLETE (2026-07-13)**
- [x] 2.1 `apps/mobile/src/lib/queryClient.ts` — `QueryClient` seeded from `core/lib/queryClient`'s `getDefaultOptions().queries` (`staleTime 30_000`, `retry 1`, `refetchOnWindowFocus false`) + local `gcTime: 24h`; this value-import from `core` is the Metro package-exports resolution proof (Q4) (R2, R3)
- [x] 2.2 `apps/mobile/src/lib/mmkv.ts` — encrypted `new MMKV({ id: 'housecenter-cache', encryptionKey })`; `// TODO(#5): source key from expo-secure-store` (R3)
- [x] 2.3 `apps/mobile/src/lib/persister.ts` — AsyncStorage-shaped `{getItem,setItem,removeItem}` adapter over `mmkv.ts` → `createAsyncStoragePersister` (R3)
- [x] 2.4 `apps/mobile/src/providers/connectivity.ts` — `onlineManager.setEventListener` bridging `@react-native-community/netinfo`; `focusManager.setFocused` bridging RN `AppState` (R4)
- [x] 2.5 `apps/mobile/src/i18n/index.ts` + `src/i18n/locales/es.json` — `i18next`+`react-i18next`+`expo-localization` init; `lng`/`fallbackLng: 'es'` (R5) — es.json seeded with `nav.home`/`common.offline` keys for PR3's TabNavigator/OfflineBanner.
- [x] 2.6 `apps/mobile/src/providers/AppProviders.tsx` — compose `SafeAreaProvider` → `PersistQueryClientProvider` (`persister`, `maxAge: 24h`) → `I18nextProvider` → `NavigationContainer`; `useEffect` runs `initConnectivity()` once (R3, R4, R5)
- [x] 2.7 `apps/mobile/App.tsx` — wrap root in `AppProviders` (supersedes PR1's placeholder) (R3)
- [x] 2.8 Gate: `tsc --noEmit`; `expo-doctor`; `expo export` (now proves `core` resolves via 2.1's value-import, Q4); `pnpm --filter web build` regression (R2, R10) — **all 4 ran for real and PASSED, none env-blocked.**

DEVIATION: `apps/mobile/tsconfig.json` gained `resolveJsonModule: true` (not in design's tsconfig sketch) — required for `i18n/index.ts`'s `import es from './locales/es.json'` to typecheck; no repo tsconfig had this set before (web has no JSON imports).

**PR2 done when:** gates pass (or honestly reported as env-blocked); a dev-harness reload restores a pre-seeded MMKV cache entry before any fetch (query-persister-hydrates scenario — manual/dev-harness check, no automated test runner). **Gates ran; the dev-harness MMKV-reload smoke itself is a manual/on-device check, not automatable headlessly — not performed this batch, consistent with PR1's precedent for on-device-only checks.**

Full detail (line counts, exact gate output, deviation rationale): engram `sdd/mobile-app-foundation/apply-progress` (updated).

## Phase 3: Navigation Shell + UI Primitives — PR3 (~130–160 lines)
- [ ] 3.1 `apps/mobile/src/navigation/RootNavigator.tsx` — `native-stack` wrapping `TabNavigator`, `headerShown: false` (R6)
- [ ] 3.2 `apps/mobile/src/navigation/TabNavigator.tsx` — `bottom-tabs`, single placeholder "Home" tab, renders via `useTranslation` `t('nav.home')` (R5, R6)
- [ ] 3.3 `apps/mobile/src/components/shared/QueryBoundary.tsx` — RN wrapper: loading/error/children states (R7)
- [ ] 3.4 `apps/mobile/src/components/shared/OfflineBanner.tsx` — RN banner reflecting `onlineManager`/NetInfo state (R4, R7)
- [ ] 3.5 `apps/mobile/src/components/shared/LoadingState.tsx` — RN loading indicator (R7)
- [ ] 3.6 `apps/mobile/src/components/shared/EmptyState.tsx` — RN empty-state (R7)
- [ ] 3.7 `apps/mobile/App.tsx` — mount `RootNavigator` inside `AppProviders` (final wiring) (R6)
- [ ] 3.8 Gate: `tsc --noEmit`; `expo-doctor`; `expo export`; `pnpm --filter web build`; `grep -rn "setApiClient\|expo-secure-store" apps/mobile/src` → zero matches; `grep -rl "QueryBoundary\|OfflineBanner" packages/core/src` → zero matches; `git diff --stat packages/core/src/api/modules/attachments.api.ts` → no diff (R6, R7, R9)

**PR3 done when:** gates pass (or honestly reported as env-blocked); EAS dev-client boot renders the placeholder tab bar with no navigation error and no real screen content.

## Notes (not tasks — do NOT implement here)
- `packages/core/src/api/modules/attachments.api.ts`'s `file: File` web-shaped signature is **BLOCKING for change #7** (broaden to platform-agnostic `AttachmentPayload`) — left byte-for-byte unmodified in #4.
- Dev MMKV `encryptionKey` in `src/lib/mmkv.ts` is static; **#5 (mobile-auth-session)** replaces it with an `expo-secure-store`-backed key.
- SDK 56 → iOS 16.4 floor bump remains a **named future SDD change**, not touched here.
