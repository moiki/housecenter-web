import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { usePatientFullSummary } from 'core/hooks/patients/usePatients'
import { QueryBoundary } from '../../components/shared/QueryBoundary'
import { OfflineBanner } from '../../components/shared/OfflineBanner'
import { AttachmentsSection } from '../../components/attachments/AttachmentsSection'
import { OverviewTab } from './OverviewTab'
import { TreatmentsTab } from './TreatmentsTab'
import { SessionsTab } from './SessionsTab'
import { CommentsTab } from './CommentsTab'
import type { PatientsStackParamList } from '../../navigation/PatientsStack'

type TabId = 'overview' | 'treatments' | 'sessions' | 'comments' | 'photos'

const TABS: { id: TabId; labelKey: string }[] = [
  { id: 'overview', labelKey: 'patients.tab.overview' },
  { id: 'treatments', labelKey: 'patients.tab.treatments' },
  { id: 'sessions', labelKey: 'patients.tab.sessions' },
  { id: 'comments', labelKey: 'patients.tab.comments' },
  { id: 'photos', labelKey: 'patients.tab.photos' },
]

type Props = NativeStackScreenProps<PatientsStackParamList, 'PatientDetail'>

// PatientDetailScreen (R5, R7, R8, D2/D3/D5): a custom segmented control (local `useState<TabId>`
// + Pressable pills) over Overview/Treatments/Sessions/Comments/Fotos — no
// `material-top-tabs`/`pager-view` dependency (rejected in D3). Mirrors web's `activeTab`
// `useState` idiom. All four original tabs render real content as of PR4 (`OverviewTab`,
// `TreatmentsTab`, `SessionsTab`, `CommentsTab`). The 5th "Fotos" tab (mobile-attachments-camera
// PR1b, R12, D6) wires the reusable `AttachmentsSection` with `ownerType="Patient"`.
// PR2 (R5, R7, D2) adds a persistent "Escalar a Doctor" button above the active tab's content ->
// `navigate('CreateConsultation', { patientId })`; shown unconditionally (no client-side
// collaborator gate — D7) but disabled with a Spanish hint when
// `summary.assignedDoctors.length === 0` (D5). Switched this screen's props from a route-only
// shape to `NativeStackScreenProps` solely to obtain `navigation` for that button — no other
// behavior change.
export function PatientDetailScreen({ route, navigation }: Props) {
  const { patientId } = route.params
  const { t } = useTranslation()
  const [tab, setTab] = useState<TabId>('overview')
  const { data, isLoading, isError } = usePatientFullSummary(patientId)

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <View style={styles.segment}>
        {TABS.map((x) => (
          <Pressable
            key={x.id}
            onPress={() => setTab(x.id)}
            style={[styles.pill, tab === x.id && styles.pillActive]}
          >
            <Text style={tab === x.id ? styles.pillTextActive : styles.pillText}>{t(x.labelKey)}</Text>
          </Pressable>
        ))}
      </View>
      <QueryBoundary isLoading={isLoading} isError={isError} data={data}>
        {(summary) => {
          const canEscalate = summary.assignedDoctors.length > 0
          return (
            <View style={styles.panel}>
              <Pressable
                disabled={!canEscalate}
                onPress={() => navigation.navigate('CreateConsultation', { patientId })}
                style={[styles.escalateBtn, !canEscalate && styles.escalateBtnDisabled]}
              >
                <Text style={styles.escalateBtnText}>{t('consultations.escalate')}</Text>
              </Pressable>
              {!canEscalate && <Text style={styles.escalateHint}>{t('consultations.noDoctors')}</Text>}
              {tab === 'overview' && <OverviewTab summary={summary} />}
              {tab === 'treatments' && <TreatmentsTab patientId={patientId} />}
              {tab === 'sessions' && <SessionsTab patientId={patientId} />}
              {tab === 'comments' && <CommentsTab patientId={patientId} comments={summary.comments} />}
              {tab === 'photos' && <AttachmentsSection ownerType="Patient" ownerId={patientId} />}
            </View>
          )
        }}
      </QueryBoundary>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segment: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingVertical: 8,
  },
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText: { fontSize: 13, color: '#374151' },
  pillTextActive: { fontSize: 13, color: '#fff', fontWeight: '600' },
  panel: { flex: 1 },
  escalateBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
  },
  escalateBtnDisabled: { opacity: 0.5 },
  escalateBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  escalateHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 6,
    marginHorizontal: 16,
  },
})
