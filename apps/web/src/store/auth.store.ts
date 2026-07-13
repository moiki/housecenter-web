import { createAuthStore } from 'core/auth/createAuthStore'
import { setAuthStore } from 'core/auth/registry'
import type { AuthStorage } from 'core/auth/storage'

const localStorageAdapter: AuthStorage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
}

export const useAuthStore = createAuthStore({ storage: localStorageAdapter })
setAuthStore(useAuthStore) // core hooks read via getAuthStore()
