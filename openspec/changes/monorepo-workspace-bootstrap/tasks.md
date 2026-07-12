# Tasks: Monorepo Workspace Bootstrap

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines (renames + lockfile regen excluded) | ~100–130 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR, migration-sequence order |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main (unused — single PR) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

**Basis:** 6 new root files ≈60 lines (`package.json` 12, `pnpm-workspace.yaml` 3, `.npmrc` 1,
`turbo.json` 8, `tsconfig.base.json` 16, root `CLAUDE.md` 20) + 2 placeholder `package.json`s
~4 lines each + 3 `apps/web` edits (`package.json` ±1 line; `tsconfig.app.json`/`tsconfig.node.json`
each a ~10-line hoist-and-trim rewrite per design.md §4, not the proposal's literal "+1 line") +
`.gitignore` +1 line ≈ 100–130 total. The whole-tree `git mv` (renames, not line diffs) and
regenerated `pnpm-lock.yaml` are excluded by convention. Single PR keeps the move and config
atomic — per design decision #1, workspace files and the moved tree are only ever correct together.

## Phase 1: Pre-flight — PR1
- [ ] 1.1 `git status` + `git log --oneline -1` on `feat/monorepo-workspace-bootstrap` — confirm clean/expected tree, abort otherwise (R8)
- [ ] 1.2 `git branch --show-current` — confirm correct branch

**Phase 1 done when:** branch + clean tree confirmed.

## Phase 2: Root scaffolding — PR1
- [ ] 2.1 `package.json` — private, `name:"housecenter"`, `engines.node` Vite floor, `packageManager` pnpm 9.15.9 pin (moved from app), `scripts.build/lint/dev`→`turbo run <task>`, devDep `turbo ^2.10.4` (R5, R9)
- [ ] 2.2 `pnpm-workspace.yaml` — `packages: ["apps/*","packages/*"]` (R1)
- [ ] 2.3 `.npmrc` — `node-linker=hoisted` (R4)
- [ ] 2.4 `turbo.json` — `build`(`^build`,`dist/**`), `lint`(no deps), `dev`(`cache:false`,`persistent:true`) (R5)
- [ ] 2.5 `tsconfig.base.json` — shared compilerOptions per spec.md R6 list (R6)
- [ ] 2.6 Root `CLAUDE.md` — monorepo shape + pointer to `apps/web/CLAUDE.md` (R10)
- [ ] 2.7 Add `.turbo` to root `.gitignore` (design risk — cache dir currently unignored)

**Phase 2 done when:** 6 root files match config contracts; `.turbo` ignored.

## Phase 3: Placeholders — PR1
- [ ] 3.1 `packages/core/package.json` — `{name:"core",version:"0.0.0",private:true}` (R7)
- [ ] 3.2 `apps/mobile/package.json` — `{name:"mobile",version:"0.0.0",private:true}` (R7)

**Phase 3 done when:** both minimal placeholders exist, no src/tsconfig/build script.

## Phase 4: Move web → apps/web — PR1
- [ ] 4.1 `mkdir -p apps/web`; `git mv src public index.html vite.config.ts eslint.config.js tsconfig.json tsconfig.app.json tsconfig.node.json package.json .env.example README.md CLAUDE.md docs apps/web/` (R2, R8)
- [ ] 4.2 Plain `mv .env apps/web/.env` — untracked, `git mv` can't move it (R8)
- [ ] 4.3 `git mv .claude apps/web/.claude` — 4 skills relocate unedited (R10)

**Phase 4 done when:** `apps/web/` holds the full tree via renames; `node_modules/`, `dist/`, `pnpm-lock.yaml`, `openspec/`, `.gitignore`, `.git` untouched.

## Phase 5: Edits in apps/web — PR1
- [ ] 5.1 `apps/web/package.json` — drop `packageManager`, rename `"housecenter-web"`→`"web"` (R9)
- [ ] 5.2 `apps/web/tsconfig.app.json` — add `"extends":"../../tsconfig.base.json"`, trim hoisted keys, keep `lib/types/jsx/noEmit/baseUrl/paths/include/tsBuildInfoFile` (R6)
- [ ] 5.3 `apps/web/tsconfig.node.json` — same extends + trim, keep `lib/types/noEmit/include/tsBuildInfoFile` (R6)

**Phase 5 done when:** exactly 3 files diff; `vite.config.ts` alias + tsconfig `baseUrl`/`paths` untouched (R2).

## Phase 6: Install + verify — PR1
- [ ] 6.1 `pnpm install` (root) — exit 0, one lockfile, importers `{.,apps/web,packages/core,apps/mobile}` (R1)
- [ ] 6.2 Inspect `node_modules/` — flat/hoisted, not symlink-only `.pnpm` store (R4)
- [ ] 6.3 `pnpm --filter web build` — exit 0, `apps/web/dist/` produced (R2)
- [ ] 6.4 `pnpm --filter web lint` — exit 0, 0 new findings vs baseline (R3)
- [ ] 6.5 `pnpm -w build` — exit 0; web builds, core/mobile skipped not failed (R5)
- [ ] 6.6 `pnpm list -r --depth -1` — lists web, core, mobile (R1, R7)

**Phase 6 done when:** all 6 checks pass per spec.md's verification table.

## Phase 7: History + manual checks — PR1
- [ ] 7.1 `git log --follow apps/web/package.json` — shows pre-move commits (R8)
- [ ] 7.2 `git diff --stat` / `git status` — only renames + 3 edits + new root files (R2, R3, R8, R9)
- [ ] 7.3 Manual, non-blocking: `.claude/skills` invocation from root and `apps/web` cwd (R10)
- [ ] 7.4 Manual, non-blocking: `pnpm --filter web dev` smoke test (R2)

**PR1 done when:** `pnpm install` clean · `pnpm --filter web build` + `lint` green · `pnpm -w build` green · `git log --follow` shows preserved history · web behavior unchanged.
