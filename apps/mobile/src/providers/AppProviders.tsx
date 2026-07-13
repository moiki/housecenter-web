import { useEffect, type ReactNode } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { I18nextProvider } from 'react-i18next'
import { NavigationContainer } from '@react-navigation/native'
import { usePreventScreenCapture } from 'expo-screen-capture'
import { queryClient } from '../lib/queryClient'
import { persister } from '../lib/persister'
import i18n from '../i18n'
import { initConnectivity } from './connectivity'
import { AuthBootstrap } from '../components/AuthBootstrap'
import { PushBootstrap } from '../components/PushBootstrap'
import { navigationRef } from '../navigation/navigationRef'

// Provider tree per design.md:
//   SafeAreaProvider
//   └── PersistQueryClientProvider (client=queryClient, persistOptions={persister, maxAge:24h})
//       └── I18nextProvider (i18n)
//           └── NavigationContainer (ref={navigationRef})
//               ├── AuthBootstrap (render gate: deviceIdReady && authHydrated && ...)
//               │   └── {children}  ← RootNavigator
//               └── PushBootstrap (PR2b, D2 — non-visual, self-gated on user != null)
// `PushBootstrap` MUST be mounted AFTER `AuthBootstrap` in JSX order, not before — its cold-start
// one-shot effect (design.md D4) checks `navigationRef.isReady()`, and React commits a sibling's
// effects in JSX order, so `AuthBootstrap`'s subtree (RootNavigator -> the Tab/Stack navigators
// that flip `isReady()` true) commits before `PushBootstrap`'s own effects run.
export function AppProviders({ children }: { children: ReactNode }) {
  // App-wide screenshot/recording prevention (design.md D2, R2): mounted once, unconditionally,
  // at the app root — active across 100% of screens, not gated by auth state or route. Android
  // FLAG_SECURE / iOS secure overlay are handled natively by the hook; no config plugin needed.
  usePreventScreenCapture()

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
          <NavigationContainer ref={navigationRef}>
            <AuthBootstrap>{children}</AuthBootstrap>
            <PushBootstrap />
          </NavigationContainer>
        </I18nextProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  )
}
