# HouseCenter Web

React 19 SPA — a healthcare/clinic management dashboard (patients, treatments, sessions,
clinics, work routes, consultations, collaborators, reports). It is the **frontend client
of a .NET backend** (sibling repo `housecenter-api`): mostly unversioned routes (only
`/clinics` is under `/api/v1/` today — see the versioning gotcha below), RFC 7807
`ProblemDetails` errors, PascalCase enums, GUID ids. No business logic lives here — only
presentation and data orchestration.

## Commands

- `pnpm dev` — Vite dev server with HMR
- `pnpm build` — `tsc -b && vite build` (type-check then bundle)
- `pnpm lint` — ESLint
- `pnpm preview` — serve the production build

**Use `pnpm`** (not npm/yarn). There is **no test runner configured** — do not assume `pnpm test` exists; if a change needs verification, run `pnpm build` and `pnpm lint`.

## Tech stack

- **Vite 8** + **React 19** + **TypeScript** (strict). `@/*` aliases `src/*` (set in `vite.config.ts` and `tsconfig.app.json`).
- **React Router 7** (`createBrowserRouter`) — nested routes carry nested layouts + guards.
- **TanStack Query 5** — all *server* state (the cache of the backend DB).
- **Zustand** — *client* state, used only for the auth session (`src/store/auth.store.ts`).
- **React Hook Form + Zod** — forms and validation; the Zod schema is the form's type.
- **Axios** — single instance in `src/api/client.ts` with auth interceptors.
- **MUI v9** (`@mui/material`, `@mui/icons-material`, `@mui/x-date-pickers`) — the UI kit. There is no shared primitive-wrapper directory; import components directly from `@mui/material` (`Table`, `Button`, `Chip`, `Paper`, `Box`, `Typography`, `IconButton`, `Tooltip`, etc.) and use `onClick` handlers. (The project started on Untitled UI + React Aria Components + Tailwind and migrated to MUI v9 early on — see `src/components/shared/SlideOver.tsx` for a comment documenting the swap.)

## Architecture — the four-layer convention (READ THIS FIRST)

**Every feature is the same four files.** Adding a feature = copy the pattern, rename. Never skip or merge layers.

```
src/types/<feature>.types.ts        (1) Contracts — DTOs matching the .NET API
        ↓ imported by
src/api/modules/<feature>.api.ts     (2) Transport — dumb axios calls, one fn per endpoint
        ↓ wrapped by
src/hooks/<feature>/use<Feature>.ts  (3) Data — TanStack Query hooks + a query-key factory
        ↓ consumed by
src/pages/<feature>/<Feature>Page.tsx (4) UI — render, forms, actions; calls hooks ONLY
```

Layer rules — these are hard boundaries:

- **Pages NEVER import `apiClient` or axios.** A page talks to hooks; a hook talks to an api module; an api module talks to `apiClient`. (`grep -r apiClient src/pages` must stay empty.)
- **api modules are dumb**: each function is `apiClient.<verb>(...).then(r => r.data)`. No React, no caching, no try/catch. Define `const BASE = '/<feature>'` at the top — **not** `/api/v1/<feature>` (see the versioning gotcha below); copy `BASE` from a neighboring module and verify it against the actual backend route, don't assume.
- **Hooks own caching.** Every hook file exports a **query-key factory** (e.g. `patientKeys.all / list / detail`) and uses it for both `queryKey` and invalidation. After a mutation, `invalidateQueries({ queryKey: <feature>Keys.all })`; on update, also `setQueryData(detail(id), updated)` for an instant cache write. See `src/hooks/patients/usePatients.ts` (paged) and `src/hooks/clinics/useClinics.ts` (non-paged) as the two reference shapes.
- **Forms** use `useForm({ resolver: zodResolver(schema) })` with `Controller` per field. Schema lives in `src/schemas/<feature>.schema.ts`; export `type XFormData = z.infer<typeof xSchema>`.

To scaffold a new slice, invoke the **`add-feature-slice`** skill. To add one endpoint to an existing module, use **`add-api-call`**.

