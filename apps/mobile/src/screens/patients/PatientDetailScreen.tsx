import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { RouteProp } from '@react-navigation/native'
import { usePatientFullSummary } from 'core/hooks/patients/usePatients'
import { QueryBoundary } from '../../components/shared/QueryBoundary'
import { OfflineBanner } from '../../components/shared/OfflineBanner'
import { OverviewTab } from './OverviewTab'
import type { PatientsStackParamList } from '../../navigation/PatientsStack'

type TabId = 'overview' | 'treatments' | 'sessions' | 'comments'

const TABS: { id: TabId; labelKey: string }[] = [
  { id: 'overview', labelKey: 'patients.tab.overview' },
  { id: 'treatments', labelKey: 'patients.tab.treatments' },
  { id: 'sessions', labelKey: 'patients.tab.sessions' },
  { id: 'comments', labelKey: 'patients.tab.comments' },
]

interface PatientDetailScreenProps {
  route: RouteProp<PatientsStackParamList, 'PatientDetail'>
}

// PLACEHOLDER content for Treatments/Sessions/Comments — real panels land in PR3 (Treatments +
// Details) and PR4 (Sessions + patient Comments), each as its own `screens/patients/*Tab.tsx`
// file per design.md's target structure. Kept as an inline component here (not a pre-created
// empty file) so PR3/PR4 don't inherit dead scaffolding.
function ComingSoonPanel({ labelKey }: { labelKey: string }) {
  const { t } = useTranslation()
  return (
    <View style={styles.comingSoon}>
      <Text style={styles.comingSoonText}>{t(labelKey)}</Text>
    </View>
  )
}

// PatientDetailScreen (R8, D3): a custom segmented control (local `useState<TabId>` + Pressable
// pills) over Overview/Treatments/Sessions/Comments — no `material-top-tabs`/`pager-view`
// dependency (rejected in D3). Mirrors web's `activeTab` `useState` idiom. Overview renders real
// content now via `OverviewTab`; the other 3 panels are PR3/PR4 placeholders.
export function PatientDetailScreen({ route }: PatientDetailScreenProps) {
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
        {(summary) => (
          <View style={styles.panel}>
            {tab === 'overview' && <OverviewTab summary={summary} />}
            {tab === 'treatments' && <ComingSoonPanel labelKey="patients.tab.treatmentsComingSoon" />}
            {tab === 'sessions' && <ComingSoonPanel labelKey="patients.tab.sessionsComingSoon" />}
            {tab === 'comments' && <ComingSoonPanel labelKey="patients.tab.commentsComingSoon" />}
          </View>
        )}
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
  comingSoon: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  comingSoonText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
})
