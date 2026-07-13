import * as SecureStore from 'expo-secure-store'

// Cached last-registered push token (design.md D2/D6, CRITICAL IMPL NOTE #3). SecureStore-backed,
// mirroring `deviceId.ts`'s storage choice — unlike `deviceId.ts`, there is no synchronous
// consumer (no `deviceIdProvider`-style contract needs this at import time), so every accessor
// here is async; a lazy in-memory cache avoids a redundant SecureStore read on every call.
// NEVER log the raw token value (design.md CRITICAL IMPL NOTE #7) — it is device-identifying.
const PUSH_TOKEN_KEY = 'hc_push_token'

let cached: string | null | undefined // undefined = not yet loaded from SecureStore
let loading: Promise<string | null> | null = null

function load(): Promise<string | null> {
  if (cached !== undefined) return Promise.resolve(cached)
  if (!loading) {
    loading = SecureStore.getItemAsync(PUSH_TOKEN_KEY).then((value) => {
      cached = value
      return cached
    })
  }
  return loading
}

// Used by `PushBootstrap`'s shared cache-compare function (design.md D2 step 4) before every
// `subscribePush` call — on both the initial registration effect and the token-rotation listener.
export function getCachedPushToken(): Promise<string | null> {
  return load()
}

export async function setCachedPushToken(token: string): Promise<void> {
  cached = token
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token)
}

// Called from `MoreScreen.onLogout()` (design.md D3) after a best-effort `unsubscribePush` —
// the session survives revoke-all, so `DevicesScreen.confirmRevokeAll()` does NOT clear this.
export async function clearCachedPushToken(): Promise<void> {
  cached = null
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY)
}
