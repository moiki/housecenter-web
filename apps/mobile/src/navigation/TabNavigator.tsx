import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { MoreScreen } from '../screens/more/MoreScreen'
import { DevicesScreen } from '../screens/more/DevicesScreen'

const Tab = createBottomTabNavigator()
const MoreStack = createNativeStackNavigator<MoreStackParamList>()

// Param list for the "Más" tab's nested stack — exported as a type-only import for the two
// screens it hosts (`MoreScreen`/`DevicesScreen`) so `useNavigation<...>()` is typed.
export type MoreStackParamList = {
  MoreMain: undefined
  Devices: undefined
}

// Trivial placeholder screen — no real feature content/data, per R6. Real screens land in later
// changes once auth (#5) and feature APIs exist.
function HomePlaceholderScreen() {
  const { t } = useTranslation()
  return (
    <View style={styles.container}>
      <Text>{t('nav.home')}</Text>
    </View>
  )
}

// Nested stack for the "Más" tab: a landing menu (`MoreScreen`) that links into the device-mgmt
// sub-view (`DevicesScreen`, R11). Colocated here rather than a new navigator file — it's a
// two-screen stack scoped to a single tab, not a standalone nav concern.
function MoreStackNavigator() {
  const { t } = useTranslation()
  return (
    <MoreStack.Navigator>
      <MoreStack.Screen name="MoreMain" component={MoreScreen} options={{ title: t('more.title') }} />
      <MoreStack.Screen name="Devices" component={DevicesScreen} options={{ title: t('devices.title') }} />
    </MoreStack.Navigator>
  )
}

// Two tabs: Home (placeholder, R6) + "Más" (device-mgmt, R11). `headerShown: false` on the tab
// screen avoids a double header bar — `MoreStackNavigator`'s own native-stack headers own the
// chrome for its two screens.
export function TabNavigator() {
  const { t } = useTranslation()
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomePlaceholderScreen} options={{ title: t('nav.home') }} />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{ title: t('nav.more'), headerShown: false }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
