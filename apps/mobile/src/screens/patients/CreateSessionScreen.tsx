import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useCreateSession } from 'core/hooks/patients/useSessions'
import { useClinics } from 'core/hooks/clinics/useClinics'
import { useWorkRoutes } from 'core/hooks/workroutes/useWorkRoutes'
import { DROPDOWN_PAGE_SIZE } from 'core/lib/constants'
import { createSessionSchema, type CreateSessionFormData } from 'core/schemas/session.schema'
import { OfflineBanner } from '../../components/shared/OfflineBanner'
import { RHFSelect, RHFDateField, RHFPickerField, RHFTextInput, type RHFSelectOption } from '../../components/shared/form'
import { useOnline } from '../../hooks/useOnline'
import { useAuthStore } from '../../store/auth.store'
import type { PatientsStackParamList } from '../../navigation/PatientsStack'

type CreateSessionProps = NativeStackScreenProps<PatientsStackParamList, 'CreateSession'>

const ATTENTION_TYPES: CreateSessionFormData['attentionType'][] = ['Medical', 'EducationalReinforcement']
const LOCATION_MODES: CreateSessionFormData['locationMode'][] = ['clinic', 'workRoute']

// Adapters over core's paged clinic/work-route queries → `RHFPickerField`'s `useOptions` contract
// (`{ data?: {value,label}[]; isLoading? }`). Capped at `DROPDOWN_PAGE_SIZE` (100 rows) — same
// clamp web's dropdowns use (`SessionsTab.tsx`'s `useClinics(1, DROPDOWN_PAGE_SIZE)`). Colocated
// here (single consumer) rather than a new shared hooks file — trivial one-line mappings.
function useClinicOptions() {
  const { data, isLoading } = useClinics(1, DROPDOWN_PAGE_SIZE)
  return { data: data?.items.map((c) => ({ value: c.id, label: c.name })), isLoading }
}

function useWorkRouteOptions() {
  const { data, isLoading } = useWorkRoutes(1, DROPDOWN_PAGE_SIZE)
  return { data: data?.items.map((w) => ({ value: w.id, label: w.routeName })), isLoading }
}

// CreateSessionScreen (R10, D6, PR4): a stack modal — RHF + `zodResolver(createSessionSchema)`.
// `collaboratorId` auto-fills to the signed-in `user.id` (D6, THE ONE REAL open risk — verify via
// Human/EAS smoke, 4.8) — no collaborator picker, unlike web's admin any-collaborator dropdown.
// `locationMode` toggles which of `clinicId`/`workRouteId` renders (mirrors web's `useWatch`
// idiom); `sessionDate` is the first `RHFDateField mode="datetime"` consumer in the app. Submit
// gates on `useOnline()` (D7).
export function CreateSessionScreen({ route, navigation }: CreateSessionProps) {
  const { patientId } = route.params
  const { t } = useTranslation()
  const userId = useAuthStore((s) => s.user!.id) // D6: collaboratorId = self
  const online = useOnline()
  const createSession = useCreateSession(patientId)

  const { control, handleSubmit } = useForm<CreateSessionFormData>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      collaboratorId: userId,
      attentionType: 'Medical',
      sessionDate: '',
      durationMinutes: '',
      notes: '',
      locationMode: 'clinic',
      clinicId: '',
      workRouteId: '',
    },
  })

  const locationMode = useWatch({ control, name: 'locationMode' })

  const attentionTypeOptions: RHFSelectOption[] = ATTENTION_TYPES.map((v) => ({
    value: v,
    label: t(`patients.attentionType.${v}`),
  }))
  const locationModeOptions: RHFSelectOption[] = LOCATION_MODES.map((v) => ({
    value: v,
    label: t(`sessions.locationMode.${v}`),
  }))

  const onSubmit = async (d: CreateSessionFormData) => {
    await createSession.mutateAsync({
      collaboratorId: d.collaboratorId,
      clinicId: d.locationMode === 'clinic' ? d.clinicId || null : null,
      workRouteId: d.locationMode === 'workRoute' ? d.workRouteId || null : null,
      attentionType: d.attentionType,
      sessionDate: new Date(d.sessionDate).toISOString(), // mirror web SessionsTab.handleCreate
      durationMinutes: d.durationMinutes ? parseInt(d.durationMinutes, 10) : null,
      notes: d.notes || null,
    })
    navigation.goBack()
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <OfflineBanner />
      <RHFSelect
        control={control}
        name="attentionType"
        label={t('sessions.attentionTypeLabel')}
        options={attentionTypeOptions}
      />
      <RHFDateField control={control} name="sessionDate" label={t('sessions.sessionDate')} mode="datetime" />
      <RHFSelect
        control={control}
        name="locationMode"
        label={t('sessions.locationType')}
        options={locationModeOptions}
      />
      {locationMode === 'clinic' ? (
        <RHFPickerField
          control={control}
          name="clinicId"
          label={t('sessions.clinic')}
          useOptions={useClinicOptions}
        />
      ) : (
        <RHFPickerField
          control={control}
          name="workRouteId"
          label={t('sessions.workRoute')}
          useOptions={useWorkRouteOptions}
        />
      )}
      <RHFTextInput
        control={control}
        name="durationMinutes"
        label={t('sessions.duration')}
        placeholder={t('sessions.durationPlaceholder')}
        keyboardType="number-pad"
      />
      <RHFTextInput
        control={control}
        name="notes"
        label={t('sessions.notes')}
        placeholder={t('sessions.notesPlaceholder')}
        multiline
      />
      <Pressable
        disabled={!online || createSession.isPending}
        onPress={handleSubmit(onSubmit)}
        style={[styles.submitBtn, (!online || createSession.isPending) && styles.submitBtnDisabled]}
      >
        <Text style={styles.submitBtnText}>{t('sessions.save')}</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  submitBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
