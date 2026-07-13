import dayjs from 'dayjs'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useMyCollaboratorProfile } from 'core/hooks/collaborators/useCollaborators'
import { useWorkRoute } from 'core/hooks/workroutes/useWorkRoutes'
import { usePatients } from 'core/hooks/patients/usePatients'
import { expandOccurrences } from 'core/lib/recurrence'
import { DROPDOWN_PAGE_SIZE } from 'core/lib/constants'
import type { PatientResponse } from 'core/types/patient.types'
import { LoadingState } from '../../components/shared/LoadingState'
import { EmptyState } from '../../components/shared/EmptyState'

// Ruta del día (R6, D3): composes 3 hooks in sequence, each naturally inert (`enabled: !!id`)
// while the previous stage is still loading — no new gating code needed:
//   1. `useMyCollaboratorProfile()` (PR1a) — `null` (honest 404-as-no-profile, never an error
//      toast) -> empty state "sin perfil coincidente"; `workRouteId === null` -> empty state
//      "sin ruta asignada".
//   2. `useWorkRoute(profile.workRouteId)` unmodified -> `expandOccurrences([route], today,
//      today)` with a device-local `dayjs().format('YYYY-MM-DD')` (never `.utc()`) -> no entry
//      for `today` -> empty state "hoy no toca".
//   3. `usePatients(1, DROPDOWN_PAGE_SIZE)` filtered CLIENT-SIDE by `patient.workRouteId ===
//      route.id` (no server-side filter param exists) -> empty -> empty state "sin pacientes en
//      la ruta"; otherwise render the route name + the filtered patient list.
// Deliberately a read-only list with no row navigation: `PatientDetail` lives in a sibling stack
// (`PatientsStackParamList`), and cross-stack nav is unnecessary complexity for a v1 read-only
// view (design D3 + tasks.md 3.1 note). This screen MUST NOT present or imply a "sessions due
// today" concept anywhere in its strings (R6).
export function RutaDelDiaScreen() {
  const today = dayjs().format('YYYY-MM-DD')

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useMyCollaboratorProfile()

  const workRouteId = profile?.workRouteId ?? ''
  const {
    data: route,
    isLoading: routeLoading,
    isError: routeError,
  } = useWorkRoute(workRouteId)

  const {
    data: patientsPage,
    isLoading: patientsLoading,
    isError: patientsError,
  } = usePatients(1, DROPDOWN_PAGE_SIZE)

  if (profileLoading) return <LoadingState />
  if (profileError) return <EmptyState messageKey="common.error" />
  if (!profile) return <EmptyState messageKey="rutaDelDia.noProfile" />
  if (!profile.workRouteId) return <EmptyState messageKey="rutaDelDia.noRoute" />

  if (routeLoading) return <LoadingState />
  if (routeError || !route) return <EmptyState messageKey="common.error" />

  const occurrencesToday = expandOccurrences([route], today, today)
  if (!occurrencesToday.has(today)) return <EmptyState messageKey="rutaDelDia.noOccurrenceToday" />

  if (patientsLoading) return <LoadingState />
  if (patientsError) return <EmptyState messageKey="common.error" />

  const patients = (patientsPage?.items ?? []).filter((p) => p.workRouteId === route.id)
  if (patients.length === 0) return <EmptyState messageKey="rutaDelDia.noPatients" />

  function renderRow({ item }: { item: PatientResponse }) {
    return (
      <View style={styles.row}>
        <Text style={styles.name}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.address}>{item.address}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.routeName}>{route.routeName}</Text>
      <Text style={styles.clinicName}>{route.clinicName}</Text>
      <FlatList
        data={patients}
        keyExtractor={(p) => p.id}
        renderItem={renderRow}
        contentContainerStyle={styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  routeName: { fontSize: 20, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16 },
  clinicName: { fontSize: 14, color: '#6b7280', paddingHorizontal: 16, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 8 },
  row: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  name: { fontSize: 16, fontWeight: '600' },
  address: { fontSize: 13, color: '#6b7280' },
})
