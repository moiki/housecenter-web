import { QueryClient } from '@tanstack/react-query'
// VALUE import (not just a type) from `core` — this is what proves Metro's package-exports
// resolver actually resolves `core`'s raw-TS wildcard subpaths at bundle time (see `expo export`
// gate below), not just at `tsc` time.
import { queryClient as coreQueryClient } from 'core/lib/queryClient'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Single source of truth: mirrors core/lib/queryClient's staleTime 30_000 / retry 1 /
      // refetchOnWindowFocus false — never hand-copied, so it can't drift from core's defaults.
      ...coreQueryClient.getDefaultOptions().queries,
      // Local-only addition: persistence requires gcTime >= the persister's `maxAge` (24h in
      // AppProviders), or restored entries get garbage-collected before they're read back.
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
})
