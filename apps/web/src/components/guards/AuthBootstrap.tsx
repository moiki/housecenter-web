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
 */
export function AuthBootstrap({ children }: Props) {
  const { refreshToken, accessToken, setAuth, logout } = useAuthStore()
  const [ready, setReady] = useState(!!accessToken || !refreshToken)

  useEffect(() => {
    if (ready) return

    authApi
      .refresh({ refreshToken: refreshToken! })
      .then(async (tokens) => {
        // Store tokens before calling me() so the request interceptor picks them up
        useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken)
        const user = await authApi.me()
        setAuth(user, tokens.accessToken, tokens.refreshToken)
        if (user.darkMode) document.documentElement.classList.add('dark-mode')
      })
      .catch(() => logout())
      .finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
