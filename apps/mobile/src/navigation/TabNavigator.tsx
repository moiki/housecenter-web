import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { NavigatorScreenParams } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useUnreadCount } from 'core/hooks/notifications/useNotifications'
import { MoreScreen } from '../screens/more/MoreScreen'
import { DevicesScreen } from '../screens/more/DevicesScreen'
import { NotificationsScreen } from '../screens/more/NotificationsScreen'
import { WorkRoutesListScreen } from '../screens/workroutes/WorkRoutesListScreen'
import { WorkRouteDetailScreen } from '../screens/workroutes/WorkRouteDetailScreen'
import { RutaDelDiaScreen } from '../screens/rutadeldia/RutaDelDiaScreen'
import { ReportsScreen } from '../screens/reports/ReportsScreen'
import { PatientsStackNavigator } from './PatientsStack'
import { ConsultationsStackNavigator } from './ConsultationsStack'
import type { PatientsStackParamList } from './PatientsStack'
import type { ConsultationsStackParamList } from './ConsultationsStack'

const MoreStack = createNativeStackNavigator<MoreStackParamList>()

// Param list for the "Más" tab's nested stack — exported as a type-only import for the screens
// it hosts (`MoreScreen`/`DevicesScreen`/`NotificationsScreen`) so `useNavigation<...>()` is typed.
export type MoreStackParamList = {
  MoreMain: undefined
  RutaDelDia: undefined // NEW (R6, R8, mobile-reports-workroutes PR1b)
  WorkRoutes: undefined // NEW (R4, R8, mobile-reports-workroutes PR1a)
  WorkRouteDetail: { workRouteId: string } // NEW (R5, R8, mobile-reports-workroutes PR1a)
  Reports: undefined // NEW (R7, R8, mobile-reports-workroutes PR2)
  Devices: undefined
  Notifications: undefined // NEW (R6, R7, PR1)
}

// Nested stack for the "Más" tab: a landing menu (`MoreScreen`) that links into the device-mgmt
// sub-view (`DevicesScreen`, R11) and the Notificaciones list (`NotificationsScreen`, R6/R7, PR1).
// Colocated here rather than a new navigator file — it's a stack scoped to a single tab, not a
// standalone nav concern.
function MoreStackNavigator() {
  const { t } = useTranslation()
  return (
    <MoreStack.Navigator>
      <MoreStack.Screen name="MoreMain" component={MoreScreen} options={{ title: t('more.title') }} />
      <MoreStack.Screen
        name="RutaDelDia"
        component={RutaDelDiaScreen}
        options={{ title: t('rutaDelDia.title') }}
      />
      <MoreStack.Screen
        name="WorkRoutes"
        component={WorkRoutesListScreen}
        options={{ title: t('workRoutes.title') }}
      />
      <MoreStack.Screen
        name="WorkRouteDetail"
        component={WorkRouteDetailScreen}
        options={{ title: t('workRoutes.detailTitle') }}
      />
      <MoreStack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: t('reports.title') }}
      />
      <MoreStack.Screen name="Devices" component={DevicesScreen} options={{ title: t('devices.title') }} />
      <MoreStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t('notifications.title') }}
      />
    </MoreStack.Navigator>
  )
}

// Tab param list (design.md D1): exported next to the navigator it types, consumed by
// `RootNavigator.tsx`'s `RootStackParamList` (`Tabs: NavigatorScreenParams<TabParamList>`) and by
// `navigationRef.ts`'s typed nested-navigate call (PR2a).
export type TabParamList = {
  Pacientes: NavigatorScreenParams<PatientsStackParamList>
  Consultas: NavigatorScreenParams<ConsultationsStackParamList>
  More: NavigatorScreenParams<MoreStackParamList>
}

const Tab = createBottomTabNavigator<TabParamList>()

// Three tabs (order: Pacientes / Consultas / More): "Pacientes" (patient browse + progress,
// R6/D8 — repurposes the former `Home` placeholder now that auth #5 and the patient core hooks
// exist), "Consultas" (escalate-to-doctor threaded consultations, R2/D2 — 3rd tab added in
// mobile-consultations PR1), and "Más" (device-mgmt, R11). `headerShown: false` on every tab
// screen avoids a double header bar — each nested stack's own native-stack headers own the chrome
// for their screens.
// Unread badge (R7, design.md D7): `useUnreadCount()` (unmodified core hook) sets `tabBarBadge`
// on the "More" tab. TanStack Query dedupes this against `NotificationsScreen`'s own subscription
// to the same query key — mounting the tab bar for the app's entire authenticated lifetime shares
// one network request per interval with the list screen, not two.
export function TabNavigator() {
  const { t } = useTranslation()
  const { data: unread } = useUnreadCount()
  const badge = unread?.count ?? 0

  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Pacientes"
        component={PatientsStackNavigator}
        options={{ title: t('nav.patients'), headerShown: false }}
      />
      <Tab.Screen
        name="Consultas"
        component={ConsultationsStackNavigator}
        options={{ title: t('nav.consultations'), headerShown: false }}
      />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{
          title: t('nav.more'),
          headerShown: false,
          tabBarBadge: badge > 0 ? badge : undefined,
        }}
      />
    </Tab.Navigator>
  )
}
