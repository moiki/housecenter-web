import { useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { authApi } from 'core/api/modules/auth.api'
import { useAuthStore } from '../store/auth.store'
import { getDeviceId, whenDeviceIdReady } from '../lib/deviceId'

interface Props {
  children: ReactNode
}

/**
 * Mirrors web's `AuthBootstrap` (apps/web/src/components/guards/AuthBootstrap.tsx) plus a
 * mobile-only `deviceIdReady` gate: SecureStore's async read means `authHydrated` (core)
 * ALSO starts `false` here (unlike web's sync localStorage), and the silent-refresh call
 * needs `getDeviceId()` populated, so its effect is separately guarded on `deviceIdReady`
 * too (design.md D5). Renders an `ActivityIndicator` while not ready; mounted in
 * `AppProviders` wrapping `NavigationContainer`'s children (`RootNavigator`).
 */
export function AuthBootstrap({ children }: Props) {
  const { authHydrated, accessToken, refreshToken, setAuth, logout } = useAuthStore()
  const [deviceIdReady, setDeviceIdReady] = useState(false)
  const [refreshAttempted, setRefreshAttempted] = useState(false)

  useEffect(() => {
    whenDeviceIdReady().then(() => setDeviceIdReady(true))
  }, [])

  const needsSilentRefresh = authHydrated && !accessToken && !!refreshToken
  const ready = deviceIdReady && authHydrated && (!needsSilentRefresh || refreshAttempted)

  useEffect(() => {
    if (!deviceIdReady || !needsSilentRefresh || refreshAttempted) return

    authApi
      .refresh({ refreshToken: refreshToken!, deviceId: getDeviceId() })
      .then(async (tokens) => {
        // Store tokens before calling me() so the request interceptor picks them up.
        useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken)
        const user = await authApi.me()
        setAuth(user, tokens.accessToken, tokens.refreshToken)
      })
      .catch(() => logout())
      .finally(() => setRefreshAttempted(true))
  }, [deviceIdReady, needsSilentRefresh, refreshAttempted, refreshToken, setAuth, logout])

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  return <>{children}</>
}
