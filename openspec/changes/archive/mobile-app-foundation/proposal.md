# SDD Proposal — Mobile App Foundation

## Change name
`mobile-app-foundation`

## Status
`proposed` (2026-07-12)

---

## Problem

`apps/mobile/` is a placeholder (`{ "name": "mobile" }` and nothing else). Change #5
(mobile-auth-session) and every screen change (#6+) depend on a working Expo app that
consumes `packages/core` through Metro, persists a READ cache, reacts to connectivity, and
speaks Spanish. None of that exists yet, and the master plan's pin — "Expo (managed) SDK 52+" —
is wrong in a way that bites: SDK 52 ships React 18.3, a **React-major mismatch** against
`core`'s `peerDependencies.react: "^19"` and `apps/web`'s `react: "^19.2.6"`. An unbounded
"52+" also lets a later install land on SDK 56, which silently raises the iOS floor to 16.4.
This change lays the foundation once, correctly, so the auth and screen changes build on solid
ground instead of re-litigating the scaffold.

## Proposed change

Scaffold a **managed Expo SDK 55** app (React 19.2 / RN 0.83) in `apps/mobile/` that:

- resolves `core` via `workspace:*` + Metro package-exports (no TS `paths` hack);
- runs on an **EAS dev client from the first commit** (`react-native-mmkv` is native/JSI and
  cannot load in Expo Go);
- owns the client-runtime foundation only — QueryClient + encrypted-MMKV persister,
  NetInfo→`onlineManager`/`focusManager`, `react-i18next` (Spanish default), a navigation
  **shell** with placeholder tabs, and shared RN UI primitives.

SDK 55 is chosen because it matches React 19.2 (tightest fit to web's `19.2.6`) **and**
preserves the master plan's device floor exactly (iOS 15.1 / Android API 24). SDK 56 would
bump iOS to 16.4 — recorded here as a **named future SDD change**, not a silent deferral.

## Scope (foundation ONLY)

- **Scaffold + workspace wiring**: `app.config.ts`, `App.tsx`, `metro.config.js`
  (`getDefaultConfig` + `unstable_enablePackageExports=true` + explicit monorepo anchors),
  `tsconfig.json` (extends `../../tsconfig.base.json`, no `core/*` paths), `package.json`
  (`core: workspace:*`, Expo SDK 55 line, React/RN at SDK-55 versions, `@tanstack/react-query ^5`),
  `eas.json` (dev/preview/prod), `expo-dev-client`.
- **Providers**: a `QueryClient` mirroring `core/lib/queryClient.ts` (staleTime 30_000, retry 1,
  refetchOnWindowFocus false); `PersistQueryClientProvider` with a thin AsyncStorage-shaped
  **encrypted MMKV** async persister (READ cache only).
- **Connectivity**: `@react-native-community/netinfo` → `onlineManager`; `AppState` → `focusManager`.
- **i18n**: `react-i18next` + `i18next` + `expo-localization`; Spanish default + fallback,
  initialized at bootstrap.
- **Navigation shell**: React Navigation v7 (`native-stack` + `bottom-tabs`) with a placeholder
  tab/stack — no real screens.
- **Shared UI primitives** in `src/components/shared/`: `QueryBoundary`, `OfflineBanner`,
  loading/empty states (RN-rendering, NOT in `core`).
- **Env plumbing**: `app.config.ts` → `expo-constants` `extra.API_BASE_URL`, sourced per EAS profile.

## Out of scope

| Deferred to | What |
|---|---|
| #5 mobile-auth-session | `setApiClient` / real auth wiring, `expo-secure-store` token storage, refresh interceptor injection |
| #6+ screens | any real screen, feature navigation, forms |
| #7 attachments/camera | camera/media, file upload; **and** the `attachments.api.ts` `File`/`FormData` type-debt fix (see Q6) |
| #9 push | push notifications, FCM/APNs registration |

## Target structure

```
apps/mobile/
├── app.config.ts             # Expo config; extra.API_BASE_URL wired per EAS profile
├── App.tsx                   # Root: AppProviders + navigation shell
├── eas.json                  # dev / preview / prod build profiles
├── metro.config.js           # getDefaultConfig + unstable_enablePackageExports + monorepo anchors
├── tsconfig.json             # extends ../../tsconfig.base.json; no core/* paths
├── package.json              # core: workspace:*; Expo SDK 55; React/RN 19.2/0.83; stack
└── src/
    ├── i18n/
    │   ├── index.ts          # i18next + expo-localization; es default + fallback
    │   └── locales/es.json
    ├── lib/
    │   ├── queryClient.ts    # mirrors core/lib/queryClient.ts defaults
    │   ├── mmkv.ts           # encrypted MMKV instance (PHI at rest)
    │   └── persister.ts      # thin AsyncStorage-shaped MMKV adapter → async persister
    ├── providers/
    │   ├── AppProviders.tsx  # PersistQueryClientProvider + i18n + NavigationContainer
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

## Open questions (positions taken)

| # | Question | Position |
|---|---|---|
| 1 | Expo SDK version | **SDK 55** (React 19.2 / RN 0.83) — confirmed. Matches `core`/`web` React major AND preserves iOS 15.1 / Android API 24. The SDK-56 → **iOS 16.4** bump is a NAMED future SDD change (drops iPhone 7/7+, 6s/6s+, SE 1st gen), not a silent deferral. |
| 2 | Persister storage | **Encrypted `react-native-mmkv`** (`new MMKV({ id, encryptionKey })`) via a thin AsyncStorage-shaped adapter for the READ cache — PHI-at-rest. Independently **forces the EAS dev client** (native/JSI, no Expo Go). |
| 3 | Single React instance | Pin `apps/mobile` react/react-dom to SDK-55's **React 19.2.x**; verify overlap with web `^19.2.6`. If any drift, add a root `pnpm.overrides` forcing one `react` (avoid duplicate-React "invalid hook call"). |
| 4 | Metro package-exports | Assert `config.resolver.unstable_enablePackageExports = true`; prove `core` (wildcard subpath exports, raw TS) resolves through the RN bundler graph via an `expo export` dry-run in verify. |
| 5 | Android minSdk 24 | Inferred for SDK 55 (not explicitly documented). Verify via `expo-doctor` / generated `android/build.gradle` during apply. |
| 6 | `attachments.api.ts` `File`/`FormData` debt | Do NOT touch in #4 — inert (no attachment screen imports it, so Metro never pulls it in). Log the web-shaped `file: File` signature as a **blocking task for #7** (broaden to a platform-agnostic `AttachmentPayload`). |

## Affected files / packages

| Area | Impact | Notes |
|---|---|---|
| `apps/mobile/**` | New | Entire scaffold + `src/` tree above. Purely additive. |
| root `pnpm-lock.yaml` | Modified | Expo/RN/nav/i18n/mmkv/netinfo deps resolved (excluded from review budget). |
| root `package.json` | Modified (conditional) | `pnpm.overrides.react` only if #3 detects React drift. |
| `packages/core` | Untouched | Consumed via `workspace:*` + package-exports; `attachments.api.ts` debt left inert (Q6). |
| `apps/web` | Untouched | Regression-guarded (`pnpm --filter web build`) — hoisted `node_modules` shared. |

## Delivery plan (chained PRs)

Three ordered, independently-reviewable slices (≤400 changed lines each; lockfile/generated
native dirs excluded). No test runner yet (`strict_tdd:false`) — each PR is gated by
typecheck / `expo-doctor` / `expo export` / web build. `sdd-tasks` finalizes the exact split.

| PR | Scope | Verification (gates) |
|---|---|---|
| **PR1 — Scaffold + workspace wiring** | `package.json` (deps), `app.config.ts`, `App.tsx` (minimal), `metro.config.js`, `tsconfig.json`, `eas.json`, `expo-dev-client`, env plumbing | `pnpm install` resolves + single React (Q3); `tsc --noEmit`; `expo-doctor` (Q5); `expo export` proves `core` resolves (Q4); `pnpm --filter web build` regression guard |
| **PR2 — Providers** | `lib/queryClient.ts`, `lib/mmkv.ts`, `lib/persister.ts`, `PersistQueryClientProvider`, NetInfo→`onlineManager`/`focusManager`, i18n (es) bootstrap | `tsc --noEmit`; cache-seed smoke in a dev harness (no backend needed) |
| **PR3 — Navigation shell + UI primitives** | React Navigation v7 placeholder tabs/stack + `QueryBoundary`/`OfflineBanner`/loading-empty in `components/shared/` | `tsc --noEmit`; dev-client boot renders placeholder shell |

## Rollback plan

`apps/mobile` is **purely additive** — new files under a previously-empty placeholder package;
`packages/core` and `apps/web` are untouched (the only shared surface is the hoisted
`node_modules` and an optional root `pnpm.overrides.react`). Rollback = **revert the branch**;
`pnpm install` regenerates the lockfile and node_modules to the prior state. No migrations, no
data, no cross-package edits to unwind. If only React drift is problematic, dropping the
`pnpm.overrides` entry and reverting `apps/mobile` fully restores the pre-change tree.
