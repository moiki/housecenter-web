import { useEffect, useState } from 'react'
import i18n from 'i18next'
import { authApi } from 'core/api/modules/auth.api'
import { useAuthStore } from '@/store/auth.store'
import { getOrCreateDeviceId } from '@/lib/deviceId'

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
 * resolves synchronously, so `authHydrated` is already `true` at first render.
 *
 * `ready` used to be `authHydrated && (!needsSilentRefresh || refreshAttempted)`, with
 * `needsSilentRefresh` recomputed fresh every render — no separate in-flight flag. That was
 * wrong. Storing the new access token (below) happens BEFORE `await authApi.me()` resolves, on
 * purpose, so the request interceptor picks it up — but `useAuthStore.getState().setTokens(...)`
 * is a Zustand `set()` that notifies subscribers immediately, re-rendering this component with
 * `accessToken` now truthy. A live `needsSilentRefresh` derived from `accessToken` flips to
 * `false` right then, `refreshAttempted` is still `false`, so `ready` flipped to `true` while
 * `user` was STILL `null` (the `/auth/me` call hadn't resolved yet). `RequireAuth` saw
 * `ready=true, user=null` and redirected to `/login`, moments before the silent refresh would
 * have succeeded. This was not timing-flaky — it happened on every reload, since there is
 * always at least one microtask between the token write and `/auth/me` resolving.
 *
 * `refreshWasNeeded` closes that window by capturing the answer ONCE, via `useState`'s lazy
 * initializer, instead of recomputing it live from `accessToken` on every render — so it can't
 * flip mid-flow just because the token got written early. (A `useRef` mutated during render
 * would do the same job, but this project's lint config — react-hooks/refs — forbids reading or
 * writing `ref.current` outside an effect/handler, so the lazy-`useState` capture is the
 * sanctioned equivalent here.) On web this is accurate because `authHydrated` is already `true`
 * on the very first render, so the very first computation is the right one to freeze.
 */
export function AuthBootstrap({ children }: Props) {
  const { authHydrated, refreshToken, accessToken, user, setAuth, logout } = useAuthStore()
  const [refreshAttempted, setRefreshAttempted] = useState(false)
  const [refreshWasNeeded] = useState(() => authHydrated && !accessToken && !!refreshToken)

  const needsSilentRefresh = authHydrated && !accessToken && !!refreshToken
  const ready = authHydrated && (!refreshWasNeeded || refreshAttempted)

  useEffect(() => {
    if (!needsSilentRefresh || refreshAttempted) return

    authApi
      .refresh({ refreshToken: refreshToken!, deviceId: getOrCreateDeviceId() })
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

  // Single owner of `i18n.changeLanguage()` — see `src/i18n/index.ts`'s comment for why a
  // second call site with its own fallback logic is the exact bug class to avoid (it's what
  // happened with dark mode's now-removed OS-preference fallback). Pre-auth (`user` null),
  // i18next already has the browser-locale `lng` it was initialized with; this effect only
  // takes over once a real server preference exists.
  useEffect(() => {
    if (user?.language) void i18n.changeLanguage(user.language.toLowerCase())
  }, [user?.language])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
