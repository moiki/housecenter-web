import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { TabNavigator } from './TabNavigator'

const Stack = createNativeStackNavigator()

// Root native-stack per design.md's nav shell sketch (native-stack -> bottom-tabs). A single
// "Tabs" route wraps the whole tab bar for now; the real public/authenticated stack split lands
// once auth exists (#5). headerShown:false — the tab bar owns its own chrome.
export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
    </Stack.Navigator>
  )
}
