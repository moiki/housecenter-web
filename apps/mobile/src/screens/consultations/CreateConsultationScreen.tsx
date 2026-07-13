import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { usePatientFullSummary } from 'core/hooks/patients/usePatients'
import { useCreateConsultation } from 'core/hooks/consultations/useConsultations'
import { createConsultationSchema, type CreateConsultationFormData } from 'core/schemas/consultation.schema'
import { isApiError } from 'core/types/common.types'
import { QueryBoundary } from '../../components/shared/QueryBoundary'
import { EmptyState } from '../../components/shared/EmptyState'
import { OfflineBanner } from '../../components/shared/OfflineBanner'
import { RHFSelect, RHFTextInput, type RHFSelectOption } from '../../components/shared/form'
import { useOnline } from '../../hooks/useOnline'
import type { PatientsStackParamList } from '../../navigation/PatientsStack'

type Props = NativeStackScreenProps<PatientsStackParamList, 'CreateConsultation'>

// CreateConsultationScreen ("Escalar a Doctor", R5, R7, D2/D5): a `PatientsStack` modal — RHF +
// `zodResolver(createConsultationSchema)`. The doctor picker is PATIENT-SCOPED: options come from
// `usePatientFullSummary(patientId).assignedDoctors` (`DoctorSummaryDto`), NEVER a global doctor
// list (D5 — web's global `useUsers` picker has a latent unassigned-doctor 400 bug this avoids).
// Zero-assigned-doctors guard (R5): the whole form is replaced by an explanatory `EmptyState` —
// `PatientDetailScreen`'s own escalate button is already disabled in that case, so this is
// defense-in-depth against a stale/racy cached summary. `treatmentId` and `attachmentUrl` are
// ALWAYS sent as `null` (v1, D3) — neither is a form-managed field. There is NO client-side
// collaborator pre-gate (R7, D7 — no DTO exposes a patient's `Collaborators`): on success (201)
// this screen `goBack()`s; on a 403 `consultations.not_patient_collaborator` (detected via
// `isApiError`) it shows a friendly Spanish alert and stays on the form — never crashes.
export function CreateConsultationScreen({ route, navigation }: Props) {
  const { patientId } = route.params
  const { t } = useTranslation()
  const online = useOnline()
  const { data: summary, isLoading, isError } = usePatientFullSummary(patientId)
  const create = useCreateConsultation()

  const { control, handleSubmit } = useForm<CreateConsultationFormData>({
    resolver: zodResolver(createConsultationSchema),
    defaultValues: { assignedDoctorId: '', title: '', firstMessage: '', treatmentId: null },
  })

  async function onSubmit(d: CreateConsultationFormData) {
    try {
      await create.mutateAsync({
        patientId,
        assignedDoctorId: d.assignedDoctorId,
        title: d.title,
        firstMessage: d.firstMessage,
        treatmentId: null,
        attachmentUrl: null,
      })
      navigation.goBack()
    } catch (err) {
      // Graceful 403 (R7, D7) — no client-side collaborator pre-gate exists, so this is the only
      // place membership is ever enforced; stay on the form, never crash.
      if (isApiError(err) && err.status === 403 && err.detail.includes('not_patient_collaborator')) {
        Alert.alert(t('consultations.escalate'), t('consultations.notCollaborator'))
      } else {
        throw err
      }
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <OfflineBanner />
      <QueryBoundary isLoading={isLoading} isError={isError} data={summary}>
        {(s) => {
          if (s.assignedDoctors.length === 0) {
            // Zero-assigned-doctors guard (R5): no doctor picker is ever rendered with zero
            // options — replace the entire form with an explanatory Spanish message.
            return <EmptyState messageKey="consultations.noDoctors" />
          }
          const doctorOptions: RHFSelectOption[] = s.assignedDoctors.map((d) => ({
            value: d.id,
            label: `${d.firstName} ${d.lastName}`,
          }))
          return (
            <>
              <RHFSelect
                control={control}
                name="assignedDoctorId"
                label={t('consultations.doctor')}
                options={doctorOptions}
              />
              <RHFTextInput control={control} name="title" label={t('consultations.titleLabel')} />
              <RHFTextInput
                control={control}
                name="firstMessage"
                label={t('consultations.firstMessage')}
                multiline
              />
              <Pressable
                disabled={!online || create.isPending}
                onPress={handleSubmit(onSubmit)}
                style={[styles.submitBtn, (!online || create.isPending) && styles.submitBtnDisabled]}
              >
                <Text style={styles.submitBtnText}>{t('consultations.create')}</Text>
              </Pressable>
            </>
          )
        }}
      </QueryBoundary>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  submitBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
