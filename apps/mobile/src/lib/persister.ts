import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { cacheStorage } from './mmkv'

// AsyncStorage-shaped adapter over the synchronous MMKV instance — MMKV's `getString`/`set`/
// `delete` are sync, but `AsyncStorage`'s contract allows a `MaybePromise` return, so wrapping
// in `Promise.resolve()` satisfies the interface without changing MMKV's sync perf characteristics.
const mmkvStorage = {
  getItem: (key: string) => Promise.resolve(cacheStorage.getString(key) ?? null),
  setItem: (key: string, value: string) => {
    cacheStorage.set(key, value)
    return Promise.resolve()
  },
  removeItem: (key: string) => {
    cacheStorage.delete(key)
    return Promise.resolve()
  },
}

export const persister = createAsyncStoragePersister({
  storage: mmkvStorage,
  key: 'housecenter-query-cache',
})
