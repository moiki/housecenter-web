# SDD Design — Mobile App Foundation

## Change name
`mobile-app-foundation`

## Status
`design` (2026-07-12)

---

## Technical approach

Scaffold a **managed Expo SDK 55** app (React 19.2 / RN 0.83) in `apps/mobile/` that consumes
`packages/core` through Metro package-exports (no TS `paths` hack), runs on an **EAS dev client
from PR1** (`react-native-mmkv` is native/JSI), and owns the client-runtime foundation only:
a `QueryClient` + encrypted-MMKV persister, NetInfo/AppState → `onlineManager`/`focusManager`,
`react-i18next` (Spanish default), and a placeholder navigation shell. No real auth, no real
screens. Purely additive over the empty `apps/mobile` placeholder.

---

## Target directory tree

```
apps/mobile/
├── index.ts                  # registerRootComponent(App) — Expo entry ("main": "index.ts")
├── App.tsx                   # Root: <AppProviders><RootNavigator/></AppProviders> (default export)
├── app.config.ts             # ExpoConfig; extra.API_BASE_URL from process.env per EAS profile
├── eas.json                  # development (dev-client) / preview / production profiles
├── metro.config.js           # getDefaultConfig + unstable_enablePackageExports + monorepo anchors
├── tsconfig.json             # extends ../../tsconfig.base.json; lib ES2023; no core/* paths
├── package.json              # core: workspace:*; Expo SDK 55; React 19.2 / RN 0.83; stack
└── src/
    ├── config/
    │   └── env.ts            # reads Constants.expoConfig.extra.API_BASE_URL (expo-constants)
    ├── i18n/
    │   ├── index.ts          # i18next + expo-localization; es default + fallback
    │   └── locales/es.json
    ├── lib/
    │   ├── queryClient.ts    # QueryClient seeded from core defaults + gcTime for persistence
    │   ├── mmkv.ts           # encrypted MMKV instance (PHI at rest)
    │   └── persister.ts      # AsyncStorage-shaped MMKV adapter → async persister
    ├── providers/
    │   ├── AppProviders.tsx  # SafeArea → PersistQueryClient → i18n → NavigationContainer
    │   └── connectivity.ts   # NetInfo → onlineManager; AppState → focusManager
    ├── navigation/
    │   ├── RootNavigator.tsx # native-stack shell (placeholder)
    │   └── TabNavigator.tsx  # bottom-tabs placeholder (no real screens)
    └── components/shared/
        ├── QueryBoundary.tsx
        ├── OfflineBanner.tsx
        ├── LoadingState.tsx
        └── EmptyState.tsx
```

---

## Architecture decisions

### 1. Pin Expo SDK 55 (not "52+", not "latest")
**Choice**: `expo@~55.0.0` → React 19.2 / RN 0.83.
**Alternatives**: SDK 52 (React 18.3 — React-major mismatch vs `core` peer `react:^19` and web `^19.2.6`); SDK 54 (React 19.1); SDK 56 (React 19.2 but iOS floor → **16.4**).
**Rationale**: SDK 55 is the *only* option that both matches web's React 19.2 line AND preserves the master-plan device floor exactly — **iOS 15.1 / Android API 24**. SDK 56 silently raises iOS to 16.4 (drops iPhone 7/7+, 6s/6s+, SE 1st-gen). That bump is recorded as a **named future SDD change** requiring a product call, not an accidental side effect. SDK 55 is one behind current stable (56) — supported by EAS Build's backward-compat window.

