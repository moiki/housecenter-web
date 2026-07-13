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
- [ ] 1.1 `apps/mobile/package.json` — `core: workspace:*`, `expo ~55.0.0`, `react 19.2.x`/`react-native 0.83.x`, `@tanstack/react-query ^5.101.0` (+persist-client+async-storage-persister), `expo-dev-client`, `expo-constants`, `expo-localization`, nav/mmkv/netinfo/i18n stack, scripts (R1, R2, R8)
- [ ] 1.2 `apps/mobile/index.ts` — `registerRootComponent(App)`; `package.json#main = "index.ts"` (R1)
- [ ] 1.3 `apps/mobile/App.tsx` — minimal default-export root (placeholder render; providers/nav land in PR2/PR3) (R1)
- [ ] 1.4 `apps/mobile/app.config.ts` — `extra.API_BASE_URL` from `process.env`, `ios.bundleIdentifier`/`android.package`, `newArchEnabled: true` (R8)
- [ ] 1.5 `apps/mobile/metro.config.js` — `getDefaultConfig` + `resolver.unstable_enablePackageExports = true` + `watchFolders`/`nodeModulesPaths` anchored to monorepo root (R2)
- [ ] 1.6 `apps/mobile/tsconfig.json` — extends `../../tsconfig.base.json`; `lib: ["ES2023"]`; no `core/*` paths entry (R2)
- [ ] 1.7 `apps/mobile/eas.json` — `development`(dev-client)/`preview`/`production` profiles, each own `env.API_BASE_URL` (R8)
- [ ] 1.8 `apps/mobile/src/config/env.ts` — reads `Constants.expoConfig.extra.API_BASE_URL` via `expo-constants` (R8)
- [ ] 1.9 (conditional) root `package.json` — add `pnpm.overrides.react` pinning one `19.2.x` ONLY if 1.10 reveals >1 hoisted `react` version (R1)
- [ ] 1.10 Gate: `pnpm install` at root exits 0; `pnpm why react` reports exactly one resolved `react` across `apps/web`/`apps/mobile`/`packages/core` (R1)
- [ ] 1.11 Gate: `pnpm --filter mobile exec tsc --noEmit` exits 0 (R2)
- [ ] 1.12 Gate: `npx expo-doctor` (in `apps/mobile`) — no failed checks; confirm generated Android `minSdkVersion == 24` (R1)
- [ ] 1.13 Gate: `npx expo export` (in `apps/mobile`) — scaffold bundles with no error (baseline sanity; the genuine `core`-resolves-through-Metro proof completes at task 2.1, per design ADR-5) (R2)
- [ ] 1.14 Gate: `pnpm --filter web build` exits 0 — regression guard (R10)

**PR1 done when:** gates 1.10–1.14 pass or are honestly reported as "needs dev/CI env"; `apps/mobile` boots a blank dev-client screen.

## Phase 2: Providers — PR2 (~130–160 lines)
- [ ] 2.1 `apps/mobile/src/lib/queryClient.ts` — `QueryClient` seeded from `core/lib/queryClient`'s `getDefaultOptions().queries` (`staleTime 30_000`, `retry 1`, `refetchOnWindowFocus false`) + local `gcTime: 24h`; this value-import from `core` is the Metro package-exports resolution proof (Q4) (R2, R3)
- [ ] 2.2 `apps/mobile/src/lib/mmkv.ts` — encrypted `new MMKV({ id: 'housecenter-cache', encryptionKey })`; `// TODO(#5): source key from expo-secure-store` (R3)
- [ ] 2.3 `apps/mobile/src/lib/persister.ts` — AsyncStorage-shaped `{getItem,setItem,removeItem}` adapter over `mmkv.ts` → `createAsyncStoragePersister` (R3)
- [ ] 2.4 `apps/mobile/src/providers/connectivity.ts` — `onlineManager.setEventListener` bridging `@react-native-community/netinfo`; `focusManager.setFocused` bridging RN `AppState` (R4)
- [ ] 2.5 `apps/mobile/src/i18n/index.ts` + `src/i18n/locales/es.json` — `i18next`+`react-i18next`+`expo-localization` init; `lng`/`fallbackLng: 'es'` (R5)
- [ ] 2.6 `apps/mobile/src/providers/AppProviders.tsx` — compose `SafeAreaProvider` → `PersistQueryClientProvider` (`persister`, `maxAge: 24h`) → `I18nextProvider` → `NavigationContainer`; `useEffect` runs `initConnectivity()` once (R3, R4, R5)
- [ ] 2.7 `apps/mobile/App.tsx` — wrap root in `AppProviders` (supersedes PR1's placeholder) (R3)
- [ ] 2.8 Gate: `tsc --noEmit`; `expo-doctor`; `expo export` (now proves `core` resolves via 2.1's value-import, Q4); `pnpm --filter web build` regression (R2, R10)

**PR2 done when:** gates pass (or honestly reported as env-blocked); a dev-harness reload restores a pre-seeded MMKV cache entry before any fetch (query-persister-hydrates scenario — manual/dev-harness check, no automated test runner).

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
