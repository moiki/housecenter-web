import { MMKV } from 'react-native-mmkv'
import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'

// Encrypted store for the offline READ cache (may contain PHI at rest). The `encryptionKey` is
// generated once via `expo-crypto` and persisted in SecureStore (Keychain/Keystore-backed) —
// never a static literal — so the MMKV instance can only be constructed asynchronously. Lazy/
// promise-gated memoized singleton mirrors core's `getApiClient()`/`getAuthStore()` registry
// pattern (design.md D4): no top-level `new MMKV(...)` remains anywhere in this file (R6).
const CACHE_KEY_NAME = 'hc_cache_key'

let instance: MMKV | null = null
let ready: Promise<MMKV> | null = null

// Read-or-create the cache encryption key, then construct the MMKV instance once. Idempotent:
// subsequent calls before resolution return the same in-flight promise (no duplicate
// SecureStore writes, no duplicate MMKV construction). `persister.ts` awaits this before every
// op; no AuthBootstrap-level render gate is needed for the cache (PersistQueryClientProvider
// simply waits for the persister to resolve — see design.md D4 rationale).
export function getCacheStorage(): Promise<MMKV> {
  if (!ready) {
    ready = (async () => {
      let key = await SecureStore.getItemAsync(CACHE_KEY_NAME)
      if (!key) {
        key = Crypto.randomUUID()
        await SecureStore.setItemAsync(CACHE_KEY_NAME, key)
      }
      instance = new MMKV({ id: 'housecenter-cache', encryptionKey: key })
      return instance
    })()
  }
  return ready
}

// Sync PHI wipe for logout/forced-logout (design.md D8, task 3.8) — no-op if the cache was
// never constructed (e.g. a forced logout before any query ever persisted).
export function clearCache(): void {
  instance?.clearAll()
}
