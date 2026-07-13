import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { MoreScreen } from '../screens/more/MoreScreen'
import { DevicesScreen } from '../screens/more/DevicesScreen'
import { PatientsStackNavigator } from './PatientsStack'

const Tab = createBottomTabNavigator()
const MoreStack = createNativeStackNavigator<MoreStackParamList>()

// Param list for the "Más" tab's nested stack — exported as a type-only import for the two
// screens it hosts (`MoreScreen`/`DevicesScreen`) so `useNavigation<...>()` is typed.
export type MoreStackParamList = {
  MoreMain: undefined
  Devices: undefined
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

// Two tabs: "Pacientes" (patient browse + progress, R6/D8 — repurposes the former `Home`
// placeholder now that auth #5 and the patient core hooks exist) + "Más" (device-mgmt, R11).
// `headerShown: false` on both tab screens avoids a double header bar — each nested stack's own
// native-stack headers own the chrome for their screens.
export function TabNavigator() {
  const { t } = useTranslation()
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Pacientes"
        component={PatientsStackNavigator}
        options={{ title: t('nav.patients'), headerShown: false }}
      />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{ title: t('nav.more'), headerShown: false }}
      />
    </Tab.Navigator>
  )
}
