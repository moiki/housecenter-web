import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { PatientsListScreen } from '../screens/patients/PatientsListScreen'
import { PatientDetailScreen } from '../screens/patients/PatientDetailScreen'
import { CreateSessionScreen } from '../screens/patients/CreateSessionScreen'

// Param list for the "Pacientes" tab's nested stack (D8).
export type PatientsStackParamList = {
  PatientsList: undefined
  PatientDetail: { patientId: string }
  CreateSession: { patientId: string }
}

const Stack = createNativeStackNavigator<PatientsStackParamList>()

// Native-stack for the "Pacientes" tab: browse (`PatientsListScreen`) -> detail
// (`PatientDetailScreen`, R6/D8) -> create-session modal (`CreateSessionScreen`, R10/D8, PR4).
// `CreateSession` is a `presentation:'modal'` route (D8) — the large create-session form
// benefits from a full modal sheet, unlike the smaller inline toggled panels used by the
// Treatments/Sessions/Comments tabs' status-patch/create-detail/add-comment forms.
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
      <Stack.Screen
        name="CreateSession"
        component={CreateSessionScreen}
        options={{ title: t('sessions.createTitle'), presentation: 'modal' }}
      />
    </Stack.Navigator>
  )
}
