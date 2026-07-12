# SDD Tasks — HouseCenter Web (Frontend v2)

> **Note:** This documents the original **Untitled UI** build. The UI layer (component
> kit, Tailwind styling, dark-mode application, icons) is superseded by
> [`mui-migration-plan.md`](./mui-migration-plan.md). The API surface, routing,
> data-fetching, and form logic below remain accurate.

## Tasks must be done in order — each depends on the previous.
## Acceptance criterion per task: `pnpm build` must pass with zero TypeScript errors.

---

### T1 — Project scaffold

- [ ] `pnpm create vite housecenter-web --template react-ts` in `hoh-project-net/`
- [ ] Configure `tsconfig.json` for strict mode + path aliases (`@/` → `src/`)
- [ ] Install core dependencies:
  ```
  pnpm add react-router-dom @tanstack/react-query axios zustand zod react-hook-form
  pnpm add @hookform/resolvers
  pnpm add -D tailwindcss @tailwindcss/forms autoprefixer
  ```
- [ ] Install Untitled UI for React (follow vendor install instructions)
- [ ] Configure `tailwind.config.ts` with Untitled UI preset + `darkMode: 'class'`
- [ ] Create folder structure: `api/`, `types/`, `hooks/`, `schemas/`, `store/`,
  `layouts/`, `pages/`, `components/`, `lib/`
- [ ] Create `.env.example` with `VITE_API_BASE_URL=http://localhost:5000`
- [ ] Create `.gitignore` (node_modules, dist, .env)

**Acceptance:** `pnpm dev` starts, blank white page with no console errors.

---

### T2 — HTTP client + auth store

- [ ] `src/api/client.ts` — Axios instance:
  - `baseURL` from `import.meta.env.VITE_API_BASE_URL`
  - Request interceptor: attach `Authorization: Bearer {token}` from Zustand store
  - Response interceptor: on 401, call `/auth/refresh`, retry, else logout + redirect
  - Typed `ApiError` class extracted from ProblemDetails response
- [ ] `src/store/auth.store.ts` — Zustand:
  - `user: UserResponse | null`
  - `accessToken: string | null`
  - `refreshToken: string | null`
  - `setAuth(user, accessToken, refreshToken): void`
  - `logout(): void`
- [ ] `src/types/auth.types.ts` — all auth DTOs (matches spec.md DTO section)
- [ ] `src/types/common.types.ts` — `PagedResult<T>`, `PageQuery`, `ProblemDetails`

**Acceptance:** TypeScript compiles, no `any` types in client.ts.

---

### T3 — Auth pages + routing skeleton

- [ ] `src/lib/queryClient.ts` — TanStack Query client (staleTime: 30s, retry: 1)
- [ ] `src/App.tsx` — `RouterProvider` + `QueryClientProvider` + `AuthProvider`
- [ ] `src/layouts/AuthLayout.tsx` — centered card layout for public pages
- [ ] `src/layouts/AppLayout.tsx` — sidebar + topbar shell (sidebar content placeholder)
- [ ] `src/components/guards/RequireAuth.tsx`
- [ ] `src/components/guards/RequireRole.tsx`
- [ ] Route tree:
  ```
  / → AppLayout (RequireAuth)
    index → DashboardPage (placeholder)
  /login → AuthLayout → LoginPage
  /signup → AuthLayout → SignupPage
  /forgot-password → AuthLayout → ForgotPasswordPage
  /reset-password → AuthLayout → ResetPasswordPage
  ```
- [ ] `src/api/modules/auth.api.ts` — all auth endpoint functions
- [ ] `src/hooks/auth/useMe.ts` — `GET /auth/me` on app boot
- [ ] `src/pages/auth/LoginPage.tsx` — form with email + password, calls `POST /auth/login`,
  stores tokens in Zustand, navigates to `/`
- [ ] `src/pages/auth/SignupPage.tsx` — reads `?token=`, validates via
  `GET /invitations/validate`, shows form only if valid
- [ ] `src/pages/auth/ForgotPasswordPage.tsx` — calls `POST /auth/password/request`
- [ ] `src/pages/auth/ResetPasswordPage.tsx` — reads `?token=`, calls `POST /auth/password/reset`

**Acceptance:** Can log in, token stored in memory, `/` redirects to login when not auth'd.

---

### T4 — App shell: sidebar + topbar + dark mode

- [ ] `src/lib/constants.ts` — `ROLE_NAMES`, `NAV_ITEMS` array with roles filter
- [ ] `src/layouts/AppLayout.tsx` — complete:
  - Sidebar renders `NAV_ITEMS` filtered by `user.role.name`
  - Active link highlight
  - Collapse/expand sidebar (Untitled UI)
  - Mobile: drawer overlay
- [ ] `src/components/notifications/NotificationBell.tsx`:
  - Badge with unread count (polling 60s)
  - Dropdown on click: list of recent notifications + "Mark all read" button
