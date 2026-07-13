import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { getCacheStorage } from './mmkv'

// AsyncStorage-shaped adapter over the lazy/promise-gated MMKV instance (design.md D4) — each
// method awaits `getCacheStorage()` before touching MMKV, so persistence transparently waits for
// the SecureStore-sourced `encryptionKey` to resolve on first use. `createAsyncStoragePersister`'s
// adapter contract is already async-native, so this await is invisible to
// `PersistQueryClientProvider` — it just waits a beat longer before restoring/hydrating.
const mmkvStorage = {
  getItem: async (key: string) => (await getCacheStorage()).getString(key) ?? null,
  setItem: async (key: string, value: string) => {
    ;(await getCacheStorage()).set(key, value)
  },
  removeItem: async (key: string) => {
    ;(await getCacheStorage()).delete(key)
  },
}

export const persister = createAsyncStoragePersister({
  storage: mmkvStorage,
  key: 'housecenter-query-cache',
})
