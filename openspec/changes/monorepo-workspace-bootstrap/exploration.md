# Exploration — Monorepo Workspace Bootstrap (pnpm + Turborepo, web → apps/web)

## Summary

Converting `housecenter-web` in-place into a pnpm-workspaces + Turborepo monorepo is **lower risk than the master plan implies** for the one thing it worries about most (the `@/*` alias surviving the move) — `vite.config.ts` and `tsconfig.app.json` both use path resolution that is *relative to the config file's own location* (`__dirname`, `baseUrl: "."`), not to the repo root. Moving the whole app tree as a unit with `git mv` requires **zero edits** to make aliasing keep working. The genuinely open decisions are: the `.npmrc` `node-linker` setting (de-risks Metro later), whether to touch the pinned pnpm version (it's EOL), package naming for `--filter`, and where `.claude/skills/` + `CLAUDE.md` end up relative to Claude Code's own cwd-based discovery.

**Confidence: High** on toolchain facts and the alias/build risk assessment (verified against actual file contents). **Medium** on the `.claude/skills` discoverability question and on repo working-tree cleanliness (I have no Bash access in this phase — the orchestrator/apply phase MUST run `git status`/`git log` before any `git mv`, see Discrepancies).

## Confirmed

**Toolchain inventory** (`package.json`, `pnpm-lock.yaml`):
- `packageManager: "pnpm@9.15.9+sha512..."` — pinned, no separate `engines` field.
- `pnpm-lock.yaml` `lockfileVersion: '9.0'`, `settings: { autoInstallPeers: true, excludeLinksFromLockfile: false }`, single `importers: { . : {...} }` (not yet a multi-package lockfile).
- Runtime: React `^19.2.6`, MUI v9 (`@mui/material ^9`, `@mui/icons-material ^9.1.1`, `@mui/x-date-pickers ^9.5.0`), TanStack Query `^5.101.0`, React Router `^7.17.0`, Zustand `^5.0.14`, RHF `^7.79.0` + Zod `^4.4.3`, Axios `^1.17.0`, Tailwind v4 (`tailwindcss ^4.3.1`, `@tailwindcss/vite ^4.3.1` — CSS-first config, **no `tailwind.config.js`** exists).
- Dev: Vite `^8.0.12`, TypeScript `~6.0.2`, ESLint `^10.3.0` (flat config, `typescript-eslint ^8.59.2`, `eslint-plugin-react-hooks ^7.1.1`, `eslint-plugin-react-refresh ^0.5.2`), `@vitejs/plugin-react ^6.0.1`.
- Scripts: `dev: vite`, `build: tsc -b && vite build`, `lint: eslint .`, `preview: vite preview`. **No test script, no test runner** — matches `CLAUDE.md` and `openspec/config.yaml` (`strict_tdd: false`).

