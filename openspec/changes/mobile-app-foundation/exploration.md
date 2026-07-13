# Exploration — Mobile App Foundation (Expo Scaffold, Change #4)

## Summary

The master plan's "Expo (managed) SDK 52+" pin is **wrong in a way that matters**: SDK 52 ships
React 18.3 / RN 0.76, which is a React-major mismatch against `packages/core`'s
`peerDependencies.react: "^19"` and `apps/web`'s `react: "^19.2.6"`. Verified against the real
Expo SDK → React Native → React matrix (SDK 53 = React 19.0/RN 0.79; SDK 54 = React 19.1/RN 0.81;
SDK 55 = React 19.2/RN 0.83; SDK 56 = React 19.2/RN 0.85 — current stable), the fix is:
**pin `apps/mobile` to Expo SDK 55**. It ships React 19.2 (near-exact match to web's `19.2.6`),
and it **still ships iOS min 15.1 / Android min API 24** — preserving the master plan's stated device
floor exactly. SDK 56 bumps the iOS floor to **16.4**, dropping iPhone 7/7+, 6s/6s+, and SE (1st gen)
— a real trade-off that must be a deliberate, visible decision, not an accidental side effect of
"use the latest SDK."

On Metro: the monorepo's `node-linker=hoisted` (flat `node_modules`) plus Expo SDK 52+
auto-monorepo-detection in `expo/metro-config` make this easier than typical pnpm-symlink stories —
no manual `watchFolders`/`.pnpm` hacks needed. A thin explicit `metro.config.js` is still recommended
to assert `unstable_enablePackageExports` rather than rely on the default.

**Confidence: Medium-High.** High on the SDK/React/OS-floor matrix (multiple official
`expo.dev/changelog` fetches). Medium on two specifics to prove empirically during apply/verify:
(a) Android `minSdkVersion` staying at 24 through SDK 55 (strongly indicated, not in an explicit
SDK-55 note), and (b) Metro's package-exports resolver handling core's wildcard subpath pattern
(`"./types/*": "./src/types/*.ts"`) — prove via an `expo export` dry-run.

## Confirmed

1. **React version mismatch is real; the fix is SDK 55, not "52+".**
   - SDK 52: RN 0.76, React 18.3 — introduced the iOS 15.1 floor, but NOT React 19.
   - SDK 53: RN 0.79, React 19.0. New Arch default-on. Metro `exports` support default-on. iOS min 15.1.
   - SDK 54: RN 0.81, React 19.1. Android target API 36 (target, not minimum — `minSdkVersion` 24 still default). Last SDK with Legacy Architecture opt-out.
   - SDK 55: RN 0.83, React 19.2. **New Arch mandatory.** Expo SDK-55 notes: "minimum iOS for SDK 55 is still 15.1" and "we plan to bump the minimum iOS from 15.1 to 16.4 in SDK 56." First-party packages version-lock to the SDK major.
   - SDK 56 (current stable, ~May 2026): RN 0.85, React 19.2. iOS min bumped to **16.4** — drops iPhone 7/7+, 6s/6s+, SE (1st gen). Android minimum not restated (no evidence of an API-24 change).
   - Core's peerDep `react ^19` is satisfied by SDK 53/54/55/56; SDK 55 is preferred for React 19.2 (tightest match to web 19.2.6) + preserved OS floor + only one SDK behind current.

2. **Metro monorepo resolution is lower-risk given this repo's setup.** Since SDK 52+, `expo/metro-config`'s `getDefaultConfig(__dirname)` auto-detects the monorepo root and sets `watchFolders`/`nodeModulesPaths`. `.npmrc node-linker=hoisted` (flat `node_modules`) is the simpler case for Metro (no `.pnpm`/symlink tricks). Core's `exports` map (raw-TS-source, trailing-wildcard subpaths) is the same shape `apps/web` consumes via Vite/`tsc` (`moduleResolution:"bundler"`); Metro's package-exports resolver (default-on since RN 0.79) implements the same Node pattern-exports algorithm — should resolve equivalently, but warrants an `expo export` proof.

3. **`apps/mobile` consuming `core` needs no TS `paths` hack.** `apps/web/tsconfig.app.json` has no `core/*` remapping — resolves via `workspace:*` + `moduleResolution:"bundler"` respecting `package.json#exports`. Mobile does the same.

4. **`attachments.api.ts`'s DOM (`File`/`FormData`) does not block #4.** `new FormData()` is a real RN global; the `file: File` TS signature is web-shaped but #4 wires zero attachment screens, so Metro's module-graph bundler never pulls the file in. Confirmed not a blocker; flagged as debt to fix before change #7 (broaden `file` to a union / platform-agnostic `AttachmentPayload`).

5. **Library stack for the SDK 55 floor:**
   | Library | Notes |
   |---|---|
   | React Navigation v7 (`native` + `native-stack` + `bottom-tabs`) | `bottom-tabs` needs Expo ≥53 + `react-native-screens` ≥4.25; dev build (not Expo Go). |
   | `react-native-screens`, `react-native-safe-area-context` | Autolinked, New-Arch-ready. |
   | `@tanstack/react-query-persist-client` + `query-async-storage-persister` | Persister takes any getItem/setItem/removeItem adapter; MMKV via a thin adapter (community pattern). |
   | `react-native-mmkv` (v3/v4, Nitro/JSI) | **Requires a custom dev client — not Expo Go.** Built-in encryption (`new MMKV({id, encryptionKey})`) matches the "encrypted MMKV for PHI at rest" plan decision. Independently forces EAS dev client from day 1. |
   | `@react-native-community/netinfo` | Autolinked; standard `onlineManager.setEventListener` wiring. |
   | `react-i18next` + `i18next` + `expo-localization` | Pure JS/Expo module; no plugin. |
   | `expo-constants` | Reads `app.config.ts` `extra` at runtime. |
   | New Arch at API 24 | RN's iOS-15.1/Android-24 floor (RN 0.76) already reflects the New-Arch era; SDK 55 making New Arch mandatory adds no floor bump. |

6. **EAS dev client is required from #4** (not optional) — `react-native-mmkv` (native/JSI) can't load in Expo Go, independent of push (#9).

## Discrepancies / corrections

- **Master plan "Expo SDK 52+" → correction: pin SDK 55 specifically.** "52+" as written allows re-installing at SDK 52 (reintroducing the React 18/19 split) and its unbounded top (SDK 56) silently breaks the iOS 15.1 floor.
- **iOS floor risk starts one SDK later than a naive reading:** the plan's "iOS 15.1+" is correct for SDK 52–55; the break is at SDK 56. So React-alignment and OS-floor preservation are NOT in tension as long as the pin is SDK 55 (not 56, not "latest").
- **SDK 55 is one behind current stable (56)** — a supported/common pattern (EAS Build backward-compat window > Expo Go's latest-only), but name it explicitly as "SDK 55 now, planned follow-up SDD change to SDK 56+ once ready to raise the floor to iOS 16.4," not silent deferral.
- **Android `minSdkVersion`=24 at SDK 55 is inferred, not directly documented** — verify via `expo-doctor`/generated `android/build.gradle` during apply.

## Additional considerations for the proposal

- **Single React instance across the hoisted `node_modules`:** pin `apps/mobile` react/react-dom to the exact range SDK 55 expects (React 19.2.x), verify it overlaps web's `^19.2.6`; if drift, add a root `pnpm.overrides` forcing one `react` version (avoid the "two copies of React / invalid hook call" failure).
- **`metro.config.js` shape:** `getDefaultConfig(projectRoot)` from `expo/metro-config`; assert `config.resolver.unstable_enablePackageExports = true`; explicitly anchor `watchFolders=[monorepoRoot]` + `nodeModulesPaths=[project, monorepoRoot]` for clarity/future-proofing (redundant with auto-detect but documents intent).
- **`apps/mobile/tsconfig.json`:** extend the shared `../../tsconfig.base.json` (not `expo/tsconfig.base`), add `lib:["ES2023"]`, `jsx:"react-jsx"`, `noEmit:true`, `types:["expo/types"]`; no `core/*` paths.
- **`apps/mobile/package.json`:** `"core":"workspace:*"`, `expo` on the SDK 55 line, react/react-native at SDK-55 versions, `@tanstack/react-query ^5` (same 5.101.x line as web/core peerDep), the nav/persister/i18n/netinfo/mmkv stack, and `expo-dev-client` from the first commit.
- **#4 owns QueryClient + persister + connectivity, NOT auth wiring.** Build a `QueryClient` (mirroring `core/lib/queryClient.ts` defaults: staleTime 30_000, retry 1, refetchOnWindowFocus false), `PersistQueryClientProvider` + MMKV-backed persister, `onlineManager`/`focusManager` via NetInfo/AppState. Smoke-testable without a backend (seed the persisted cache in a dev harness). Do NOT call `setApiClient`/wire real auth — that's #5.
- **i18n default `es`** at bootstrap (default + fallback), before #5/#6 add screens.
- **Shared UI primitives** (`QueryBoundary`, `OfflineBanner`, loading/empty) live in `apps/mobile/src/components/shared/` (mirror web naming), NOT in `core` (they're RN-rendering, not UI-agnostic).

## Recommendation

1. **Pin `apps/mobile` to Expo SDK 55** (React 19.2 / RN 0.83) — resolves the React-major mismatch while preserving iOS 15.1 / Android API 24. Record the SDK-56 iOS-16.4 bump as a named future trade-off requiring a product call.
2. **Explicit `metro.config.js`** on `expo/metro-config` `getDefaultConfig`, asserting `unstable_enablePackageExports` + monorepo anchors.
3. **`apps/mobile/tsconfig.json` extends the shared root base** — no `core/*` remapping.
4. **EAS dev client mandatory from #4's first PR** (`react-native-mmkv` forces it).
5. **Do not touch `attachments.api.ts` in #4** (inert for Metro bundling); log the `File`/`FormData` type-debt as a blocking task for #7.
6. **Verification set for #4:** `pnpm install` (single React copy), `pnpm --filter mobile exec tsc --noEmit`, `npx expo-doctor`, `npx expo export` (Metro bundle dry-run proving `core` resolves through the RN bundler graph), and `pnpm --filter web build` (regression guard). EAS build + on-device run remain a human/CI step.