- [ ] Top bar: user avatar dropdown → Settings, Logout, theme toggle
- [ ] Dark mode: `document.documentElement.classList` toggle on `user.darkMode` +
  `PATCH /users/me/theme` mutation on toggle

**Acceptance:** Sidebar renders, dark mode toggles visually + persists across refresh
(via `GET /auth/me` returning `darkMode: true`).

---

### T5 — Clinics module

- [ ] `src/types/clinic.types.ts`
- [ ] `src/schemas/clinic.schema.ts`
- [ ] `src/api/modules/clinics.api.ts`
- [ ] `src/hooks/clinics/` — `useClinics`, `useClinic`, `useCreateClinic`,
  `useUpdateClinic`, `useDeactivateClinic`
- [ ] `src/pages/clinics/ClinicsPage.tsx` — table with Untitled UI DataTable,
  "New Clinic" button (slide-over form), row actions: Edit / Deactivate
- [ ] `src/pages/clinics/ClinicDetailPage.tsx` — detail card + Edit form

**Acceptance:** Full CRUD works against running API.

---

### T6 — Work Routes module

- [ ] `src/types/workroute.types.ts` (includes `DestinationPoint`)
- [ ] `src/schemas/workroute.schema.ts`
- [ ] `src/api/modules/workroutes.api.ts`
- [ ] `src/hooks/workroutes/` — list, detail, create, update, delete
- [ ] `src/pages/work-routes/WorkRoutesPage.tsx` — table + create slide-over
- [ ] `src/pages/work-routes/WorkRouteDetailPage.tsx` — destination points list (add/remove)

**Acceptance:** Routes with multi-destination editing work.

---

### T7 — Collaborators module

- [ ] `src/types/collaborator.types.ts` (includes `Position`)
- [ ] `src/api/modules/collaborators.api.ts`
- [ ] `src/hooks/collaborators/` — list, detail, create, update, delete
- [ ] `src/pages/collaborators/CollaboratorsPage.tsx` — staff directory with positions

**Acceptance:** Collaborator CRUD works, visible to Admin/Owner only.

---

### T8 — Users + Invitations (Management section)

- [ ] `src/types/user.types.ts`, `src/types/invitation.types.ts`
- [ ] `src/api/modules/users.api.ts`, `src/api/modules/invitations.api.ts`
- [ ] `src/hooks/users/`, `src/hooks/invitations/`
- [ ] `src/pages/management/UsersPage.tsx`:
  - User table: name, email, role badge, status
  - Edit user slide-over
  - Deactivate action
  - Role assignment (Owner only — hide button for non-Owner)
- [ ] `src/pages/management/InvitationsPage.tsx`:
  - Active invitations list
  - "Invite user" form (email + role selector)
  - Resend / Revoke actions

**Acceptance:** Invite flow works end-to-end (invite → signup page reads token).

---

### T9 — Patients list + profile shell

- [ ] `src/types/patient.types.ts` (Patient, Treatment, TreatmentDetail, Comments)
- [ ] `src/schemas/patient.schema.ts`
- [ ] `src/api/modules/patients.api.ts`
- [ ] `src/hooks/patients/` — `usePatients` (paginated), `usePatientFullSummary`
- [ ] `src/pages/patients/PatientsPage.tsx`:
  - Paginated table with `keepPreviousData`
  - `PaginationBar` component
  - "New Patient" slide-over form
- [ ] `src/pages/patients/PatientProfilePage.tsx`:
  - Tab layout: Overview | Treatments | Sessions | Comments | Consultations | Attachments
  - Overview tab: calls `full-summary`, renders patient info + assigned users

**Acceptance:** Patient list paginates, profile page loads summary.

---

### T10 — Treatments + comments (patient profile tabs)

- [ ] Treatments tab:
  - Paginated treatment list with status badge (Active/Completed/Paused)
  - Expandable row → TreatmentDetails + TreatmentComments inline
  - Add treatment form, edit treatment, `PATCH status`, delete
  - Add/edit/delete treatment details
  - Add/edit/delete treatment comments
- [ ] Comments tab (patient-level):
  - PatientComment list with type badge (Route/Medical/Simple)
  - Add/edit/delete comment
- [ ] Assign collaborator action on Overview tab (`POST /patients/{id}/collaborators/{userId}`)
- [ ] Assign/unassign doctor (`POST/DELETE /patients/{id}/doctors/{userId}`)

**Acceptance:** Full treatment lifecycle works from UI.

---

### T11 — Sessions (patient profile tab)

- [ ] `src/types/session.types.ts`
- [ ] `src/schemas/session.schema.ts`
- [ ] `src/api/modules/sessions.api.ts`
- [ ] `src/hooks/sessions/` — `useSessions`, `useCreateSession`,
  `useUpdateSessionStatus`, `useDeleteSession`
