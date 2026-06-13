---
name: review-conventions
description: Audit housecenter-web frontend code against this project's specific conventions — the four-layer architecture (types/api/hook/page), layer boundaries, query-key factory + cache invalidation, Zod "" → null normalization, named exports, the @/ import alias, RBAC route guards, and the auth/token rules. Use when reviewing a diff, a PR, or specific files for consistency with the HouseCenter patterns, e.g. "check this against our conventions", "does this follow the project structure", "review my new module", "is this slice wired correctly". This is project-specific structural review, complementary to a general bug-focused code review.
argument-hint: [file paths or "diff" to review the working tree]
---

# Review against HouseCenter conventions

Check the target code (the files named in arguments, or `git diff` if the user says "diff"/"PR")
against the rules in the project `CLAUDE.md`. This is a **structural/consistency** review, not a
general bug hunt. Report findings grouped by severity: **MUST FIX** (breaks a hard rule),
**SHOULD FIX** (drifts from the pattern), **CONSIDER** (minor/stylistic). Cite `file:line` and
quote the offending snippet. If everything passes, say so plainly.

## Checklist

**Layer boundaries**
- [ ] No page under `src/pages/**` imports `apiClient` or `axios` (page → hook → api module → client). Flag any `apiClient` / `from 'axios'` in a page as MUST FIX.
- [ ] api modules (`src/api/modules/*.api.ts`) contain only one-line `apiClient.<verb>(...).then(r => r.data)` functions — no React imports, no `useQuery`, no try/catch, no caching. They define `const BASE = '/api/v1/<plural>'`.
- [ ] Hooks (`src/hooks/**`) are the only place `@tanstack/react-query` is used for these resources.

**Data layer (TanStack Query)**
- [ ] The hook file exports a **query-key factory** object and uses it for *every* `queryKey` and `invalidateQueries` — no inline `['foo']` literals scattered in components.
- [ ] Every mutation has an `onSuccess` that invalidates the relevant keys (and `setQueryData(detail(id), updated)` on updates). A mutation with no cache update is a MUST FIX.
- [ ] Paged lists use `keepPreviousData`; id-dependent queries use `enabled: !!id`.

**Types & schemas**
- [ ] Response/request types live in `src/types/<feature>.types.ts` and match the .NET DTO shape (camelCase fields, enums as string-literal unions, ids as `string`). The shared `PagedResult<T>` from `common.types.ts` is reused, not redefined.
- [ ] Form schemas live in `src/schemas/<feature>.schema.ts` and export `type XFormData = z.infer<...>`.
- [ ] Optional string fields normalize empty input: `.nullable().or(z.literal('')).transform(v => v || null)`. Flag optional strings sent to the API as `""` instead of `null`.

**Conventions**
- [ ] Named exports only (no `export default` outside `App.tsx`).
- [ ] Imports use the `@/` alias, not `../../` chains.
- [ ] UI uses `@/components/base/*` primitives (`Input`, `Button`, `Select`, `Table`, `SlideOver`, `ConfirmDialog`) rather than raw `<input>`/`<button>`; buttons use `onPress`, not `onClick`.
- [ ] `<Icon name="…" />` uses a name present in `src/components/shared/Icon.tsx`.
- [ ] Filenames follow the pattern (`PascalCase.tsx` pages/components, `useThing.ts` hooks, `<feature>.api.ts`, `<feature>.types.ts`, `<feature>.schema.ts`).

**Auth & RBAC**
- [ ] No manual token reading/attaching in feature code — the `apiClient` interceptors own that.
- [ ] New protected routes are wrapped in `<RequireRole roles={…}>` in `App.tsx`, and the matching `NAV_ITEMS` entry in `src/lib/constants.ts` uses the **same** role list (guard and sidebar must agree).
- [ ] Route base matches backend versioning (domain routes `/api/v1/...`; auth routes unversioned).

## Output

End with a one-line verdict: **CONSISTENT** (ready) or **NEEDS CHANGES** (with the count of MUST FIX items).
