# SDD Spec — Mobile App Foundation

## Requirements

### R1 — Expo SDK 55 Scaffold, Single React Instance

`apps/mobile` MUST be a managed **Expo SDK 55** app (React 19.2 / RN 0.83) with `expo-dev-client` installed from the first commit. `pnpm install` at the workspace root MUST resolve `apps/mobile`'s dependency tree and hoist exactly **one** `react` version shared with `apps/web` and `packages/core`.

### R2 — `core` Consumption via Workspace Protocol + Metro Package-Exports

`apps/mobile/package.json` MUST declare `"core": "workspace:*"`. `apps/mobile/tsconfig.json` MUST use `moduleResolution: "bundler"` and MUST NOT declare `core/*` in `compilerOptions.paths`. `metro.config.js` MUST set `config.resolver.unstable_enablePackageExports = true` and MUST anchor `watchFolders`/`nodeModulesPaths` to the monorepo root.

### R3 — Offline Read Cache (QueryClient + Encrypted MMKV Persister)

The system MUST construct a `QueryClient` mirroring `core/lib/queryClient.ts` defaults (`staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`) and MUST wrap the app in `PersistQueryClientProvider` backed by an async, AsyncStorage-shaped persister over an **encrypted** `react-native-mmkv` instance (`new MMKV({ id, encryptionKey })`). This provides READ-cache persistence only.

### R4 — Connectivity-Aware Query Manager

The system MUST wire `@react-native-community/netinfo` to TanStack Query's `onlineManager` (reads reflect offline state; writes gate on connectivity) and MUST wire RN `AppState` to `focusManager`.

### R5 — Spanish-Default i18n

The system MUST initialize `react-i18next` at bootstrap (before any screen renders) with Spanish (`es`) as the default language and a configured fallback language.

### R6 — Navigation Shell

The system MUST provide a React Navigation v7 shell (`native-stack` + `bottom-tabs`) with placeholder tab/stack routes. It MUST NOT include any real feature screen.

### R7 — Shared RN UI Primitives

`apps/mobile/src/components/shared/` MUST contain `QueryBoundary`, `OfflineBanner`, a loading state, and an empty state, as RN-rendering components. These MUST NOT be added to `packages/core`.

### R8 — Environment Plumbing

`app.config.ts` MUST expose `extra.API_BASE_URL`, readable at runtime via `expo-constants`. `eas.json` MUST define `development`, `preview`/`staging`, and `production` build profiles, each supplying its own `API_BASE_URL`.

### R9 — Out-of-Scope Exclusions

