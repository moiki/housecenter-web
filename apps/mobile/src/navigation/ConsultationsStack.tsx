import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { ConsultationsListScreen } from '../screens/consultations/ConsultationsListScreen'
import { ConsultationDetailScreen } from '../screens/consultations/ConsultationDetailScreen'

// Param list for the "Consultas" tab's nested stack (R2, D2).
export type ConsultationsStackParamList = {
  ConsultationsList: undefined
  ConsultationDetail: { consultationId: string }
}

const Stack = createNativeStackNavigator<ConsultationsStackParamList>()

// Native-stack for the "Consultas" tab: role-filtered browse (`ConsultationsListScreen`, R3) ->
// thread/compose/role-conditional-resolve detail (`ConsultationDetailScreen`, R4, R8). Mirrors
// `PatientsStack.tsx`'s standalone-file idiom (a primary tab, unlike the inline `MoreStack` in
// `TabNavigator.tsx`). No standalone "+" here — creating a consultation is patient-scoped and
// lives in `PatientsStack` (`CreateConsultationScreen`, PR2/D2).
export function ConsultationsStackNavigator() {
  const { t } = useTranslation()
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ConsultationsList"
        component={ConsultationsListScreen}
        options={{ title: t('consultations.title') }}
      />
      <Stack.Screen
        name="ConsultationDetail"
        component={ConsultationDetailScreen}
        options={{ title: t('consultations.detailTitle') }}
      />
    </Stack.Navigator>
  )
}
