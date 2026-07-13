import { createApiClient } from 'core/api/http/createApiClient'
import { setApiClient } from 'core/api/http/registry'
import type { TokenStore } from 'core/auth/storage'
import { useAuthStore } from '../store/auth.store'
import { getDeviceId } from '../lib/deviceId'
import { clearAllLocalData } from '../lib/teardown'
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
    // Full PHI teardown on a forced logout (design.md D1, R1): routed through the single shared
    // `clearAllLocalData()` helper (MMKV cache + query cache + expo-image cache) — never inlined
    // separately, so this site can't drift from the other 2 teardown sites.
    void clearAllLocalData()
  },
})
setApiClient(apiClient)
