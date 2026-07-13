# HouseCenter Mobile — how to run

Expo SDK 55 (React Native 0.83) app for field collaborators. **Floor: iOS 15.1 / Android 7 (API 24).**
Part of the pnpm-workspaces + Turborepo monorepo; shares `packages/core` with `apps/web`.

> ⚠️ **This app requires a custom dev-client build — Expo Go will NOT work.** It ships native modules
> (`expo-notifications`, `expo-screen-capture`, `expo-image-picker`, `expo-image`,
> `@react-native-community/datetimepicker`) that aren't in the Expo Go runtime. You build a dev client
> once, then iterate over-the-air with Metro like normal.

## Prerequisites

- **Node** `^20.19 || ^22.12 || >=24` + **pnpm 9.15.9** (`corepack enable && corepack prepare pnpm@9.15.9 --activate`).
- A native toolchain for the platform you target:
  - **iOS** → macOS + **Xcode** (+ an iOS Simulator).
  - **Android** → **Android Studio** (SDK + an emulator, or a physical device with USB debugging).
- **The HouseCenter API running** and reachable from the device/emulator (see "Configure the API URL").
- Expo CLI is invoked via `npx` / the package scripts — no global install needed.

## 1. Install (once, from the repo root)

```bash
pnpm install          # installs the whole workspace (web + mobile + core)
```

## 2. Build the dev client (once per native change)

Local build (needs Xcode / Android Studio installed):

```bash
pnpm --filter mobile ios       # expo run:ios      — builds + installs the dev client on a simulator
pnpm --filter mobile android   # expo run:android  — builds + installs on an emulator/device
```

Or build in the cloud with **EAS** (no local Xcode/Android Studio needed):

```bash
cd apps/mobile && npx eas build --profile development   # then install the artifact on your device
```

## 3. Configure the API URL

`API_BASE_URL` is read at config time (`app.config.ts` → `extra.API_BASE_URL` → `src/config/env.ts`),
defaulting to `http://localhost:5000`.

- **Simulator / emulator** → `localhost` usually works (Android emulator may need `http://10.0.2.2:5000`).
- **Physical device** → `localhost` is the phone, not your machine. Point at your computer's LAN IP:

```bash
API_BASE_URL=http://192.168.1.50:5000 pnpm --filter mobile start
```

> **macOS note:** if the API is on `5080` (AirPlay often occupies 5000), use that port. The device and the API machine must be on the same network.

## 4. Run (start Metro, load into the dev client)

```bash
pnpm --filter mobile start     # expo start --dev-client
```

Open the installed **dev-client** app (not Expo Go) and it connects to Metro. Reloads are instant.

## Checks (headless — no device needed)

```bash
pnpm --filter mobile typecheck   # tsc --noEmit
pnpm --filter mobile doctor      # expo-doctor
cd apps/mobile && npx expo export # bundles JS/assets — catches unresolved imports
```

> There is **no test runner** — verify with typecheck + doctor + export, plus on-device smoke.

## EAS profiles & store release

`eas.json` defines three profiles with their own `API_BASE_URL`:

| Profile | API_BASE_URL |
|---|---|
| `development` | `http://localhost:5000` (dev client) |
| `preview` | `https://staging.housecenter.net` |
| `production` | `https://api.housecenter.net` |

Push notifications and shipping to the App Store / Google Play require real credentials, artwork, and
device QA — **the full Human/ops checklist is in [`docs/eas-release-runbook.md`](docs/eas-release-runbook.md)**
(tracked as GitHub issues #44–#51). PHI-on-device details are in [`docs/phi-at-rest-audit.md`](docs/phi-at-rest-audit.md).

## Notes

- Spanish-first UI (`src/i18n/locales/es.json`); persistent device-bound session (long-lived, revocable).
- Shared types/api/hooks/schemas come from `core/*` (`packages/core`).
- Placeholder app icon/splash live in `assets/` — replace with real branded artwork before release (runbook Phase 2).
