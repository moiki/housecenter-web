# Archive Report — monorepo-workspace-bootstrap (change #2)

**Status**: SHIPPED
**Archived**: 2026-07-13
**Artifact store**: engram (memory-persisted)

## Outcome
Converted housecenter-web in-place into a pnpm-workspaces + Turborepo monorepo with 3 importers (root, apps/web, packages/core, apps/mobile). Single PR implementation with 7 task phases — all 31/31 tasks complete. pnpm install, build, lint, turbo all green.

## Verification
PASS WITH WARNINGS (0 CRITICAL / 1 WARNING / 2 SUGGESTION) — `pnpm install`, `pnpm --filter web build`, `pnpm --filter web lint`, `pnpm -w build` (turbo) all independently re-run GREEN. Git history preserved for 206 moved files; 2 of 208 files lose rename-detection by default due to >50% line edits in same commit (design choice, recoverable with -M30%).

## Delivery
PR #16 merged to main (commit d30c994).

## Residual / follow-ups
WARNING: Tasks 7.3/7.4 deferred per design; `pnpm --filter web build` accepted as proxy. Stray root `.vite/` dir was resolved (actual commit added both `.turbo` AND `.vite` to .gitignore). No blocker to archive.

## Verification source
Observation #525: sdd/monorepo-workspace-bootstrap/verify-report
