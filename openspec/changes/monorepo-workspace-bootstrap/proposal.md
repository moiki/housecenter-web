# SDD Proposal — Monorepo Workspace Bootstrap

## Change name
`monorepo-workspace-bootstrap`

## Status
`proposed` (2026-07-12)

## Problem

`housecenter-web` is a single-package repo. The roadmap needs a shared, UI-agnostic
`packages/core` (types, api, hooks, schemas) consumed by BOTH the existing web SPA and a
future Expo `apps/mobile`. Core-extraction (change #3) and the mobile app cannot start
until there is a workspace to hold them. The master plan's #1 named infra risk is that
this restructure quietly breaks the web app — specifically the `@/*` alias and the build.
Exploration verified that risk is low (`vite.config.ts` alias is `__dirname`-relative,
`tsconfig.app.json` `baseUrl` is `"."`, both travel unedited with a whole-tree `git mv`),
so the bootstrap can be a near-pure structural move plus additive config.

## Proposed change

Convert `housecenter-web` **in-place** into a pnpm-workspaces + Turborepo monorepo:

1. `git mv` the entire web app tree into `apps/web/` (history preserved), **unedited except**:
   add `"extends": "../../tsconfig.base.json"` to `tsconfig.app.json` and `tsconfig.node.json`;
   in `apps/web/package.json` drop `packageManager` and rename `name` → `web`.
   The `@/*` alias needs **no edits**.
2. Add root workspace scaffolding: `package.json` (private root, turbo-delegating scripts),
   `pnpm-workspace.yaml`, `turbo.json`, `.npmrc` (`node-linker=hoisted`), `tsconfig.base.json`,
   and a small **new** root `CLAUDE.md` (monorepo shape + pointer to `apps/web/CLAUDE.md`).
3. Add minimal placeholder `package.json` for `packages/core` and `apps/mobile` (unscoped
   names `core`/`mobile`, `private`, `0.0.0`) — no real content (that is core-extraction /
   mobile-app-foundation).
4. Regenerate a single root `pnpm-lock.yaml` (multi-importer). `node_modules`/`dist` are not
   moved — they regenerate.

**Web behavior MUST be unchanged.** Verify: `pnpm install` + `pnpm --filter web build` +
`pnpm --filter web lint` + `pnpm -w build`.

## Target layout

```
housecenter-web/                    (repo root — .git and openspec/ stay here)
├── package.json                    NEW  private root; scripts delegate to turbo; engines; devDep turbo ^2.10.4
├── pnpm-workspace.yaml             NEW  packages: apps/*, packages/*
├── turbo.json                      NEW  tasks: build (^build, outputs dist/**), lint, dev (cache:false, persistent)
├── .npmrc                          NEW  node-linker=hoisted
├── tsconfig.base.json              NEW  shared compilerOptions (leaf configs extend this)
├── CLAUDE.md                       NEW  small — monorepo shape + pointer to apps/web/CLAUDE.md
├── pnpm-lock.yaml                  regenerated (single, multi-importer)
├── .gitignore                      unmoved (unanchored node_modules/dist/.env patterns still match)
├── openspec/                       unmoved
├── apps/
│   ├── web/                        ← git mv of the whole app tree (history preserved)
│   │   ├── src/**  public/  index.html  vite.config.ts  eslint.config.js   moved unedited
│   │   ├── tsconfig.json                                                   moved unedited
│   │   ├── tsconfig.app.json  tsconfig.node.json         moved + add "extends": "../../tsconfig.base.json"
│   │   ├── package.json                                  moved + drop packageManager, name → "web"
│   │   ├── .env  .env.example  README.md  CLAUDE.md  docs/**               moved
│   │   └── .claude/skills/**                             moved as-is (Option A, no content edits)
│   └── mobile/
│       └── package.json            NEW  placeholder { "name":"mobile","private":true,"version":"0.0.0" }
└── packages/
    └── core/
        └── package.json            NEW  placeholder { "name":"core","private":true,"version":"0.0.0" }
```

## Scope

- Root workspace files: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`,
  `tsconfig.base.json`, small root `CLAUDE.md`.
- `git mv` the app tree into `apps/web/` with the three deliberate edits (2× `extends`,
  1× `package.json` name/packageManager).
- Placeholder `package.json` for `packages/core` + `apps/mobile`.
- Single regenerated root `pnpm-lock.yaml`.
- `node-linker=hoisted` (de-risks Metro for the later mobile app).
- Root `engines` = Vite floor `^20.19.0 || ^22.12.0 || >=24.0.0`.

## Out of scope

- Real content for `packages/core` (types/api/hooks) → **core-extraction** (change #3).
- Real content for `apps/mobile` (Expo scaffold) → **mobile-app-foundation**.
- Rewiring web to consume `@core/*` (no `paths` change to web tsconfig) → core-extraction.
- Upgrading pnpm off 9.15.9 (EOL) → separate **pnpm-upgrade** fast-follow.
- Adding Prettier / a test runner / CI config.
- Editing skill path references or the web app's source in any way.

## Open questions (positions taken)

| # | Question | Position |
|---|---|---|
| 1 | `.npmrc` `node-linker` setting | **`hoisted` now.** De-risks Metro's pnpm-symlink resolver for the later mobile app; ~zero cost to Vite/web (flat tree ≈ today's single-root layout). Resolves the master plan's #1 infra risk proactively. |
| 2 | `.claude/skills/` + `CLAUDE.md` relocation | **Option A** — `git mv` the 4 web skills into `apps/web/.claude/skills/` as-is (no content edits, matches "no behavior change") + one **new** root `CLAUDE.md` pointer. Manual non-blocking follow-up: verify skill invocation from both root and `apps/web` cwd. |
| 3 | Package naming | **Unscoped** `web`/`core`/`mobile` so `pnpm --filter web …` works; root package `name: housecenter` (cosmetic). Scoped names deferred to core-extraction if ever needed. |
| 4 | pnpm 9.15.9 is EOL (2026-04-30) | **Keep it pinned for this change.** Bumping the package-manager major is orthogonal and separately risky; flagged as its own fast-follow **pnpm-upgrade** change. |
| 5 | `config.yaml` `formatter: prettier` is stale (no Prettier installed) | **Leave as future work** — do NOT add Prettier in this bootstrap. Note the mismatch; correcting `config.yaml` (or adding Prettier) is a separate concern. |
| 6 | Node `engines` (none today) | **Add** root `engines.node = "^20.19.0 \|\| ^22.12.0 \|\| >=24.0.0"` (Vite 8 floor). New but low-risk; closes a gap before Expo adds its own Node floor. |

## Affected files / packages

| Area | Impact | Detail |
|---|---|---|
| `apps/web/**` | Moved (git mv) | Whole app tree relocated, history preserved |
| `apps/web/tsconfig.app.json`, `tsconfig.node.json` | Modified | +1 line each: `"extends": "../../tsconfig.base.json"` |
| `apps/web/package.json` | Modified | Drop `packageManager`; `name`: `housecenter-web` → `web` |
| `apps/web/.claude/skills/**` | Moved (git mv) | 4 skills relocated as-is (Option A) |
| root `package.json` | New | Private workspace root; turbo-delegating `build`/`lint`/`dev`; `engines`; devDep `turbo ^2.10.4` |
| root `pnpm-workspace.yaml` | New | `apps/*`, `packages/*` |
| root `turbo.json` | New | `tasks`: build (`^build`, outputs `dist/**`), lint, dev (`cache:false`, `persistent`) |
| root `.npmrc` | New | `node-linker=hoisted` |
| root `tsconfig.base.json` | New | Shared compilerOptions hoisted from the two leaf configs |
| root `CLAUDE.md` | New | Small — monorepo shape + pointer to `apps/web/CLAUDE.md` |
| `packages/core/package.json`, `apps/mobile/package.json` | New | Minimal unscoped placeholders |
| root `pnpm-lock.yaml` | Regenerated | Single multi-importer lockfile (excluded from review budget) |
| `node_modules/`, `dist/` | Not moved | Regenerated by `pnpm install` / `pnpm build` |

## Delivery plan (chained PRs)

**Recommended shape: a single PR.** Renames and lockfile churn are excluded from the
400-line human-review budget, and the net new human-reviewable surface (root config files +
2 placeholders + 3 tiny edits) is roughly **~100–130 lines** — well under budget. Keeping
the move and the config in one PR also means the tree is only ever in a build-green state:
the workspace files and the `git mv` are only correct together.

**Fallback (if a reviewer prefers to bisect):** two chained PRs —

| PR | Scope | Verify |
|---|---|---|
| PR1 | Root scaffolding only: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `tsconfig.base.json`, root `CLAUDE.md`, `packages/core` + `apps/mobile` placeholders. Web NOT yet moved. | `pnpm install` resolves a valid multi-importer lockfile |
| PR2 | `git mv` web tree into `apps/web/` + the 3 deliberate edits. | `pnpm --filter web build` + `pnpm --filter web lint` + `pnpm -w build` all green from the new location |

`sdd-tasks` finalizes the split. Commits follow conventional format
(`chore(workspace): … (PRn)`), one deliverable work unit per PR.

## Rollback plan

Fully reversible. The change is a structural rename plus additive config:

- `git mv` is reversible; revert the `feat/monorepo-workspace-bootstrap` branch (or the
  merge commit) to restore the flat layout with history intact.
- `node_modules/` and `pnpm-lock.yaml` regenerate from the reverted `package.json` via
  `pnpm install` — no state to migrate, no data loss.
- No source, CI, or deploy config is edited, so there is nothing downstream to unwind.

## Dependencies / preconditions

- Working tree MUST be clean/expected on `feat/monorepo-workspace-bootstrap` before any
  `git mv` — the apply phase (Bash-capable) MUST run `git status` / `git log` first
  (exploration had no Bash access).
- Blocks: **core-extraction** (#3) and **mobile-app-foundation** depend on this workspace.

## Success criteria

- [ ] `pnpm install` from root regenerates a single lockfile with importers
      `{ ., apps/web, packages/core, apps/mobile }`.
- [ ] `pnpm --filter web build` (`tsc -b && vite build`) succeeds from `apps/web/`.
- [ ] `pnpm --filter web lint` reports zero new findings (pure move).
- [ ] `pnpm -w build` (`turbo run build`) wires the workspace pipeline; core/mobile skipped
      (no build script yet).
- [ ] `git diff --stat` shows only renames + the 3 deliberate edits + the new root files.

## Capabilities

### New Capabilities
None — this is a structural/config change, not a spec-level behavior change.

### Modified Capabilities
None — web behavior is unchanged by contract.