### 2. Metro monorepo config + package-exports for `core`
**Choice**: explicit `metro.config.js` on `expo/metro-config` `getDefaultConfig(projectRoot)`, asserting `config.resolver.unstable_enablePackageExports = true`, `watchFolders=[monorepoRoot]`, `nodeModulesPaths=[project, monorepoRoot]`.
**Alternatives**: rely on SDK-52+ auto-monorepo-detection with no config file; add TS `core/*` paths like a symlink hack.
**Rationale**: `core` ships **raw TS** via wildcard subpath `exports` (`"./lib/*": "./src/lib/*.ts"`). Metro's package-exports resolver (default-on since RN 0.79) implements the same Node pattern-exports algorithm web consumes via Vite `moduleResolution:"bundler"` — so no `core/*` remap is needed (mirrors `apps/web/tsconfig.app.json`). Asserting the flag + anchors documents intent and de-risks a resolver default flip. `node-linker=hoisted` (flat `node_modules`) is the easy case for Metro (no `.pnpm` symlink tricks).

### 3. Single-React safeguard
**Choice**: pin mobile `react` to the SDK-55 line; verify the *single hoisted* copy also satisfies web's `^19.2.6`. If Expo's pin is below 19.2.6, add a **root** `pnpm.overrides.react` forcing one 19.2.x.
**Alternatives**: let pnpm resolve two React copies; loosen core's peer range.
**Rationale**: two React copies in one hoisted tree → "Invalid hook call". React is patch-compatible across an RN minor, so overriding to a single 19.2.x that satisfies both mobile and web (`^19.2.6`) is safe. The override is **conditional** — only added if `pnpm install` reveals drift (keeps the rollback surface minimal).

