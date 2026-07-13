# HouseCenter (frontend monorepo)

pnpm-workspaces + Turborepo. Frontend for the HouseCenter .NET API.

## Layout

- `apps/web` — React 19 + Vite 8 SPA (existing app; see `apps/web/CLAUDE.md`)
- `apps/mobile` — future Expo app (placeholder)
- `packages/core` — future shared types/api/hooks/schemas (placeholder)

## Commands (from root)

- `pnpm install` — one lockfile for all packages
- `pnpm build` / `pnpm lint` / `pnpm dev` — `turbo run <task>`
- `pnpm --filter web <script>` — target the web app

## Conventions

- pnpm only (version pinned via root `packageManager`). No test runner — verify via build + lint.
- `node-linker=hoisted` (flat `node_modules`; de-risks the future Metro/Expo resolver).
- Web app conventions live in `apps/web/CLAUDE.md`.
