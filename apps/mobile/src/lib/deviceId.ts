import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'

// SEPARATE SecureStore key from the refresh token (`hc_rt`, cleared by
// createAuthStore.logout()) — untouched by logout, so the same (userId, deviceId)
// session row is reused across a logout/re-login, never orphaning device sessions.
const DEVICE_ID_KEY = 'hc_device_id'

let cached: string | null = null
let ready: Promise<void> | null = null

// Read-or-create the device UUID once at bootstrap. Idempotent: subsequent calls before
// resolution return the same in-flight promise (no duplicate SecureStore writes).
export function initDeviceId(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      let id = await SecureStore.getItemAsync(DEVICE_ID_KEY)
      if (!id) {
        id = Crypto.randomUUID()
        await SecureStore.setItemAsync(DEVICE_ID_KEY, id)
      }
      cached = id
    })()
  }
  return ready
}

// Signal for the AuthBootstrap render gate — resolves once `initDeviceId()` has cached a value.
export function whenDeviceIdReady(): Promise<void> {
  return ready ?? initDeviceId()
}

// SYNC getter feeding `createApiClient`'s `deviceIdProvider: () => string` contract.
// NEVER wire `deviceIdProvider` directly to `SecureStore.getItemAsync` — that returns a
// Promise, which stringifies to `"[object Promise]"` in the refresh body and silently
// breaks the device binding (see design.md D3).
export function getDeviceId(): string {
  if (!cached) {
    throw new Error('getDeviceId() called before deviceIdReady — check the bootstrap/AuthBootstrap gate.')
  }
  return cached
}
