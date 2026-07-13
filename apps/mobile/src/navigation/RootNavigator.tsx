import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { NavigatorScreenParams } from '@react-navigation/native'
import { TabNavigator } from './TabNavigator'
import type { TabParamList } from './TabNavigator'
import { LoginScreen } from '../screens/auth/LoginScreen'
import { useAuthStore } from '../store/auth.store'

// Root param list (design.md D1): exported next to the navigator it types, mirroring
// `PatientsStackParamList`/`ConsultationsStackParamList`'s co-located convention. Consumed by
// `navigationRef.ts`'s `createNavigationContainerRef<RootStackParamList>()` (PR2a) for the app's
// first cross-tab imperative navigation (wired by PR2b).
export type RootStackParamList = {
  Login: undefined
  Tabs: NavigatorScreenParams<TabParamList>
}

const Stack = createNativeStackNavigator<RootStackParamList>()

// React Navigation v7 conditional screens (design.md D6): the rendered screen SET changes
// with auth state — `Login` while `user == null`, else `Tabs`. This is the documented v7
// idiom for auth flows: switching the screen set auto-resets navigation history and
// animates, so login/logout flip the nav for free — no imperative `navigation.reset()`
// call to forget. headerShown:false — the tab bar/screens own their own chrome.
export function RootNavigator() {
  const user = useAuthStore((s) => s.user)

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user == null ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="Tabs" component={TabNavigator} />
      )}
    </Stack.Navigator>
  )
}
