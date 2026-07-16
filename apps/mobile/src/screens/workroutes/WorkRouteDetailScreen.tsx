import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useWorkRoute } from 'core/hooks/workroutes/useWorkRoutes'
import type { WorkRouteResponse } from 'core/types/workroute.types'
import { QueryBoundary } from '../../components/shared/QueryBoundary'
import type { MoreStackParamList } from '../../navigation/TabNavigator'

type Props = NativeStackScreenProps<MoreStackParamList, 'WorkRouteDetail'>

// Read-only Ruta de trabajo detail (R5, D4): `useWorkRoute(workRouteId)` unmodified. Renders
// `clinicName`, a plain-text recurrence summary (local pure helper — web has no equivalent
// text-summary component to hoist from, `WorkRouteCalendar.tsx` only renders chips), and
// `stops[]` — the patients assigned to this route (Patient.workRouteId), each with their visit
// time. Stops used to be a free-text `destinations[]` list with no relationship to Patient at
// all; that's gone — see WorkRouteStopDto. NO edit/delete/create affordance and NO month-calendar
// grid anywhere on this screen — management stays web-only (mutations already require
// `AdministratorOrAbove` server-side).
export function WorkRouteDetailScreen({ route }: Props) {
  const { workRouteId } = route.params
  const { t } = useTranslation()
  const { data, isLoading, isError } = useWorkRoute(workRouteId)

  return (
    <QueryBoundary isLoading={isLoading} isError={isError} data={data}>
      {(wr) => (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>{wr.routeName}</Text>
          <Text style={styles.clinic}>{wr.clinicName}</Text>
          {wr.description ? <Text style={styles.description}>{wr.description}</Text> : null}
          <Text style={styles.recurrence}>{recurrenceSummary(wr, t)}</Text>

          <Text style={styles.sectionTitle}>{t('workRoutes.patientsTitle')}</Text>
          {wr.stops.length === 0 ? (
            <Text style={styles.stopDesc}>{t('workRoutes.noPatientsAssigned')}</Text>
          ) : (
            wr.stops.map((stop) => (
              <View key={stop.patientId} style={styles.stopCard}>
                <Text style={styles.stopName}>{stop.patientName}</Text>
                <Text style={styles.stopDesc}>{stop.address}</Text>
                <Text style={styles.stopTime}>{stop.visitTime ? stop.visitTime.slice(0, 5) : t('workRoutes.noVisitTime')}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </QueryBoundary>
  )
}

// Local pure helper — mobile-only (no equivalent web text-summary component exists to hoist).
// Joins the translated recurrence weekdays + a "desde <start>" / "hasta <end>" (or "indefinida")
// window derived from `recurrenceDays`/`recurrenceStartDate`/`recurrenceEndDate`/
// `isRecurrenceIndefinite`.
function recurrenceSummary(wr: WorkRouteResponse, t: TFunction): string {
  const days =
    wr.recurrenceDays.length > 0
      ? wr.recurrenceDays.map((d) => t(`workRoutes.weekday.${d}`)).join(', ')
      : t('workRoutes.recurrence.noDays')

  const from = t('workRoutes.recurrence.from', { date: wr.recurrenceStartDate })
  const to = wr.isRecurrenceIndefinite
    ? t('workRoutes.recurrence.indefinite')
    : wr.recurrenceEndDate
      ? t('workRoutes.recurrence.to', { date: wr.recurrenceEndDate })
      : ''

  return [days, from, to].filter(Boolean).join(' · ')
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  title: { fontSize: 20, fontWeight: '700' },
  clinic: { fontSize: 14, color: '#6b7280' },
  description: { fontSize: 14, color: '#374151' },
  recurrence: { fontSize: 13, color: '#374151', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  stopCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  stopName: { fontSize: 15, fontWeight: '600' },
  stopDesc: { fontSize: 13, color: '#6b7280' },
  stopTime: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
})
