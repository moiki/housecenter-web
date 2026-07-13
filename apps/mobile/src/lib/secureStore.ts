import * as SecureStore from 'expo-secure-store'
import type { AuthStorage } from 'core/auth/storage'

// Async AuthStorage adapter for `createAuthStore` — the refresh token is persisted in
// SecureStore (Keychain/Keystore-backed), never AsyncStorage/MMKV. `getItemAsync` returns
// a Promise, so `createAuthStore` takes the async-hydrate branch (`authHydrated` starts
// `false`, flips `true` once resolved) — mirrors web's sync `localStorage` adapter
// (`apps/web/src/store/auth.store.ts`), just on the async side of the same interface.
export const secureStoreAuthStorage: AuthStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
}
