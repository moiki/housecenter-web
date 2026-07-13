# SDD Spec — Monorepo Workspace Bootstrap

Structural/tooling change. No spec-level behavior capability is added, modified, or
removed — web behavior MUST be unchanged. Requirements below govern workspace shape,
config contracts, and build/lint/install parity.

## Requirements

### R1 — Workspace graph resolves
The system MUST resolve a single pnpm workspace graph from repo root. Running
`pnpm install` from `<root>` MUST exit 0 and produce one `pnpm-lock.yaml` whose
`importers` map contains exactly `.`, `apps/web`, `packages/core`, `apps/mobile`.

### R2 — Web build unchanged
`apps/web/vite.config.ts`'s `resolve.alias['@']` and `apps/web/tsconfig.app.json`'s
`baseUrl`/`paths` MUST require ZERO edits after the move. `pnpm --filter web build`
MUST run `tsc -b && vite build` and exit 0.

### R3 — Web lint unchanged
`pnpm --filter web lint` MUST exit 0 and MUST NOT report any new ESLint finding
relative to the pre-move baseline (pure move, no source edits).

### R4 — Metro-safe linker
Root `.npmrc` MUST set `node-linker=hoisted`.

### R5 — Turbo pipeline wiring
Root `turbo.json` MUST define `tasks.build` (`dependsOn: ["^build"]`,
`outputs: ["dist/**"]`), `tasks.lint`, and `tasks.dev` (`cache: false`,
`persistent: true`). Root `package.json` `scripts.build`/`lint`/`dev` MUST delegate to
`turbo run <task>`. `pnpm -w build` MUST exit 0, building `apps/web` while
`packages/core`/`apps/mobile` (no `build` script) are skipped, not failed.

### R6 — Shared base tsconfig
`tsconfig.base.json` MUST hold compiler options common to both leaf configs (`target`,
`module`, `moduleResolution`, `allowImportingTsExtensions`, `verbatimModuleSyntax`,
`moduleDetection`, `skipLibCheck`, `strict`, `noUnusedLocals`, `noUnusedParameters`,
`erasableSyntaxOnly`, `noFallthroughCasesInSwitch`, `ignoreDeprecations`).
`apps/web/tsconfig.app.json` and `tsconfig.node.json` MUST each add
`"extends": "../../tsconfig.base.json"`. `lib`, `types`, `jsx`, `baseUrl`, `paths` MUST
stay in the leaf configs, unedited.

### R7 — Minimal placeholders
`packages/core/package.json` and `apps/mobile/package.json` MUST be minimal
placeholders: unscoped `name` (`core`/`mobile`), `private: true`, `version: "0.0.0"`,
no `src/`, no tsconfig, no build script.

### R8 — History preservation
Every file relocated into `apps/web/` MUST be moved with `git mv` (not delete +
recreate), preserving `git log --follow` history. `node_modules/` and `dist/` MUST NOT
be moved — they regenerate.

### R9 — Root owns tooling pins
Root `package.json` MUST set `packageManager` to the pinned value moved from the app
(`pnpm@9.15.9+sha512...`) and `engines.node` to
`"^20.19.0 || ^22.12.0 || >=24.0.0"`. `apps/web/package.json` MUST NOT contain a
`packageManager` field, and its `name` MUST be `"web"`.

### R10 — Skills relocate with the app
The four skills (`add-feature-slice`, `add-api-call`, `review-conventions`,
`elevate-ui`) MUST relocate via `git mv` to `apps/web/.claude/skills/` with no content
edits. A new root `CLAUDE.md` MUST exist describing the monorepo shape and pointing to
`apps/web/CLAUDE.md`.

## Scenarios

### Scenario A — fresh-install-resolves (Traces: R1)
- GIVEN a clean checkout of the bootstrapped tree
- WHEN `pnpm install` runs from `<root>`
- THEN it exits 0 and `pnpm-lock.yaml` importers include `.`, `apps/web`,
  `packages/core`, `apps/mobile`

### Scenario B — web-builds-from-apps-web (Traces: R2)
- GIVEN `apps/web` config files are unedited except the two `extends` lines
- WHEN `pnpm --filter web build` runs
- THEN `tsc -b && vite build` exits 0 and `apps/web/dist/` is produced

### Scenario C — alias-import-still-resolves (Traces: R2, R6)
- GIVEN a file in `apps/web/src` imports `from '@/...'`
- WHEN `pnpm --filter web build` runs
- THEN the import resolves with no module-not-found error, and neither
  `vite.config.ts`'s alias nor `tsconfig.app.json`'s `paths` was edited to make it work

### Scenario D — web-lint-clean (Traces: R3)
- GIVEN the pre-move lint baseline (0 errors)
- WHEN `pnpm --filter web lint` runs from the new location
- THEN it exits 0 with the same finding count as the pre-move baseline

### Scenario E — node-linker-hoisted (Traces: R4)
- GIVEN root `.npmrc` sets `node-linker=hoisted`
- WHEN `pnpm install` completes
- THEN `node_modules/` is a flat/hoisted tree, not a symlink-only `.pnpm` store

### Scenario F — turbo-build-workspace (Traces: R5)
- GIVEN `packages/core`/`apps/mobile` have no `build` script
- WHEN `pnpm -w build` runs from root
- THEN it exits 0, `apps/web` is built, and `core`/`mobile` are skipped, not failed

