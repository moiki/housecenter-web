import { createApiClient } from 'core/api/http/createApiClient'
import { setApiClient } from 'core/api/http/registry'
import type { TokenStore } from 'core/auth/storage'
import { useAuthStore } from '../store/auth.store'
import { getDeviceId } from '../lib/deviceId'
import { queryClient } from '../lib/queryClient'
import { clearCache } from '../lib/mmkv'
import { env } from '../config/env'

const tokenStore: TokenStore = {
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (accessToken, refreshToken) => useAuthStore.getState().setTokens(accessToken, refreshToken),
  clear: () => useAuthStore.getState().logout(),
}

// All core api modules read the client via `getApiClient()` (core/api/http/registry) —
// no consumer needs a concrete export of this instance, so it stays module-local
// (mirrors apps/web/src/api/client.ts).
const apiClient = createApiClient({
  baseURL: env.API_BASE_URL,
  tokenStore,
  deviceIdProvider: getDeviceId, // sync — see lib/deviceId.ts
  onRefreshFail: () => {
    // `tokenStore.clear()` (called just above, inside createApiClient, before this fires)
    // already flipped `user` to null — RootNavigator's v7 conditional screens declaratively
    // switch to Login, so no navigation ref / imperative reset is needed here (design.md D6/D7).
    // Full PHI teardown on a forced logout (task 3.8): drop the in-memory query cache AND wipe
    // the on-disk MMKV blob — `clearCache()` now exists (MMKV migration, this PR); PR2 left this
    // as `queryClient.clear()`-only because `lib/mmkv.ts` didn't export it yet.
    clearCache()
    queryClient.clear()
  },
})
setApiClient(apiClient)
