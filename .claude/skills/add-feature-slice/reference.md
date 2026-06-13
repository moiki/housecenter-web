# Feature slice templates

Copy these verbatim and substitute. Placeholders:
`<feature>` = lowercase singular (`treatment`), `<plural>` = lowercase plural (`treatments`),
`<Feature>` = PascalCase singular (`Treatment`). Two list variants exist — pick one to match
the backend: **A) paged** (mirror patients) or **B) full list** (mirror clinics).

---

## 1. Types — `src/types/<feature>.types.ts`

```ts
// Reuse the shared PagedResult<T> from common.types.ts for paged lists — do not redefine it.
import type { PagedResult } from '@/types/common.types'

export interface <Feature>Response {
  id: string
  // … fields exactly as the .NET DTO returns them (camelCase, GUID ids as string,
  //   dates as ISO string, PascalCase enums as string-literal unions)
  isActive: boolean
}

export interface Create<Feature>Request {
  // … the fields the create endpoint accepts (no id, no isActive)
}

// Update usually mirrors Create; alias it unless the backend differs:
export type Update<Feature>Request = Create<Feature>Request
```

If a field is an enum, model it as a union: `export type FooStatus = 'Active' | 'Completed'`.
`PagedResult<T>` is only imported when the list endpoint is paged (variant A).

---

## 2. Schema (forms only) — `src/schemas/<feature>.schema.ts`

```ts
import { z } from 'zod'

export const <feature>Schema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  // optional string fields normalize "" -> null at the boundary:
  description: z.string().max(500).nullable().or(z.literal('')).transform(v => v || null),
  // enums:
  status: z.enum(['Active', 'Completed', 'Cancelled']),
  // optional foreign keys (uuid):
  clinicId: z.string().uuid().nullable().or(z.literal('')).transform(v => v || null),
})

export type <Feature>FormData = z.infer<typeof <feature>Schema>
```

---

## 3. API module — `src/api/modules/<feature>.api.ts`

**Variant A — paged list** (mirror `patients.api.ts`):

```ts
import { apiClient } from '@/api/client'
import type {
  <Feature>Response, PagedResult,
  Create<Feature>Request, Update<Feature>Request,
} from '@/types/<feature>.types'

const BASE = '/api/v1/<plural>'

export const <feature>sApi = {
  list: (page = 1, pageSize = 20) =>
    apiClient.get<PagedResult<<Feature>Response>>(BASE, { params: { page, pageSize } }).then(r => r.data),
  getById: (id: string) =>
    apiClient.get<<Feature>Response>(`${BASE}/${id}`).then(r => r.data),
  create: (data: Create<Feature>Request) =>
    apiClient.post<<Feature>Response>(BASE, data).then(r => r.data),
  update: (id: string, data: Update<Feature>Request) =>
    apiClient.put<<Feature>Response>(`${BASE}/${id}`, data).then(r => r.data),
  deactivate: (id: string) =>
    apiClient.delete<void>(`${BASE}/${id}`).then(r => r.data),
}
```

**Variant B — full list** (mirror `clinics.api.ts`): same shape, but
`getAll: () => apiClient.get<<Feature>Response[]>(BASE).then(r => r.data)` instead of `list`.

---

## 4. Hook — `src/hooks/<feature>/use<Feature>s.ts`

**Variant A — paged** (mirror `usePatients.ts`):

```ts
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { <feature>sApi } from '@/api/modules/<feature>.api'
import type { Create<Feature>Request, Update<Feature>Request } from '@/types/<feature>.types'

export const <feature>Keys = {
  all: ['<plural>'] as const,
  list: (page: number, pageSize: number) => [...<feature>Keys.all, 'list', page, pageSize] as const,
  detail: (id: string) => [...<feature>Keys.all, 'detail', id] as const,
}

export function use<Feature>s(page: number, pageSize = 20) {
  return useQuery({
    queryKey: <feature>Keys.list(page, pageSize),
    queryFn: () => <feature>sApi.list(page, pageSize),
    placeholderData: keepPreviousData,
  })
}

export function use<Feature>(id: string) {
  return useQuery({
    queryKey: <feature>Keys.detail(id),
    queryFn: () => <feature>sApi.getById(id),
    enabled: !!id,
  })
}

export function useCreate<Feature>() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Create<Feature>Request) => <feature>sApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: <feature>Keys.all }),
  })
}

export function useUpdate<Feature>(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Update<Feature>Request) => <feature>sApi.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(<feature>Keys.detail(id), updated)
      qc.invalidateQueries({ queryKey: <feature>Keys.all })
    },
  })
}

export function useDeactivate<Feature>() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => <feature>sApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: <feature>Keys.all }),
  })
}
```

**Variant B — full list** (mirror `useClinics.ts`): drop the `page`/`pageSize` + `keepPreviousData`;
`list: () => [...keys.all, 'list']`; `use<Feature>s` calls `<feature>sApi.getAll`; invalidate
`<feature>Keys.list()`.

---

## 5. Page — `src/pages/<feature>/<Feature>sPage.tsx`

Do **not** copy a template blindly here — open the current
`src/pages/patients/PatientsPage.tsx` and adapt it, because it shows the live component APIs.
The structure to follow:

- `<PageHeader title description action={<Button onPress={…}>…</Button>} />`
- Loading → skeleton (`animate-pulse` blocks). Empty → `<TableCard.Root>` empty state. Else → `<Table>`.
- `<Table selectionMode="none" aria-label="…">` with `Table.Header`/`Table.Head`, `Table.Body`/`Table.Row`/`Table.Cell`.
- Create/edit form in a `<SlideOver open onClose title>`, built with `useForm` + `zodResolver` + `<Controller>` per field (use `@/components/base/*` inputs: `Input`, `Select`, etc.).
- Destructive actions go through `<ConfirmDialog open title description confirmLabel loading onConfirm onCancel>`.
- Mutations called via `mutateAsync`; close the SlideOver/dialog on success.
- Paged variant: render Previous/Next using `data.hasPreviousPage` / `data.hasNextPage` and `setPage`.

Key component prop reminders (from the real code):
`<Button onPress color size isDisabled type>` (note **`onPress`**, not `onClick`);
`<Input label isInvalid hint value onChange onBlur placeholder type>`;
`<Select label selectedKey onSelectionChange items>{item => <Select.Item id={item.id}>{item.label}</Select.Item>}</Select>`.

---

## 6. Route — `src/App.tsx`

Import the page, then add a route under the correct guard:

```tsx
// all roles — directly under AppLayout's children:
{ path: '/<plural>', element: <<Feature>sPage /> },
{ path: '/<plural>/:id', element: <<Feature>DetailPage /> },   // if there's a detail page

// staff only (no Sponsor):
{ element: <RequireRole roles={STAFF_ONLY} />, children: [ { path: '/<plural>', element: <<Feature>sPage /> } ] },

// admin/owner only:
{ element: <RequireRole roles={ADMIN_ABOVE} />, children: [ { path: '/<plural>', element: <<Feature>sPage /> } ] },
```

## 7. Nav — `src/lib/constants.ts`

Add to `NAV_ITEMS` with `roles` that **match the route guard** and a valid `icon`:

```ts
{ label: '<Feature>s', path: '/<plural>', roles: ALL_ROLES /* or STAFF_ONLY / ADMIN_ABOVE */, icon: 'chart' },
```