The system MUST NOT wire `setApiClient`/real auth, `expo-secure-store` token storage, any real feature screen, camera/media/attachment upload, or push registration. `packages/core/src/api/modules/attachments.api.ts` MUST remain byte-for-byte unmodified (its `file: File` web-shaped signature is deferred, tracked as a blocking task for change #7).

### R10 — Web Build Non-Regression

Adding `apps/mobile` MUST NOT break `apps/web`. `pnpm --filter web build` MUST continue to exit 0 after `apps/mobile`'s dependencies are hoisted into the shared `node_modules`.

## Scenarios

#### Scenario: install-resolves-single-react
- GIVEN `apps/mobile/package.json` pins `react`/`react-native` to Expo SDK 55's versions
- WHEN `pnpm install` runs at the workspace root
- THEN it exits 0
- AND `pnpm why react` (or equivalent) reports exactly one resolved `react` version across `apps/web`, `apps/mobile`, `packages/core`
- Traces: R1

#### Scenario: expo-doctor-clean
- GIVEN the SDK 55 scaffold is installed
- WHEN `npx expo-doctor` runs inside `apps/mobile`
- THEN no check fails (including generated Android `minSdkVersion` == 24)
- Traces: R1

#### Scenario: core-resolves-in-metro
- GIVEN a file in `apps/mobile/src` imports a subpath from `core` (e.g. `core/types/patient.types`)
- WHEN `npx expo export` runs inside `apps/mobile`
- THEN the bundle succeeds with no "Unable to resolve module" error for `core`
- Traces: R2

#### Scenario: mobile-typechecks
- GIVEN `apps/mobile/tsconfig.json` extends `../../tsconfig.base.json` with no `core/*` path override
- WHEN `pnpm --filter mobile exec tsc --noEmit` runs
- THEN it exits 0 with no errors
- Traces: R2

#### Scenario: query-persister-hydrates
- GIVEN the encrypted-MMKV persister has a previously-seeded query cache entry
- WHEN the app remounts (simulated reload in a dev harness, no backend call)
- THEN `PersistQueryClientProvider` restores the cached data before any network fetch
- Traces: R3

#### Scenario: offline-online-manager
- GIVEN NetInfo reports no connection
- WHEN `onlineManager.isOnline()` is read
- THEN it returns `false`, and returns `true` once NetInfo reports connectivity restored
- Traces: R4

#### Scenario: i18n-es-default
- GIVEN i18n is initialized at app bootstrap with no device-locale override
- WHEN `t('some.key')` is called
- THEN it returns the Spanish string from `locales/es.json`
- Traces: R5

#### Scenario: nav-shell-renders
- GIVEN the EAS dev client boots the app
- WHEN `RootNavigator`/`TabNavigator` mount
- THEN the placeholder tab bar renders with no navigation error and no real screen content
- Traces: R6

#### Scenario: ui-primitives-present
- GIVEN `apps/mobile/src/components/shared/`
- WHEN listed
- THEN it contains `QueryBoundary.tsx`, `OfflineBanner.tsx`, a loading-state component, and an empty-state component
- AND `grep -rl "QueryBoundary\|OfflineBanner" packages/core/src` returns zero matches
- Traces: R7

#### Scenario: env-extra-resolves
- GIVEN `app.config.ts` defines `extra.API_BASE_URL` and `eas.json` supplies a per-profile value
- WHEN the app reads `Constants.expoConfig.extra.API_BASE_URL` under each EAS build profile
- THEN it resolves to that profile's configured URL (dev/preview/prod each differ)
- Traces: R8

#### Scenario: out-of-scope-guard
- GIVEN the PR1–PR3 diff for `mobile-app-foundation`
- WHEN `grep -rn "setApiClient\|expo-secure-store" apps/mobile/src` is run
- THEN it returns zero matches
- AND `git diff` shows `packages/core/src/api/modules/attachments.api.ts` unchanged
- Traces: R9

#### Scenario: web-build-unbroken
- GIVEN `apps/mobile` has been added with its full dependency tree
- WHEN `pnpm --filter web build` runs
- THEN it exits 0, unchanged from its pre-change behavior
- Traces: R10

## Config contracts

**`apps/mobile/package.json` (key deps):**
```json
{
  "dependencies": {
    "expo": "~55.0.0",
    "expo-dev-client": "~55.0.0",
    "expo-constants": "~55.0.0",
    "expo-localization": "~55.0.0",
    "react": "19.2.x",
    "react-native": "0.83.x",
    "core": "workspace:*",
    "@tanstack/react-query": "^5.101.0",
    "@tanstack/react-query-persist-client": "^5.101.0",
    "@tanstack/query-async-storage-persister": "^5.101.0",
    "react-native-mmkv": "^3",
    "@react-native-community/netinfo": "*",
    "react-i18next": "*",
    "i18next": "*",
    "@react-navigation/native": "^7",
    "@react-navigation/native-stack": "^7",
    "@react-navigation/bottom-tabs": "^7",
    "react-native-screens": "*",
    "react-native-safe-area-context": "*"
  }
}
```
No `react-dom` (native app, no DOM renderer). `react` MUST match `apps/web`'s major (`^19.2.6`).

**`metro.config.js`:**
```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);
config.resolver.unstable_enablePackageExports = true;
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
module.exports = config;
```

**`apps/mobile/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2023"],
    "jsx": "react-jsx",
    "noEmit": true,
    "moduleResolution": "bundler",
    "types": ["expo/types"]
  },
  "include": ["src", "App.tsx", "app.config.ts"]
}
```
No `paths` entry for `core/*`.

**`app.config.ts` (`extra`/env shape):**
```ts
export default ({ config }: { config: ExpoConfig }) => ({
  ...config,
  name: 'HouseCenter Mobile',
  slug: 'housecenter-mobile',
  extra: {
    API_BASE_URL: process.env.API_BASE_URL,
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
```
Read at runtime via `Constants.expoConfig?.extra?.API_BASE_URL`.

**`eas.json` (profiles):**
```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "env": { "API_BASE_URL": "<dev-url>" } },
    "preview": { "distribution": "internal", "env": { "API_BASE_URL": "<staging-url>" } },
    "production": { "env": { "API_BASE_URL": "<prod-url>" } }
  }
}
```

## Verification rules

| Check | Command | Expected |
|---|---|---|
| Install resolves | `pnpm install` | exit 0 |
| Single React copy | `pnpm why react` | exactly one resolved `react` version workspace-wide |
| Mobile typechecks | `pnpm --filter mobile exec tsc --noEmit` | exit 0, no errors |
| Expo doctor clean | `npx expo-doctor` (in `apps/mobile`) | no failed checks (SDK 55 config, Android `minSdkVersion` 24) |
| `core` resolves through Metro | `npx expo export` (in `apps/mobile`) | bundle succeeds, no unresolved-module error for `core` |
| Web build regression guard | `pnpm --filter web build` | exit 0, unchanged |
| No stray auth/scope leakage | `grep -rn "setApiClient\|expo-secure-store" apps/mobile/src` | zero matches |
| `attachments.api.ts` untouched | `git diff --stat packages/core/src/api/modules/attachments.api.ts` | no diff |
| UI primitives isolated to mobile | `grep -rl "QueryBoundary\|OfflineBanner" packages/core/src` | zero matches |
| i18n default locale | dev harness: `i18n.language` after init | `es` |
