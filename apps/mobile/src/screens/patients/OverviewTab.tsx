import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { PatientFullSummaryResponse } from 'core/types/patient.types'

function calcAge(birthDate: string) {
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

// Read-only patient summary (R8) — mirrors web's `PatientProfilePage` OverviewTab field set,
// minus `AssignedDoctorsSection` (Owner-only assign/remove UI — out of Member-facing mobile
// scope per D2; `assignedDoctors` is intentionally never rendered here).
export function OverviewTab({ summary }: { summary: PatientFullSummaryResponse }) {
  const { t } = useTranslation()
  const { patient } = summary
  const age = calcAge(patient.birthDate)

  const fields: { label: string; value: string }[] = [
    { label: t('patients.overview.fullName'), value: `${patient.firstName} ${patient.lastName}` },
    { label: t('patients.overview.age'), value: t('patients.overview.ageValue', { age }) },
    { label: t('patients.overview.gender'), value: t(`patients.gender.${patient.gender}`) },
    { label: t('patients.overview.birthDate'), value: new Date(patient.birthDate).toLocaleDateString() },
    { label: t('patients.overview.address'), value: patient.address },
    {
      label: t('patients.overview.location'),
      value: [patient.country, patient.state, patient.city].filter(Boolean).join(', ') || '—',
    },
    {
      label: t('patients.overview.attentionType'),
      value: t(`patients.attentionType.${patient.primaryAttentionType}`),
    },
    { label: t('patients.overview.description'), value: patient.description ?? '—' },
  ]

  return (
    <ScrollView contentContainerStyle={styles.grid}>
      {fields.map((f) => (
        <View key={f.label} style={styles.field}>
          <Text style={styles.fieldLabel}>{f.label}</Text>
          <Text style={styles.fieldValue}>{f.value}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  grid: { padding: 16, gap: 10 },
  field: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  fieldLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  fieldValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
})
