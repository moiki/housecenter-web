import { createAuthStore } from 'core/auth/createAuthStore'
import { setAuthStore } from 'core/auth/registry'
import { secureStoreAuthStorage } from '../lib/secureStore'

// 1:1 mirror of apps/web/src/store/auth.store.ts, swapping the sync localStorage
// adapter for the async SecureStore one — createAuthStore's sync/async branch handles
// the rest (see core/auth/createAuthStore.ts).
export const useAuthStore = createAuthStore({ storage: secureStoreAuthStorage })
setAuthStore(useAuthStore) // core hooks (useMe, useLogout, ...) read via getAuthStore()
