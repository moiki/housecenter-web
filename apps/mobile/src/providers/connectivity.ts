import NetInfo from '@react-native-community/netinfo'
import { AppState, Platform, type AppStateStatus } from 'react-native'
import { onlineManager, focusManager } from '@tanstack/react-query'

// RN has no `window` `online`/`focus` events — TanStack Query's browser-oriented online/focus
// detection no-ops on native. Bridge NetInfo -> onlineManager and AppState -> focusManager so
// reads reflect offline state and refetch-on-foreground works. Call once at bootstrap
// (AppProviders' useEffect).
export function initConnectivity() {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
  )

  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active')
  })

  return () => subscription.remove()
}