## Conventions

- **Named exports only** — no `export default` for components/modules (`App.tsx` is the lone exception React requires).
- **Imports use the `@/` alias**, never long relative chains (`@/components/...`, not `../../components/...`).
- **Filenames**: pages/components `PascalCase.tsx`; hooks `useThing.ts`; api modules `<feature>.api.ts`; types `<feature>.types.ts`; schemas `<feature>.schema.ts`.
- **Icons**: import per-file from `@mui/icons-material` (e.g. `import AddOutlined from '@mui/icons-material/AddOutlined'`), as done throughout `src/components/shared/Sidebar.tsx` and the page components. `src/components/shared/Icon.tsx` (a legacy `name` → SVG-path map) is near-dead code with a single remaining consumer (`PatientProfilePage.tsx`) — do not add new usages of it.
- **Styling uses MUI's `sx` prop** against the shared theme (`src/styles/theme.ts`, applied via `AppThemeProvider`). Match the surrounding page; don't introduce raw hex colors or reach for Tailwind utility classes on MUI components.

## State, auth & RBAC

- **Session lives in `useAuthStore`**: `refreshToken` in `localStorage` (key `hc_rt`, survives reload); `accessToken` in memory only (security). Use `setTokens()` to set tokens before any authed call, `setAuth()` once the user is loaded — this ordering matters because the request interceptor reads `accessToken` from the store on every request.
- **Token refresh is automatic.** `src/api/client.ts` attaches the Bearer token and, on a `401`, silently refreshes once (with a queue so concurrent 401s trigger only one `/auth/refresh`) then retries. Do not add per-call token handling.
- **Errors**: the response interceptor maps `ProblemDetails` → `ApiError` (`{ status, detail, errors }`, see `src/types/common.types.ts`). Use `isApiError(err)` to read `.detail` / `.errors` in the UI.
- **Roles** (`src/lib/constants.ts`): `Owner, Administrator, Member, Doctor, Sponsor`. Groups: `ADMIN_ABOVE` (Owner+Admin) gates management; `STAFF_ONLY` (all except Sponsor) gates consultations.
- **Protect routes in the router tree**, not inside pages: wrap with `<RequireRole roles={...}>` in `App.tsx`, and add the matching entry to `NAV_ITEMS` with the same role list so the sidebar and the guard agree.

## Gotchas (things that have bitten / will bite)

- **Almost nothing is versioned — only Clinics is.** The backend wraps exactly one module in `/api/v1/`: `v1.MapClinicEndpoints()` in the API's `Program.cs`. Every other module (`auth`, `patients`, `treatments` + its nested details/comments/collaborators/doctors, `sessions`, `consultations`, `collaborators`, `workroutes`, `reports`, `users`, `roles`, `invitations`, `notifications`, `attachments`) is mapped directly on `app` with **no prefix**. This bit hard once already: 8 of 14 api modules had `/api/v1/<feature>` hardcoded despite the backend never serving it, 404ing on every real request while `dotnet test` stayed green (C#-to-C# tests don't catch a frontend URL string typo). **Never assume — grep the actual route registration in `Program.cs`/`*Endpoints.cs` in the API repo before writing `BASE`.**
- **Empty string vs null**: HTML inputs emit `""`, but the .NET API wants `null` for "no value". Zod schemas normalize at the boundary: `.nullable().or(z.literal('')).transform(v => v || null)`. Reuse that for every optional string field.
- **`VITE_API_BASE_URL`** comes from `.env` (see `.env.example`, default `http://localhost:5000`). The .NET API must be running for the app to work.
- **No error boundary exists** — an uncaught render error white-screens the app. Keep render code defensive.

## Skills

Project skills live in `.claude/skills/`:

- **`add-feature-slice`** — scaffold a complete CRUD vertical slice (all four layers + schema + route + nav).
- **`add-api-call`** — add a single endpoint to an existing api module and its Query/Mutation hook.
- **`review-conventions`** — audit a file or diff against the conventions in this document.