**tsconfig structure**:
- `tsconfig.json` (solution file) — `{ files: [], references: [{path:"./tsconfig.app.json"},{path:"./tsconfig.node.json"}] }`. Purely a references container, no `compilerOptions`.
- `tsconfig.app.json` — `target: es2023`, `lib: [ES2023, DOM]`, `module/moduleResolution: esnext/bundler`, `jsx: react-jsx`, `strict: true` + `noUnusedLocals/Parameters`, `erasableSyntaxOnly`, `types: ["vite/client"]`, **`baseUrl: "."`, `paths: {"@/*": ["src/*"]}`**, `tsBuildInfoFile: "./node_modules/.tmp/tsconfig.app.tsbuildinfo"` (relative), `include: ["src"]`.
- `tsconfig.node.json` — same base flags, `types: ["node"]`, `include: ["vite.config.ts"]`.
- `vite.config.ts` — `resolve.alias['@'] = path.resolve(__dirname, './src')`. `__dirname` is Node's own directory-of-this-file, so **this alias travels correctly with the file** regardless of where the file lives in the tree.
- `eslint.config.js` — flat config, `globalIgnores(['dist'])`, `files: ['**/*.{ts,tsx}']`, extends `js.configs.recommended`, `tseslint.configs.recommended` (NOT `recommendedTypeChecked` — **no cross-file/type-aware linting**, so lint has no `tsconfig.project` dependency and no need for a `dependsOn: ["^build"]` in the turbo pipeline).
- `index.html` — `<script src="/src/main.tsx">` (root-relative to Vite's dev/build root, which defaults to the directory containing `vite.config.ts`).

**Conclusion**: because `vite.config.ts`'s alias is `__dirname`-relative and `tsconfig.app.json`'s `baseUrl` is `"."` (relative to itself), **the `@/*` alias needs NO edits** after `git mv`-ing `vite.config.ts` + `tsconfig.*.json` + `src/` + `index.html` together into `apps/web/`. The only *new* edit needed on these files is adding `"extends": "../../tsconfig.base.json"` to `tsconfig.app.json` and `tsconfig.node.json` if a shared base config is introduced (see below) — everything else is a pure rename.

**File disposition** (exact list):

| Moves to `apps/web/` (git mv) | Stays / new at root |
|---|---|
| `src/**` (types, api, hooks, pages, components, store, styles, schemas, layouts, utils, lib) | `.git/` (repo root, unmoved) |
| `public/` (`favicon.svg`, `icons.svg`) | `.gitignore` (unmoved — unanchored patterns `node_modules`, `dist`, `.env` already match at any depth) |
| `index.html` | `openspec/` (already exists — `config.yaml` present, `changes/`) |
| `vite.config.ts` | `pnpm-lock.yaml` (regenerated in place at root by `pnpm install`, single lockfile, multi-`importers`) |
| `tsconfig.json` (unedited) | **NEW** `package.json` (workspace root, private) |
| `tsconfig.app.json` (add `extends`) | **NEW** `pnpm-workspace.yaml` |
| `tsconfig.node.json` (add `extends`) | **NEW** `turbo.json` |
| `eslint.config.js` (unedited) | **NEW** `.npmrc` |
| `package.json` → `apps/web/package.json` (edit: drop `packageManager`, rename `name` → `web`) | **NEW** `tsconfig.base.json` |
| `.env.example` (git mv — tracked) | **NEW** (recommended, small) root `CLAUDE.md` — monorepo shape + pointer to `apps/web/CLAUDE.md` |
| `.env` (plain filesystem move — **untracked**, `git mv` can't touch it) | **NEW** placeholders: `packages/core/package.json`, `apps/mobile/package.json` |
| `CLAUDE.md` → `apps/web/CLAUDE.md` (unedited) | |
| `README.md` → `apps/web/README.md` (unedited) | |
| `docs/**` → `apps/web/docs/` | |
| `.claude/skills/{add-feature-slice,add-api-call,review-conventions,elevate-ui}/**` → `apps/web/.claude/skills/**` (see ambiguity below) | |

`node_modules/` and `dist/` are **not moved** anywhere — deleted/regenerated by `pnpm install` / `pnpm build`.

**pnpm workspace + node-linker decision** (the master plan's #1 named risk):
2026 pnpm+Metro guidance is consistent: Metro's resolver historically fights pnpm's default `isolated` linker (symlinked `.pnpm` virtual store) — needing explicit `watchFolders`, `nodeModulesPaths`, `disableHierarchicalLookup` in `metro.config.js`. Current RN monorepo guides recommend `node-linker=hoisted` to avoid hours of debugging. **Recommendation: set `node-linker=hoisted` in the root `.npmrc` NOW** — this is exactly the "prove/de-risk in this change" decision the master plan calls for. Cost to Vite/web today is ~zero (Vite doesn't care about `node_modules` layout; a flat tree is closer to today's single-root layout), so it's the lower-risk choice for both today's web and tomorrow's Metro.

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

**Turborepo pipeline** — current stable is **Turborepo 2.10.4**; config key is `tasks` (the `pipeline` key was deprecated at Turbo 2.0). Recommended `turbo.json`:
```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "lint":  { "dependsOn": [], "outputs": [] },
    "dev":   { "cache": false, "persistent": true }
  }
}
```
`lint` has no `dependsOn` (ESLint here is not type-aware). `test` intentionally **not** added yet (no package has a test script; `strict_tdd: false`). Root `package.json` scripts delegate: `"build": "turbo run build"`, `"lint": "turbo run lint"`, `"dev": "turbo run dev"`; root devDependency `"turbo": "^2.10.4"`. Root does not hoist app deps (react/vite/eslint/typescript stay in `apps/web/package.json`, unchanged) — root package.json's job is orchestration only.

**Shared `tsconfig.base.json`** — hoist only what's genuinely common between the two leaf configs today: `target: es2023`, `module: esnext`, `moduleResolution: bundler`, `allowImportingTsExtensions`, `verbatimModuleSyntax`, `moduleDetection: force`, `skipLibCheck`, `strict`, `noUnusedLocals/Parameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`, `ignoreDeprecations: "6.0"`. Leave `lib`, `types`, `jsx`, `baseUrl`/`paths` in the leaf configs (`paths` will later need `@core/*` in core-extraction — not this change).

**git-mv strategy**: repo is already on branch `feat/monorepo-workspace-bootstrap`. Apply phase MUST verify a clean/expected working tree (`git status`/`git log`) before any `git mv` (this phase had no Bash access). `node_modules`/`dist` are not moved (regenerated).

**Scope decision** (empty vs minimal placeholders for `packages/core` + `apps/mobile`): **minimal placeholders** — a `package.json` per package (`{"name":"core","version":"0.0.0","private":true}` / `{"name":"mobile",...}`) is the smallest unit the workspace glob needs to resolve them and prove `pnpm install` produces a valid multi-importer lockfile. No `src/`, no tsconfig, no build script — real content out of scope (core-extraction, mobile-app-foundation). **Unscoped names** (`core`, `mobile`, `web`) to match the plan's verification commands (`pnpm --filter web build`); low-stakes, proposal may override.

**Verification approach** (no test runner):
1. `pnpm install` from root — clean, single lockfile regenerates with `importers: { ., apps/web, packages/core, apps/mobile }`.
2. `pnpm --filter web build` — `tsc -b && vite build` with cwd=`apps/web`, proves the alias/build chain survived unedited.
3. `pnpm --filter web lint` — same ruleset, zero new findings expected (pure move).
4. `pnpm -w build` (`turbo run build`) — proves workspace pipeline wiring; core/mobile have no build script yet, turbo skips them.
5. `git status`/`git diff --stat` — confirm only renames + the small deliberate edits.
6. Manual (not build/lint-provable): `pnpm --filter web dev` smoke, and `.claude/skills/*` invocation from both root and `apps/web` cwd.

## Discrepancies / corrections

- **pnpm 9 is EOL** (2026-04-30); current stable is pnpm 11.9.0 (needs Node ≥22). **Keep pnpm 9.15.9 pinned for this bootstrap** — upgrading the package-manager major is orthogonal and separately risky; flag a pnpm-upgrade as its own fast-follow change.
- **`openspec/config.yaml` claims `formatter: prettier`, but no Prettier exists** (no devDependency, no `.prettierrc*`). Stale/aspirational — correct or call out.
- **No CI/deploy config exists** (no `.github/`, Dockerfile, vercel/netlify) — nothing needs path updates for CI (a simplification).
- Env metadata "Is directory a git repo: No" is false for this target — `.git/` present, on-branch. Treat as unreliable.

## Additional considerations for the proposal

**`.claude/skills/` + `CLAUDE.md` relocation ambiguity**: the four skills (`add-feature-slice`, `add-api-call`, `review-conventions`, `elevate-ui`) cite paths *relative to the app root* (`src/api/modules/...`, `src/pages/...`). Today cwd = repo root = app root, so it's invisible. After the move, invoking a skill from the **monorepo root** (not `apps/web/`) could resolve path-relative instructions against the wrong dir.

| Option | Pros | Cons |
|---|---|---|
| **A. Move as-is into `apps/web/.claude/` (recommended)** | Zero content edits (pure `git mv`, matches "no behavior change"); colocated with the code | Root-cwd discoverability unverified; fast-follow if broken |
| B. Rewrite skill path refs now (`src/...`→`apps/web/src/...`) / duplicate to root | Removes ambiguity now | Scope creep on a "no behavior change" bootstrap; 6 prose-edited files, error-prone; premature if cwd=apps/web already works |

Recommend **Option A** + one small **new** root `CLAUDE.md` (net-new, not moved) stating the monorepo shape and pointing to `apps/web/CLAUDE.md`. Manually verify skill invocation from both cwds as a non-blocking follow-up.

**Package naming**: rename `apps/web/package.json` `name` `housecenter-web` → `web` (private, unpublished) so `pnpm --filter web ...` works; drop the app-level `packageManager` field (root owns the pinned pnpm version). Root `package.json` `name` (`housecenter` vs `housecenter-web`) is cosmetic — open low-stakes call.

**Node engines**: none today. Vite 8 requires Node `20.19+`/`22.12+`; Node 24 is current Active LTS. Recommend root `package.json` `"engines": { "node": "^20.19.0 || ^22.12.0 || >=24.0.0" }` — new but low-risk, closes a gap before Expo adds its own Node floor.

**Optional, not for this change**: a root `tsconfig.json` with `references: [{ "path": "apps/web" }]` for whole-workspace `tsc -b` — skip until core/mobile are real TS projects (core-extraction).

## Recommendation

Proceed as scoped: `git mv` the app tree into `apps/web/` unedited except the two `tsconfig.*.json` `extends` lines and the `package.json` `name`/`packageManager` edits; add root `package.json` + `pnpm-workspace.yaml` + `turbo.json` + `.npmrc` (`node-linker=hoisted`) + `tsconfig.base.json`; add minimal unscoped placeholder `package.json`s for `packages/core` + `apps/mobile`; keep pnpm pinned at `9.15.9` (separate upgrade change); verify via `pnpm install` + `pnpm --filter web build` + `pnpm --filter web lint` + `pnpm -w build`. This keeps the change's promise (web behavior literally unchanged) while resolving the master plan's #1 infra risk (node-linker) proactively.

Proposal should confirm/override: (1) `.claude/skills` relocation (recommend Option A), (2) `web`/`core`/`mobile` naming, (3) keeping pnpm 9.15.9 (EOL) for this change, (4) working-tree clean on `feat/monorepo-workspace-bootstrap` before any `git mv` (needs a Bash-capable phase).