### Scenario G — tsconfig-extends-base (Traces: R6)
- GIVEN `tsconfig.base.json` exists with the shared compiler options
- WHEN `tsc --showConfig -p apps/web/tsconfig.app.json` runs
- THEN the effective config includes every option declared only in
  `tsconfig.base.json`

### Scenario H — placeholders-in-graph (Traces: R1, R7)
- GIVEN `packages/core`/`apps/mobile` are minimal placeholders
- WHEN `pnpm list -r --depth -1` runs from root
- THEN `core` and `mobile` are listed as workspace members alongside `web`

### Scenario I — git-history-preserved (Traces: R8)
- GIVEN a file was moved via `git mv` from the former root path
- WHEN `git log --follow apps/web/<moved-file>` runs
- THEN commits authored before the move appear in the log

### Scenario J — pin-and-naming (Traces: R9)
- GIVEN the bootstrap has completed
- WHEN root `package.json` and `apps/web/package.json` are inspected
- THEN root has `packageManager` + `engines.node`; `apps/web/package.json` has no
  `packageManager` key and `name === "web"`

### Scenario K — skills-and-claude-md-relocated (Traces: R10)
- GIVEN the four skills existed at the former root `.claude/skills/`
- WHEN the bootstrap completes
- THEN `apps/web/.claude/skills/{add-feature-slice,add-api-call,review-conventions,
  elevate-ui}` exist unchanged, and root `CLAUDE.md` references `apps/web/CLAUDE.md`

## Workspace structure

```
housecenter-web/                    (repo root — .git, openspec/ stay here)
├── package.json                    NEW    private root; turbo-delegating scripts; engines; packageManager
├── pnpm-workspace.yaml             NEW    packages: apps/*, packages/*
├── turbo.json                      NEW    tasks: build, lint, dev
├── .npmrc                          NEW    node-linker=hoisted
├── tsconfig.base.json              NEW    shared compilerOptions
├── CLAUDE.md                       NEW    monorepo shape + pointer to apps/web/CLAUDE.md
├── pnpm-lock.yaml                  REGEN  single, multi-importer
├── .gitignore                      unmoved
├── openspec/                       unmoved
├── apps/
│   ├── web/                        MOVED (git mv, history preserved)
│   │   ├── src/**  public/  index.html  vite.config.ts  eslint.config.js     moved unedited
│   │   ├── tsconfig.json                                                     moved unedited
│   │   ├── tsconfig.app.json  tsconfig.node.json     moved + "extends": "../../tsconfig.base.json"
│   │   ├── package.json                              moved + drop packageManager, name -> "web"
│   │   ├── .env  .env.example  README.md  CLAUDE.md  docs/**                 moved
│   │   └── .claude/skills/**                                                 moved as-is
│   └── mobile/
│       └── package.json            NEW    placeholder {name:"mobile", private:true, version:"0.0.0"}
└── packages/
    └── core/
        └── package.json            NEW    placeholder {name:"core", private:true, version:"0.0.0"}
```

## Config contracts

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`.npmrc`:
```
node-linker=hoisted
```

`turbo.json`:
```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "lint": { "dependsOn": [], "outputs": [] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

Root `package.json` (required keys):
```json
{
  "name": "housecenter",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@9.15.9+sha512.68046141893c66fad01c079231128e9afb89ef87e2691d69e4d40eee228988295fd4682181bae55b58418c3a253bde65a505ec7c5f9403ece5cc3cd37dcf2531",
  "engines": { "node": "^20.19.0 || ^22.12.0 || >=24.0.0" },
  "scripts": {
    "build": "turbo run build",
    "lint": "turbo run lint",
    "dev": "turbo run dev"
  },
  "devDependencies": { "turbo": "^2.10.4" }
}
```

`tsconfig.base.json` (shared `compilerOptions`; leaf-only keys excluded):
```json
{
  "compilerOptions": {
    "target": "es2023",
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "ignoreDeprecations": "6.0"
  }
}
```
Leaf configs (`apps/web/tsconfig.app.json`, `tsconfig.node.json`) keep `lib`, `types`,
`jsx`, `baseUrl`, `paths`, `include`, `tsBuildInfoFile` and add only
`"extends": "../../tsconfig.base.json"`.

`packages/core/package.json`:
```json
{ "name": "core", "version": "0.0.0", "private": true }
```

`apps/mobile/package.json`:
```json
{ "name": "mobile", "version": "0.0.0", "private": true }
```

## Verification rules

| Check | Command | Expected |
|---|---|---|
| Workspace resolves | `pnpm install` (from root) | exit 0; importers = `{., apps/web, packages/core, apps/mobile}` |
| Web build green | `pnpm --filter web build` | exit 0; `tsc -b && vite build`; `apps/web/dist/` produced |
| Web lint clean | `pnpm --filter web lint` | exit 0; 0 new findings vs pre-move baseline |
| Turbo pipeline | `pnpm -w build` | exit 0; web built, core/mobile skipped (no build script) |
| Members resolve | `pnpm list -r --depth -1` | lists `web`, `core`, `mobile` |
| Diff shape | `git diff --stat` / `git status` | only renames + 3 deliberate edits + new root files |
| History preserved | `git log --follow apps/web/<moved-file>` | shows pre-move commits |
| Linker hoisted | inspect `node_modules/` post-install | flat/hoisted tree, not symlink-only `.pnpm` store |
| tsconfig extends | `tsc --showConfig -p apps/web/tsconfig.app.json` | includes base-only options (e.g. `moduleDetection: "force"`) |
