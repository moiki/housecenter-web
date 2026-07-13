import { create } from 'zustand'
import type { UserResponse } from '@/types/auth.types'

const REFRESH_KEY = 'hc_rt'

interface AuthState {
  user: UserResponse | null
  accessToken: string | null
  // refreshToken lives in localStorage so it survives page reloads.
  // Access token stays in memory only (cleared on tab close).
  refreshToken: string | null
  // Call this immediately after login/refresh to unblock the /auth/me call.
  // The request interceptor reads accessToken from the store — it must be set
  // before any authenticated request fires, not after /auth/me returns.
  setTokens: (accessToken: string, refreshToken: string) => void
  setAuth: (user: UserResponse, accessToken: string, refreshToken: string) => void
  updateUser: (user: UserResponse) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: localStorage.getItem(REFRESH_KEY),
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem(REFRESH_KEY, refreshToken)
    set({ accessToken, refreshToken })
  },
  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem(REFRESH_KEY, refreshToken)
    set({ user, accessToken, refreshToken })
  },
  updateUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem(REFRESH_KEY)
    set({ user: null, accessToken: null, refreshToken: null })
  },
}))
