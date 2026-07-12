import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type { UserResponse } from 'core/types/auth.types'
import type { AuthStorage } from 'core/auth/storage'

const REFRESH_KEY = 'hc_rt'

export interface AuthState {
  user: UserResponse | null
  // refreshToken lives in `storage` so it survives page reloads.
  // Access token stays in memory only (security).
  accessToken: string | null
  refreshToken: string | null
  // False until hydrate() resolves (or resolves synchronously for a sync storage
  // adapter like localStorage — see the sync/async branch below).
  authHydrated: boolean
  hydrate: () => Promise<void>
  // Call this immediately after login/refresh to unblock the /auth/me call.
  // The request interceptor reads accessToken from the store on every request —
  // it must be set before any authenticated request fires, not after /auth/me returns.
  setTokens: (accessToken: string, refreshToken: string) => void
  setAuth: (user: UserResponse, accessToken: string, refreshToken: string) => void
  updateUser: (user: UserResponse) => void
  logout: () => void
}

export type AuthStoreInstance = UseBoundStore<StoreApi<AuthState>>

export function createAuthStore({ storage }: { storage: AuthStorage }): AuthStoreInstance {
  return create<AuthState>((set) => {
    const initial = storage.getItem(REFRESH_KEY) // string|null (web) OR Promise (mobile)
    const sync = !(initial instanceof Promise)
    if (!sync) {
      initial.then((rt) => set({ refreshToken: rt, authHydrated: true }))
    }

    return {
      user: null,
      accessToken: null,
      refreshToken: sync ? (initial as string | null) : null,
      authHydrated: sync, // web (sync localStorage): true at first paint
      hydrate: async () => {
        const rt = await storage.getItem(REFRESH_KEY)
        set({ refreshToken: rt, authHydrated: true })
      },
      setTokens: (accessToken, refreshToken) => {
        storage.setItem(REFRESH_KEY, refreshToken)
        set({ accessToken, refreshToken })
      },
      setAuth: (user, accessToken, refreshToken) => {
        storage.setItem(REFRESH_KEY, refreshToken)
        set({ user, accessToken, refreshToken })
      },
      updateUser: (user) => set({ user }),
      logout: () => {
        storage.removeItem(REFRESH_KEY)
        set({ user: null, accessToken: null, refreshToken: null })
      },
    }
  })
}
