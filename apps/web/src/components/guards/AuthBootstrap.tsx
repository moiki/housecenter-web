import { useEffect, useState } from 'react'
import { authApi } from 'core/api/modules/auth.api'
import { useAuthStore } from '@/store/auth.store'

interface Props {
  children: React.ReactNode
}

/**
 * On page load: if we have a refreshToken but no accessToken (tab was closed/reloaded),
 * attempt a silent refresh before rendering the app. This gives the user a seamless
 * experience — they don't get bounced to /login just because they refreshed the page.
 *
 * Readiness is gated on `authHydrated` (tri-state — see core/auth/createAuthStore.ts) instead
 * of the raw `!!accessToken || !refreshToken` check. On web, `storage.getItem` (localStorage)
 * resolves synchronously, so `authHydrated` is already `true` at first render — `needsSilentRefresh`
 * and `ready` below are pure derivations of that render-time state, so this is byte-identical to
 * the previous behavior. On an async storage adapter (mobile SecureStore), `authHydrated` starts
 * `false` and both derivations wait for it before deciding.
 *
 * `ready` is intentionally a derived value (not a `useState` seeded/flipped synchronously inside
 * an effect) — the only state this component owns, `refreshAttempted`, is flipped exclusively
 * from the `.finally()` of the async refresh call, never synchronously in the effect body.
 */
export function AuthBootstrap({ children }: Props) {
  const { authHydrated, refreshToken, accessToken, user, setAuth, logout } = useAuthStore()
  const [refreshAttempted, setRefreshAttempted] = useState(false)

  const needsSilentRefresh = authHydrated && !accessToken && !!refreshToken
  const ready = authHydrated && (!needsSilentRefresh || refreshAttempted)

  useEffect(() => {
    if (!needsSilentRefresh || refreshAttempted) return

    authApi
      .refresh({ refreshToken: refreshToken! })
      .then(async (tokens) => {
        // Store tokens before calling me() so the request interceptor picks them up
        useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken)
        const user = await authApi.me()
        setAuth(user, tokens.accessToken, tokens.refreshToken)
      })
      .catch(() => logout())
      .finally(() => setRefreshAttempted(true))
  }, [needsSilentRefresh, refreshAttempted, refreshToken, setAuth, logout])

  // Single owner of the dark-mode DOM side effect (consolidated out of `useMe` — see design D6).
  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', !!user?.darkMode)
  }, [user?.darkMode])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
