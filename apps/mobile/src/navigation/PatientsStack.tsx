import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { PatientsListScreen } from '../screens/patients/PatientsListScreen'
import { PatientDetailScreen } from '../screens/patients/PatientDetailScreen'

// Param list for the "Pacientes" tab's nested stack (D8). `CreateSession` is typed here now so
// screens can already type `useNavigation<NativeStackNavigationProp<PatientsStackParamList>>()`
// against the full union ahead of time; the route itself is registered as a `presentation:'modal'`
// screen in PR4 (task 4.2) once `CreateSessionScreen` exists — mirrors `MoreStackParamList`'s
// export idiom in `TabNavigator.tsx`.
export type PatientsStackParamList = {
  PatientsList: undefined
  PatientDetail: { patientId: string }
  CreateSession: { patientId: string }
}

const Stack = createNativeStackNavigator<PatientsStackParamList>()

// Native-stack for the "Pacientes" tab: browse (`PatientsListScreen`) -> detail
// (`PatientDetailScreen`, R6/D8). Colocated in its own file (unlike `MoreStackNavigator`, which
// stays inline in `TabNavigator.tsx`) because this stack grows a 3rd (modal) route in PR4.
export function PatientsStackNavigator() {
  const { t } = useTranslation()
  return (
    <Stack.Navigator>
      <Stack.Screen name="PatientsList" component={PatientsListScreen} options={{ title: t('patients.title') }} />
      <Stack.Screen
        name="PatientDetail"
        component={PatientDetailScreen}
        options={{ title: t('patients.detailTitle') }}
      />
    </Stack.Navigator>
  )
}
