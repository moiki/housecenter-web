---
name: add-feature-slice
description: Scaffold a complete CRUD feature slice in housecenter-web following the four-layer convention (types → api module → TanStack Query hook → page), plus an optional Zod schema, route registration, and sidebar nav entry. Use when adding a new domain entity/module/resource/section to the app, e.g. "add a treatments module", "scaffold a new feature for appointments", "create CRUD pages for X", or wiring a new backend resource into the frontend.
argument-hint: [feature-name] (singular or plural, e.g. "appointment")
---

# Add a feature slice

Scaffold a new domain feature in housecenter-web by replicating the project's mandatory
four-layer pattern. Match the **existing** code exactly — this codebase values consistency
over cleverness. Reference implementations: patients (paged list) and clinics (full list).

## Before writing anything

1. **Confirm the backend contract.** Ask the user (or check `housecenter-api`) for: the
   resource's fields and types, whether the list endpoint is **paged** (`PagedResult<T>`,
   like patients) or **returns all** (`T[]`, like clinics), and which roles may access it.
   Do **not** invent fields. **The route base is almost always unversioned** (`/<plural>`)
   — only Clinics is served under `/api/v1/`. Grep the actual route registration in
   `Program.cs`/`*Endpoints.cs` in the `housecenter-api` repo before writing `BASE`; never
   assume `/api/v1/` by default.
2. **Pick naming**: `<feature>` = lowercase singular for files/types (`treatment`),
   `<plural>` for routes/dirs where the codebase uses plurals (`treatments`),
   `<Feature>` = PascalCase (`Treatment`). Follow whatever neighboring slices do.
3. **Read the full templates** in [reference.md](reference.md) before generating — it has
   the exact file shapes for both the paged and non-paged variants. Also read one real
   neighbor (`src/pages/patients/PatientsPage.tsx` or `src/pages/clinics/ClinicsPage.tsx`)
   to copy the current component APIs (`@mui/material`'s `Table`, `Select`, `Button`, etc.,
   plus `src/components/shared/SlideOver.tsx`).

## The files to create (in this order)

| # | Layer | Path |
|---|-------|------|
| 1 | Types | `src/types/<feature>.types.ts` |
| 2 | Schema (if it has a form) | `src/schemas/<feature>.schema.ts` |
| 3 | API module | `src/api/modules/<feature>.api.ts` |
| 4 | Hook | `src/hooks/<feature>/use<Feature>s.ts` |
| 5 | Page(s) | `src/pages/<feature>/<Feature>sPage.tsx` (+ detail page if needed) |

Then wire it up:

| 6 | Route | add `{ path: '/<plural>', element: <…Page /> }` in `src/App.tsx` under the correct guard |
| 7 | Nav | add an entry to `NAV_ITEMS` in `src/lib/constants.ts` with the matching `roles` + a valid `icon` |

## Hard rules (do not violate)

- **Named exports only.** Import with the `@/` alias, never `../../`.
- **Pages never import `apiClient`/axios.** Page → hook → api module → `apiClient`.
- **api module functions are one-liners**: `apiClient.<verb>(...).then(r => r.data)`. Define `const BASE = '/<plural>'` — **not** `/api/v1/<plural>`; only Clinics is versioned. Copy `BASE` from a neighboring module and verify it against the actual backend route.
- **Hook file exports a query-key factory** (`<feature>Keys`) and uses it for every `queryKey` and `invalidateQueries`. On `useUpdate`, also `setQueryData(detail(id), updated)`.
- **Optional string fields** in the schema use `.nullable().or(z.literal('')).transform(v => v || null)`.
- **Place the route under the right guard** in `App.tsx`: all-roles (no wrapper), `STAFF_ONLY`, or `ADMIN_ABOVE` via `<RequireRole roles={...}>`. The `NAV_ITEMS` `roles` must match.
- **Icons**: import per-file from `@mui/icons-material` (e.g. `import AddOutlined from '@mui/icons-material/AddOutlined'`). The legacy `src/components/shared/Icon.tsx` has been removed — there's no fallback to reach for.

## After scaffolding

Run `pnpm build` (type-check) and `pnpm lint`. Fix any errors before reporting done.
There is no test runner — do not claim tests pass. Report exactly which files were created
and which were edited (App.tsx, constants.ts), and note anything you assumed about the
backend contract so the user can confirm it.
