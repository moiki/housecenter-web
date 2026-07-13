import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { PatientsListScreen } from '../screens/patients/PatientsListScreen'
import { PatientDetailScreen } from '../screens/patients/PatientDetailScreen'
import { CreateSessionScreen } from '../screens/patients/CreateSessionScreen'
import { CreateConsultationScreen } from '../screens/consultations/CreateConsultationScreen'

// Param list for the "Pacientes" tab's nested stack (D8). `CreateConsultation` (R5, D2, PR2)
// lives here — not in the "Consultas" tab's own stack — because creating a consultation is
// intrinsically patient-scoped (reached via "Escalar a Doctor" on `PatientDetailScreen`); this
// avoids the app's first cross-tab typed navigation and a standalone patient picker (D2).
export type PatientsStackParamList = {
  PatientsList: undefined
  PatientDetail: { patientId: string }
  CreateSession: { patientId: string }
  CreateConsultation: { patientId: string }
}

const Stack = createNativeStackNavigator<PatientsStackParamList>()

// Native-stack for the "Pacientes" tab: browse (`PatientsListScreen`) -> detail
// (`PatientDetailScreen`, R6/D8) -> create-session modal (`CreateSessionScreen`, R10/D8, PR4) ->
// create-consultation modal (`CreateConsultationScreen`, R5, D2, PR2). Both `CreateSession` and
// `CreateConsultation` are `presentation:'modal'` routes (D8) — full modal sheets for their
// larger create forms, unlike the smaller inline toggled panels used by the
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
      <Stack.Screen
        name="CreateConsultation"
        component={CreateConsultationScreen}
        options={{ title: t('consultations.createTitle'), presentation: 'modal' }}
      />
    </Stack.Navigator>
  )
}
