import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { usePatients } from 'core/hooks/patients/usePatients'
import type { PatientResponse } from 'core/types/patient.types'
import { QueryBoundary } from '../../components/shared/QueryBoundary'
import { OfflineBanner } from '../../components/shared/OfflineBanner'
import type { PatientsStackParamList } from '../../navigation/PatientsStack'

// View-only patient browse list (R7, D2): `usePatients(page)` is a *paged* query (each page
// replaces the rendered set, not an infinite/append query) — `onEndReached` advances `page` while
// more pages remain. Search is client-side over the currently loaded page only; `patients.api`'s
// `list` has no server-side search param. No create/edit/deactivate control anywhere on this
// screen — those stay web-only per D2.
export function PatientsListScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NativeStackNavigationProp<PatientsStackParamList>>()
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const { data, isLoading, isError } = usePatients(page)

  function locationHint(patient: PatientResponse) {
    if (patient.clinicId) return t('patients.list.clinicBadge')
    if (patient.workRouteId) return t('patients.list.routeBadge')
    return null
  }

  function renderRow({ item }: { item: PatientResponse }) {
    const hint = locationHint(item)
    return (
      <Pressable style={styles.row} onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })}>
        <Text style={styles.name}>
          {item.firstName} {item.lastName}
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t(`patients.attentionType.${item.primaryAttentionType}`)}</Text>
          </View>
          {hint && (
            <View style={[styles.badge, styles.badgeMuted]}>
              <Text style={styles.badgeText}>{hint}</Text>
            </View>
          )}
        </View>
      </Pressable>
    )
  }

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <TextInput
        style={styles.search}
        placeholder={t('patients.list.searchPlaceholder')}
        placeholderTextColor="#9ca3af"
        value={query}
        onChangeText={setQuery}
      />
      <QueryBoundary isLoading={isLoading} isError={isError} data={data} isEmpty={(d) => d.items.length === 0}>
        {(d) => {
          const filtered = d.items.filter((p) =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(query.trim().toLowerCase()),
          )
          return (
            <FlatList
              data={filtered}
              keyExtractor={(p) => p.id}
              renderItem={renderRow}
              contentContainerStyle={styles.list}
              onEndReached={() => {
                if (page < d.totalPages) setPage((p) => p + 1)
              }}
              onEndReachedThreshold={0.4}
            />
          )
        }}
      </QueryBoundary>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  row: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  name: { fontSize: 16, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', gap: 6 },
  badge: {
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeMuted: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 12, color: '#374151' },
})
