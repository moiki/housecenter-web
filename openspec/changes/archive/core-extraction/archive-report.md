# Archive Report — core-extraction (change #3)

**Status**: SHIPPED
**Archived**: 2026-07-13
**Artifact store**: engram (memory-persisted)

## Outcome
Extracted 4-layer UI-agnostic stack (types, api/modules, hooks, schemas) + 3 lib files into packages/core source-consumed package. 4 stacked PRs — core tsc -b, web build+lint all green independently. 12 spec scenarios proven via real gate execution; auth hydration (highest-risk item) independently traced and verified sound.

## Verification
PASS WITH WARNINGS (0 CRITICAL / 3 WARNING / 2 SUGGESTION) — All 12 spec scenarios proven, 4 build/lint gates green, grep guards clean. Web byte-unchanged. Highest-risk item (R6 auth hydration) independently traced through module-eval order — synchronous behavior equivalent to pre-change.

## Delivery
PRs #13-16 stacked on moiki/housecenter-web (issues #11-12 tracking). All 4 commits merged to main.

## Residual / follow-ups
WARNING 1: Tasks 3.6/3.7 (hard-reload silent refresh, logged-out-first-paint no spinner) remain `[ ]` — static proof strong, live-browser pass needed before 100% end-to-end done. WARNING 2: packages/core/tsconfig `lib: DOM` (needed for File/FormData) means not platform-agnostic yet; mobile adaptation needed. WARNING 3: apply-progress note said PR3/PR4 uncommitted but actual repo shows all 4 committed with clean tree — documentation stale. useMe() has zero callers (verified pre-existing).

## Verification source
Observation #532: sdd/core-extraction/verify-report
