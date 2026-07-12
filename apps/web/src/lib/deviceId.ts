const DEVICE_ID_KEY = 'hc_device_id'

/**
 * Stable, per-browser UUID persisted in localStorage. Identifies this device across
 * sessions for the API's device-bound-sessions feature — threaded through login/signup/
 * refresh payloads (see core/types/auth.types.ts) and `createApiClient`'s
 * `deviceIdProvider` (used for the internal `/auth/refresh` call on 401).
 */
export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}