- [ ] Sessions tab in PatientProfilePage:
  - Paginated session list with status badge + AttentionType badge
  - "New Session" form: date, AttentionType, ClinicId OR WorkRouteId (at least one required),
    notes — cross-field validation via Zod `.refine()`
  - Update status action (Scheduled → Completed/Missed)
  - Delete with confirmation dialog

**Acceptance:** Session creation validates at least one of clinic/route is selected.

---

### T12 — Consultations module

- [ ] `src/types/consultation.types.ts`
- [ ] `src/schemas/consultation.schema.ts`
- [ ] `src/api/modules/consultations.api.ts`
- [ ] `src/hooks/consultations/`
- [ ] `src/pages/consultations/ConsultationsPage.tsx`:
  - Inbox tabs: Open / Under Review / Resolved
  - "New Consultation" form: patient selector, doctor selector (only assigned doctors),
    title, opening message
- [ ] `src/pages/consultations/ConsultationDetailPage.tsx`:
  - Thread view: messages in order with role badges
  - Reply form at bottom
  - Status badge + Resolve button (Doctor/Admin only)
- [ ] Consultations tab on PatientProfilePage: mini-list of consultations for this patient

**Acceptance:** Doctor can open, reply, resolve. Sponsor sees no consultations section.

---

### T13 — Reports + Dashboard

- [ ] `src/types/report.types.ts`
- [ ] `src/api/modules/reports.api.ts`
- [ ] `src/hooks/reports/`
- [ ] `src/pages/DashboardPage.tsx`:
  - Summary cards from `GET /reports/summary`
  - 6 stat cards: active patients, sessions this month, collaborators, clinics, routes, treatments
- [ ] `src/pages/reports/ReportsPage.tsx`:
  - Date range picker header
  - Weekly sessions bar chart (Recharts or Chart.js) from `GET /reports/sessions`
  - Per-clinic summary card from `GET /reports/clinics/{id}`
  - Per-route summary card from `GET /reports/work-routes/{id}`

**Acceptance:** Dashboard shows live data. Sponsor and Admin see same page (API handles projection).

---

### T14 — Notifications + Attachments

- [ ] Notifications (NotificationBell complete from T4 — this task: mark-read + navigate)
  - Clicking notification → `PATCH read` + navigate to linked entity
  - "Mark all read" button
- [ ] `src/types/attachment.types.ts`
- [ ] `src/api/modules/attachments.api.ts`
- [ ] `src/hooks/attachments/`
- [ ] Attachments tab on PatientProfilePage:
  - File list with type icon + file name + uploader + date
  - Upload button: `input[type=file]` → `POST /attachments` with `ownerType=Patient`
  - Upload progress bar via `onUploadProgress`
  - Image files: inline preview thumbnail
  - Non-image: download link
  - Delete with confirmation

**Acceptance:** File upload shows progress, image previews work, list refreshes after upload.

---

### T15 — Polish + Settings page

- [ ] `src/pages/settings/SettingsPage.tsx`:
  - Profile section: display name, email (read-only)
  - Theme section: dark/light toggle (same action as topbar toggle)
- [ ] 404 page for unknown routes
- [ ] Empty states for all list pages (Untitled UI EmptyState component)
- [ ] Error boundaries per route section
- [ ] `pnpm build` — zero TypeScript errors, no unused imports
- [ ] README.md with: setup steps, env vars, how to run, API base URL config

**Acceptance:** `pnpm build` clean. App navigates without console errors across all pages.

---

## Estimated effort by phase

| Tasks | Focus | Hours |
|---|---|---|
| T1–T3 | Foundation + auth | 4–6h |
| T4 | Shell + navigation | 3–4h |
| T5–T7 | Simple CRUD modules | 4–6h |
| T8 | Users + invitations | 3–4h |
| T9–T10 | Patient + treatments | 6–8h |
| T11–T12 | Sessions + consultations | 5–7h |
| T13 | Reports + charts | 4–5h |
| T14–T15 | Notifications, attachments, polish | 4–6h |
| **Total** | | **33–46h** |

---

## New concepts this project introduces

| Task | What you'll learn |
|---|---|
| T2 | Axios interceptors for auto-refresh — real production auth pattern |
| T2 | Zustand — minimal global state (vs Redux/Context) |
| T3 | React Router v7 loaders — data fetching tied to navigation |
| T4 | TanStack Query polling — `refetchInterval` |
| T5–T8 | TanStack Query key factory pattern |
| T9 | `keepPreviousData` for flicker-free pagination |
| T11 | Zod cross-field validation with `.refine()` |
| T12 | Role-based UI rendering (not just route guards) |
| T13 | ECharts/Recharts integration for data viz |
| T14 | Multipart upload + progress tracking |
