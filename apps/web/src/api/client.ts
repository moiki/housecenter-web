import { createApiClient } from 'core/api/http/createApiClient'
import { setApiClient } from 'core/api/http/registry'
import type { TokenStore } from 'core/auth/storage'
import { useAuthStore } from '@/store/auth.store'
import { getOrCreateDeviceId } from '@/lib/deviceId'

const tokenStore: TokenStore = {
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (accessToken, refreshToken) => useAuthStore.getState().setTokens(accessToken, refreshToken),
  clear: () => useAuthStore.getState().logout(),
}

// All 15 api modules now read the client via `getApiClient()` (core/api/http/registry) —
// no consumer needs a concrete export of this instance, so it stays module-local.
const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  tokenStore,
  deviceIdProvider: getOrCreateDeviceId,
  onRefreshFail: () => {
    window.location.href = '/login'
  },
})
setApiClient(apiClient)
