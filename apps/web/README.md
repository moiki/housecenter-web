# HouseCenter Web — how to run

React 19 + Vite 8 SPA. Frontend client of the **HouseCenter .NET API** (sibling repo
`housecenter-api`). Part of the pnpm-workspaces + Turborepo monorepo; shares `packages/core`
with `apps/mobile`.

## Prerequisites

- **Node** `^20.19 || ^22.12 || >=24` (see the root `package.json` `engines`).
- **pnpm 9.15.9** — pinned via the root `packageManager`. Easiest install: `corepack enable && corepack prepare pnpm@9.15.9 --activate`.
- **The HouseCenter API must be running** and reachable at `VITE_API_BASE_URL` — the SPA is a pure client, nothing works without it. Run it from the API repo: `dotnet run --project HouseCenter.Api` (see that repo's `CLAUDE.md`).

## 1. Install (once, from the repo root)

```bash
pnpm install          # one lockfile installs the whole workspace (web + mobile + core)
```

## 2. Configure the API URL

```bash
cp apps/web/.env.example apps/web/.env      # then edit if needed
```

`apps/web/.env`:

```
VITE_API_BASE_URL=http://localhost:5000
```

> **macOS note:** port 5000 is often taken by the AirPlay Receiver. If the API is served on `5080` (a common local override), set `VITE_API_BASE_URL=http://localhost:5080` to match. Point this at whatever URL the API actually serves.

## 3. Run the dev server

```bash
pnpm --filter web dev        # from the repo root  (Vite + HMR, http://localhost:5173)
# or:  cd apps/web && pnpm dev
```

## Build & preview a production bundle

```bash
pnpm --filter web build      # tsc -b && vite build  ->  apps/web/dist/
pnpm --filter web preview    # serve the built bundle locally
```

## Other commands

| Command | What |
|---|---|
| `pnpm --filter web lint` | ESLint (there is **no test runner** — verify with build + lint) |
| `pnpm build` / `pnpm lint` / `pnpm dev` (root) | Turborepo — runs the task across every workspace package |

## Notes

- App conventions (the four-layer architecture, RBAC, gotchas) live in **`apps/web/CLAUDE.md`**.
- Shared types/api/hooks/schemas are imported from `core/*` (`packages/core`) — a change there rebuilds both web and mobile.
- Auth session: `refreshToken` in `localStorage` (survives reload), `accessToken` in memory only; token refresh is automatic on 401.
