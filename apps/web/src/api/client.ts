import { createApiClient } from 'core/api/http/createApiClient'
import { setApiClient } from 'core/api/http/registry'
import type { TokenStore } from 'core/auth/storage'
import { useAuthStore } from '@/store/auth.store'

// Simplest-form UUID persisted in localStorage. Fully wired end-to-end (login/signup
// payloads, deviceName/platform) in PR4 — for PR1 this just needs to exist so
// createApiClient's internal refresh call can send a stable deviceId.
const DEVICE_ID_KEY = 'hc_device_id'
function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

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
  deviceIdProvider: getDeviceId,
  onRefreshFail: () => {
    window.location.href = '/login'
  },
})
setApiClient(apiClient)
