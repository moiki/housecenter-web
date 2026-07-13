# HouseCenter — Frontend Monorepo

Frontend for **HouseCenter**, the management platform of an NGO serving disabled children in rural
Nicaragua (patients, treatments, attention sessions, work routes, medical consultations, sponsor
reports). This monorepo holds the **web dashboard** and the **mobile field app**, both consuming a
shared core and talking to the **HouseCenter .NET API** (sibling repo `housecenter-api`).

pnpm workspaces + Turborepo. One `pnpm install` at the root wires up everything.

## Layout

```
housecenter-web/
├─ apps/web        React 19 + Vite 8 SPA (management dashboard)   → apps/web/README.md
├─ apps/mobile     Expo SDK 55 / React Native field app           → apps/mobile/README.md
├─ packages/core   Shared, UI-agnostic types · api · TanStack Query hooks · Zod schemas · lib
├─ openspec/       Spec-Driven-Development artifacts (changes/archive/ = shipped changes)
├─ turbo.json      Turborepo task graph
└─ pnpm-workspace.yaml
```

`packages/core` is the single source of truth for API contracts and data hooks — web and mobile both
import from `core/*`, so a change there rebuilds both apps.

## Prerequisites

- **Node** `^20.19 || ^22.12 || >=24` (root `package.json` `engines`).
- **pnpm 9.15.9** — pinned via the root `packageManager`: `corepack enable && corepack prepare pnpm@9.15.9 --activate`.
- **The HouseCenter API running** (sibling `housecenter-api` repo) — both apps are pure clients. Start it with `dotnet run --project HouseCenter.Api`.
- Mobile only: a native toolchain (**Xcode** for iOS, **Android Studio** for Android) — see the mobile README.

## Quick start

```bash
pnpm install                 # from the repo root — installs web + mobile + core in one lockfile
```

Then follow the app you want to run:

| App | How to run |
|---|---|
| **Web** | [`apps/web/README.md`](apps/web/README.md) — `pnpm --filter web dev` (Vite, http://localhost:5173) |
| **Mobile** | [`apps/mobile/README.md`](apps/mobile/README.md) — needs a **dev-client build** (not Expo Go), then `pnpm --filter mobile start` |

## Monorepo commands (from the root)

| Command | What |
|---|---|
| `pnpm install` | Install the whole workspace (one lockfile) |
| `pnpm build` / `pnpm lint` / `pnpm dev` | Turborepo — run the task across every package |
| `pnpm --filter web <script>` | Target the web app (`dev`, `build`, `lint`, `preview`) |
| `pnpm --filter mobile <script>` | Target the mobile app (`start`, `ios`, `android`, `typecheck`, `doctor`) |
| `pnpm --filter core exec tsc -b` | Type-check the shared core |

> **No test runner is configured.** Verify changes with `build` + `lint` (web/core) and `typecheck` + `expo-doctor` + `expo export` + on-device smoke (mobile).

## Conventions & docs

- Monorepo conventions: [`CLAUDE.md`](CLAUDE.md). Web app conventions: [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md).
- `node-linker=hoisted` (`.npmrc`) — a flat `node_modules`, which de-risks the Metro/Expo resolver.
- **Mobile release** (EAS build/submit, credentials, store assets, device QA): [`apps/mobile/docs/eas-release-runbook.md`](apps/mobile/docs/eas-release-runbook.md) (tracked as GitHub issues #44–#51). PHI-on-device audit: [`apps/mobile/docs/phi-at-rest-audit.md`](apps/mobile/docs/phi-at-rest-audit.md).
- SDD history: `openspec/changes/archive/` holds the 10 shipped mobile-plan changes (#1 lives in the API repo).
