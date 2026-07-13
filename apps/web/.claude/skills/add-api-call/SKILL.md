---
name: add-api-call
description: Add a single backend endpoint to an EXISTING api module in housecenter-web and expose it through a TanStack Query hook, following the project's transport + query-key-factory + cache-invalidation conventions. Use when wiring up one new endpoint/route/action on a module that already exists, e.g. "add a search endpoint to patients", "expose the archive treatment call", "add a mutation for reactivating a clinic", "call the new /export route". For a brand-new entity with no existing module, use add-feature-slice instead.
argument-hint: [feature] [what the endpoint does]
---

# Add one API call + hook

Extend an existing slice with a single endpoint. Touch exactly two layers — the api module
and its hook — and never break the layer boundaries.

## Steps

1. **Read the existing pair** for the feature first: `src/api/modules/<feature>.api.ts` and
   `src/hooks/<feature>/use<Feature>s.ts`. Copy the surrounding style exactly.
2. **Confirm the contract**: HTTP verb, path (relative to the module's `BASE`), request body
   type, and response type. Verify the path against `housecenter-api` — do not guess. Add or
   reuse request/response types in `src/types/<feature>.types.ts`.
3. **Add the transport function** to the api module object — a single line:
   ```ts
   archive: (id: string) => apiClient.post<<Feature>Response>(`${BASE}/${id}/archive`).then(r => r.data),
   ```
   No React, no try/catch, no caching here.
4. **Expose it through a hook** in the hook file:
   - **Read (GET)** → `useQuery`. Add a key to the existing `<feature>Keys` factory; pass
     `enabled: !!id` for id-dependent queries.
     ```ts
     export const <feature>Keys = { /* …existing… */, search: (q: string) => [...<feature>Keys.all, 'search', q] as const }
     export function use<Feature>Search(q: string) {
       return useQuery({ queryKey: <feature>Keys.search(q), queryFn: () => <feature>sApi.search(q), enabled: !!q })
     }
     ```
   - **Write (POST/PUT/PATCH/DELETE)** → `useMutation`, and invalidate affected keys in
     `onSuccess`. Use `invalidateQueries({ queryKey: <feature>Keys.all })` for broad refresh;
     add `setQueryData(<feature>Keys.detail(id), updated)` when the response is the updated entity.
     ```ts
     export function useArchive<Feature>() {
       const qc = useQueryClient()
       return useMutation({
         mutationFn: (id: string) => <feature>sApi.archive(id),
         onSuccess: () => qc.invalidateQueries({ queryKey: <feature>Keys.all }),
       })
     }
     ```

## Rules

- **Never call the new endpoint from a page directly** — pages consume the hook, not `apiClient`.
- **Reuse the existing `<feature>Keys` factory**; don't hardcode array literals in `queryKey`.
- **Mutations must invalidate** (or `setQueryData`) so the UI reflects the change — a mutation
  with no cache update is a bug here.
- Match the module's existing `.then(r => r.data)` style and `BASE` prefix.

## After

Run `pnpm build` and `pnpm lint`. Report the two files changed and any backend assumptions made.
