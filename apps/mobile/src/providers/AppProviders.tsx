import { useEffect, type ReactNode } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { I18nextProvider } from 'react-i18next'
import { NavigationContainer } from '@react-navigation/native'
import { queryClient } from '../lib/queryClient'
import { persister } from '../lib/persister'
import i18n from '../i18n'
import { initConnectivity } from './connectivity'
import { AuthBootstrap } from '../components/AuthBootstrap'

// Provider tree per design.md:
//   SafeAreaProvider
//   └── PersistQueryClientProvider (client=queryClient, persistOptions={persister, maxAge:24h})
//       └── I18nextProvider (i18n)
//           └── NavigationContainer
//               └── AuthBootstrap (render gate: deviceIdReady && authHydrated && ...)
//                   └── {children}  ← RootNavigator
export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Runs once at bootstrap: NetInfo -> onlineManager, AppState -> focusManager.
    const cleanup = initConnectivity()
    return cleanup
  }, [])

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
      >
        <I18nextProvider i18n={i18n}>
          <NavigationContainer>
            <AuthBootstrap>{children}</AuthBootstrap>
          </NavigationContainer>
        </I18nextProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  )
}
