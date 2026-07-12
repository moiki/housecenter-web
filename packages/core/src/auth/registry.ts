import type { AuthStoreInstance } from 'core/auth/createAuthStore'

// Module-scope indirection so core hooks (e.g. useMe) can read auth state without
// importing a concrete Zustand instance. Web wires this first in `bootstrap.ts`,
// before the api client (see registry.ts in api/http — setApiClient depends on it).
let store: AuthStoreInstance | null = null

export function setAuthStore(instance: AuthStoreInstance): void {
  store = instance
}

export function getAuthStore(): AuthStoreInstance {
  if (!store) {
    throw new Error('getAuthStore() called before setAuthStore() — check bootstrap order.')
  }
  return store
}