### 4. Encrypted MMKV persister via AsyncStorage-shaped adapter
**Choice**: `react-native-mmkv` (Nitro/JSI) with built-in encryption (`new MMKV({ id, encryptionKey })`), wrapped by a thin `{ getItem, setItem, removeItem }` adapter feeding `createAsyncStoragePersister`.
**Alternatives**: `@react-native-async-storage/async-storage` + its persister.
**Rationale**: cached READs contain **PHI** — MMKV encrypts at rest (AES); AsyncStorage is plaintext. MMKV is synchronous JSI (~30× faster than AsyncStorage's bridge). **Consequence**: MMKV is native/JSI and cannot load in Expo Go, which independently **forces a custom EAS dev client from PR1** (aligns with the eventual push/native needs). The dev encryption key is static now; **#5 replaces it with an `expo-secure-store`-backed key** — flagged as a follow-up, not wired here.

### 5. QueryClient / PersistQueryClientProvider mirroring core defaults
**Choice**: build a local `QueryClient` seeded from `core/lib/queryClient`'s default options plus `gcTime: 24h`; wrap the app in `PersistQueryClientProvider` (`maxAge: 24h`). READ cache only.
**Alternatives**: import and reuse core's exported singleton verbatim; hand-copy the three default values.
**Rationale**: seeding from `coreQueryClient.getDefaultOptions()` keeps the three defaults (`staleTime 30_000`, `retry 1`, `refetchOnWindowFocus false`) as a **single source of truth** (zero drift) — and this one **value import from `core` proves Metro package-exports resolves** in `expo export` (Q4). We add `gcTime` locally because persistence needs `gcTime ≥ maxAge` or restored entries get GC'd, and we must not mutate core's shared singleton. **No `setApiClient` / real auth** — that is #5.

### 6. NetInfo → onlineManager; AppState → focusManager
**Choice**: `onlineManager.setEventListener` bridging `@react-native-community/netinfo`; `focusManager.setFocused` bridging RN `AppState`. Initialized once in `AppProviders` via `useEffect`.
**Alternatives**: leave TanStack Query's web-oriented online/focus defaults (which no-op on RN).
**Rationale**: RN has no `window` online/focus events, so Query would never pause/refetch on connectivity or foreground changes without these bridges — the standard community wiring.

### 7. i18n Spanish-default init
**Choice**: `react-i18next` + `i18next` + `expo-localization`; `lng` resolves to `es`, `fallbackLng: 'es'`, single `es` bundle. Initialized at bootstrap, before any screen exists.
**Alternatives**: defer i18n until screens land (#6).
**Rationale**: establishing Spanish-first at the foundation means every future screen renders through `t()` from day one — no retrofit. Pure JS/Expo module; no native config plugin.

### 8. Navigation shell shape
**Choice**: React Navigation v7 — `native-stack` (`RootNavigator`) wrapping `bottom-tabs` (`TabNavigator`) with one placeholder tab; `headerShown:false`. Requires `react-native-screens` + `react-native-safe-area-context` (autolinked, New-Arch-ready).
**Alternatives**: expo-router; no shell until #6.
**Rationale**: a real stack→tabs skeleton lets #6 drop screens in without re-architecting navigation. Classic navigator API (not expo-router) matches the app's non-file-based routing and keeps the shell explicit.

### 9. Env via app.config.ts `extra` + eas.json profiles
**Choice**: `app.config.ts` reads `process.env.API_BASE_URL` into `extra.API_BASE_URL`; `eas.json` sets that env per profile (development → localhost, preview → staging, production → prod). Runtime read via `expo-constants` in `src/config/env.ts`.
**Alternatives**: hardcode a base URL; `.env` + `react-native-dotenv`.
**Rationale**: mirrors web's `VITE_API_BASE_URL` boundary. Foundation only **plumbs** the value; **#5 consumes it** in `setApiClient`. EAS-profile env keeps dev/staging/prod URLs out of source and out of the review budget.

---

## Provider tree

Effective nesting (composed in `providers/AppProviders.tsx`, rendered by `App.tsx`):

```
SafeAreaProvider
└── PersistQueryClientProvider (client=queryClient, persistOptions={persister, maxAge:24h})
    └── I18nextProvider (i18n)
        └── NavigationContainer
            └── {children}  ← RootNavigator (native-stack → bottom-tabs placeholder)

connectivity: initConnectivity() runs once in AppProviders' useEffect
  → onlineManager.setEventListener(NetInfo)  → focusManager.setFocused(AppState)
```

`App.tsx` is a **default export** — the lone allowed exception to core/web's named-export convention (Expo's entry requires it).

---

## Config sketches

### `apps/mobile/package.json` (deps + versions)
```jsonc
{
  "name": "mobile",
  "version": "0.0.0",
  "private": true,
  "main": "index.ts",
  "scripts": {
    "start": "expo start --dev-client",
    "ios": "expo run:ios",
    "android": "expo run:android",
    "typecheck": "tsc --noEmit",
    "doctor": "expo-doctor"
  },
  "dependencies": {
    "core": "workspace:*",
    "expo": "~55.0.0",
    "expo-constants": "*",             // via `npx expo install` — SDK-55-aligned
    "expo-dev-client": "*",            // via `npx expo install`
    "expo-localization": "*",          // via `npx expo install`
    "react": "19.2.0",                 // SDK-55 line; single-copy verified vs web ^19.2.6 (Dec 3)
    "react-native": "0.83.0",
    "react-native-mmkv": "^3.0.0",     // Nitro/JSI — forces EAS dev client
    "react-native-screens": "*",       // via `npx expo install`
    "react-native-safe-area-context": "*",
    "@react-native-community/netinfo": "*",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@tanstack/react-query": "^5.101.0",              // same line as web/core peer
    "@tanstack/react-query-persist-client": "^5.101.0",
    "@tanstack/query-async-storage-persister": "^5.101.0",
    "i18next": "^24.0.0",
    "react-i18next": "^15.0.0"
  },
  "devDependencies": {
    "@types/react": "~19.2.0",
    "typescript": "~6.0.2"             // match web/root single TS
  }
}
```
> Native/Expo-pinned libs (`*` above) MUST be installed with `npx expo install` so Expo picks
> SDK-55-compatible versions; only `expo`, `react`, `react-native`, and JS-only libs are hand-pinned.

### `apps/mobile/metro.config.js`
```js
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)
config.watchFolders = [monorepoRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]
// core ships raw-TS via package.json "exports" wildcard subpaths
config.resolver.unstable_enablePackageExports = true

module.exports = config
```

### `apps/mobile/tsconfig.json`
```jsonc
{
  "extends": "../../tsconfig.base.json",     // NOT expo/tsconfig.base
  "compilerOptions": {
    "lib": ["ES2023"],                        // no DOM — RN has no DOM
    "jsx": "react-jsx",
    "noEmit": true,
    "types": ["expo/types"]
    // moduleResolution:"bundler" + strict + verbatimModuleSyntax inherited from base
    // NO core/* paths — resolves via workspace:* + package.json#exports
  },
  "include": ["src", "App.tsx", "app.config.ts", "index.ts"]
}
```

### `apps/mobile/app.config.ts`
```ts
import type { ExpoConfig } from 'expo/config'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5000'

const config: ExpoConfig = {
  name: 'HouseCenter',
  slug: 'housecenter-mobile',
  scheme: 'housecenter',
  version: '0.0.0',
  orientation: 'portrait',
  newArchEnabled: true,                       // mandatory in SDK 55
  ios: { bundleIdentifier: 'net.housecenter.mobile' },     // SDK-55 default floor iOS 15.1
  android: { package: 'net.housecenter.mobile' },          // minSdk 24 — verify via expo-doctor (Q5)
  plugins: ['expo-localization'],
  extra: { API_BASE_URL },                    // read at runtime via expo-constants
}

export default config
```

### `apps/mobile/eas.json`
```jsonc
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,              // custom dev client (MMKV/JSI needs it)
      "distribution": "internal",
      "env": { "API_BASE_URL": "http://localhost:5000" }
    },
    "preview": {
      "distribution": "internal",
      "env": { "API_BASE_URL": "https://staging.housecenter.net" }
    },
    "production": {
      "autoIncrement": true,
      "env": { "API_BASE_URL": "https://api.housecenter.net" }
    }
  },
  "submit": { "production": {} }
}
```

### `src/lib/mmkv.ts` + `src/lib/persister.ts` (encrypted MMKV adapter)
```ts
// mmkv.ts — encrypted store for the READ cache (PHI at rest)
import { MMKV } from 'react-native-mmkv'
export const cacheStorage = new MMKV({
  id: 'housecenter-cache',
  encryptionKey: 'dev-cache-key',            // TODO(#5): source from expo-secure-store
})

// persister.ts — AsyncStorage-shaped adapter over synchronous MMKV
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { cacheStorage } from './mmkv'
const mmkvStorage = {
  getItem: (k: string) => Promise.resolve(cacheStorage.getString(k) ?? null),
  setItem: (k: string, v: string) => { cacheStorage.set(k, v); return Promise.resolve() },
  removeItem: (k: string) => { cacheStorage.delete(k); return Promise.resolve() },
}
export const persister = createAsyncStoragePersister({
  storage: mmkvStorage,
  key: 'housecenter-query-cache',
})
```

### `src/lib/queryClient.ts` (factory mirroring core defaults + Q4 proof)
```ts
import { QueryClient } from '@tanstack/react-query'
import { queryClient as coreQueryClient } from 'core/lib/queryClient'  // proves Metro resolves core (Q4)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      ...coreQueryClient.getDefaultOptions().queries,   // staleTime 30_000, retry 1, refetchOnWindowFocus false
      gcTime: 1000 * 60 * 60 * 24,                       // 24h — must be >= persist maxAge
    },
  },
})
```

### `src/providers/connectivity.ts` (NetInfo → onlineManager / AppState → focusManager)
```ts
import NetInfo from '@react-native-community/netinfo'
import { AppState, Platform, type AppStateStatus } from 'react-native'
import { onlineManager, focusManager } from '@tanstack/react-query'

export function initConnectivity() {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((s) => setOnline(!!s.isConnected)),
  )
  const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active')
  })
  return () => sub.remove()
}
```

### `src/i18n/index.ts` (Spanish default + fallback)
```ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'
import es from './locales/es.json'

const deviceLang = getLocales()[0]?.languageCode ?? 'es'
i18n.use(initReactI18next).init({
  resources: { es: { translation: es } },
  lng: deviceLang === 'es' ? 'es' : 'es',   // es-only for now; structure ready for more
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})
export default i18n
```

### `src/navigation/RootNavigator.tsx` + `TabNavigator.tsx` (placeholder)
```tsx
// RootNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { TabNavigator } from './TabNavigator'
const Stack = createNativeStackNavigator()
export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Root" component={TabNavigator} />
    </Stack.Navigator>
  )
}

// TabNavigator.tsx — single placeholder tab, no real screens
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
const Tab = createBottomTabNavigator()
export function TabNavigator() {
  const { t } = useTranslation()
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home">
        {() => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text>{t('nav.home', 'Inicio')}</Text>
          </View>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  )
}
```

### Conditional root `package.json` (only if #3 detects React drift)
```jsonc
{ "pnpm": { "overrides": { "react": "19.2.6" } } }
```

---

## Build / PR sequence (~3 chained PRs)

Each ≤400 changed lines (lockfile + generated native dirs excluded). No test runner
(`strict_tdd:false`) — every PR is gated by typecheck / `expo-doctor` / `expo export` / web build.

| PR | Scope | Gates |
|---|---|---|
| **PR1 — Scaffold + workspace wiring** | `package.json` (deps), `index.ts`, `App.tsx` (minimal), `app.config.ts`, `metro.config.js`, `tsconfig.json`, `eas.json`, `src/config/env.ts`, `expo-dev-client` | `pnpm install` resolves + **single React** (Q3); `tsc --noEmit`; `expo-doctor` (Q5 minSdk 24); `expo export` proves `core` resolves (Q4); `pnpm --filter web build` regression |
| **PR2 — Providers** | `lib/queryClient.ts`, `lib/mmkv.ts`, `lib/persister.ts`, `providers/AppProviders.tsx` (Persist + i18n), `providers/connectivity.ts`, `i18n/` (es bundle) | `tsc --noEmit`; cache-seed smoke in a dev harness (no backend) |
| **PR3 — Navigation shell + UI primitives** | `navigation/RootNavigator.tsx` + `TabNavigator.tsx`, `components/shared/{QueryBoundary,OfflineBanner,LoadingState,EmptyState}.tsx` | `tsc --noEmit`; dev-client boot renders placeholder shell |

---

## Verification

1. `pnpm install` — resolves, one hoisted `react` copy (Q3).
2. `pnpm --filter mobile exec tsc --noEmit` — types clean.
3. `npx expo-doctor` — config sane; confirm Android `minSdkVersion 24` (Q5).
4. `npx expo export` — Metro bundle dry-run proving `core` resolves through the RN bundler graph (Q4).
5. `pnpm --filter web build` — regression guard for the shared hoisted `node_modules`.

EAS build + on-device dev-client boot remain a human/CI step (out of automated CI here).

---

## Rollback

`apps/mobile` is **purely additive** — new files under a previously-empty placeholder;
`packages/core` and `apps/web` untouched. The only shared surfaces are the hoisted `node_modules`
and an optional root `pnpm.overrides.react`. Rollback = **revert the branch**; `pnpm install`
regenerates lockfile + `node_modules` to the prior state. No migrations, no data, no cross-package
edits. If only React drift is problematic, dropping the `pnpm.overrides` entry and reverting
`apps/mobile` fully restores the pre-change tree.

## Open questions / deferred

- Android `minSdkVersion 24` at SDK 55 is inferred — **verify** via `expo-doctor` / generated
  `android/build.gradle` in apply (Q5).
- Dev MMKV `encryptionKey` is static — **#5** replaces it with an `expo-secure-store`-backed key.
- `attachments.api.ts` `File`/`FormData` debt left **inert** (no attachment screens import it) —
  logged as a **blocking task for #7** (broaden to platform-agnostic `AttachmentPayload`).
- SDK 56 → iOS 16.4 floor bump is a **named future SDD change** (product call), not deferred here.
