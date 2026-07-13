import { Image } from 'expo-image'
import { clearCache } from './mmkv'
import { queryClient } from './queryClient'

// Single shared cache-teardown routine (design.md D1, R1) — the ONLY code path any of the 3
// auth-teardown sites (MoreScreen manual logout, api/client.ts's onRefreshFail, AuthBootstrap's
// cold-start silent-refresh-failure catch) may use to clear local caches. Cache-only: does NOT
// touch tokens/auth state — `logout()`/`tokenStore.clear()` (core) stay separate and are called
// alongside this, never replaced by it. Clears 3 surfaces that sit outside SecureStore/token
// state: the encrypted MMKV query-cache blob, the in-memory QueryClient, and expo-image's
// disk+memory cache of viewed patient/consultation photos (the gap this change closes — never
// cleared anywhere before).
//
// No circular import: this file imports only `./mmkv` + `./queryClient` + `expo-image` — none of
// those (nor anything they import) imports this file or `../api/client` back.
export async function clearAllLocalData(): Promise<void> {
  clearCache()
  queryClient.clear()
  try {
    Image.clearMemoryCache()
    await Image.clearDiskCache()
  } catch {
    // best-effort — a failed disk-cache clear must never block/crash a logout teardown
  }
}
