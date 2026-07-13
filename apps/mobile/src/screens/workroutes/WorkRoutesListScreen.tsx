import dayjs from 'dayjs'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useWorkRoutes } from 'core/hooks/workroutes/useWorkRoutes'
import { expandOccurrences } from 'core/lib/recurrence'
import { DROPDOWN_PAGE_SIZE } from 'core/lib/constants'
import type { WorkRouteResponse } from 'core/types/workroute.types'
import { QueryBoundary } from '../../components/shared/QueryBoundary'
import type { MoreStackParamList } from '../../navigation/TabNavigator'

type Props = NativeStackScreenProps<MoreStackParamList, 'WorkRoutes'>

// Read-only Rutas de trabajo list (R4, D4): `useWorkRoutes(1, DROPDOWN_PAGE_SIZE)` unmodified,
// wrapped in `QueryBoundary`/`EmptyState` so a previously-fetched page still renders while
// offline (persisted TanStack Query cache). `expandOccurrences([...routes], today, today)` badges
// any row recurring today ("hoy") — device-local `dayjs()`, never `.utc()` (mirrors web's
// `WorkRouteCalendar.tsx` date math). No create/add entry point anywhere on this screen — mutation
// stays web-only.
export function WorkRoutesListScreen({ navigation }: Props) {
  const { t } = useTranslation()
  const today = dayjs().format('YYYY-MM-DD')
  const { data, isLoading, isError } = useWorkRoutes(1, DROPDOWN_PAGE_SIZE)

  const todayIds = data
    ? new Set((expandOccurrences(data.items, today, today).get(today) ?? []).map((r) => r.id))
    : new Set<string>()

  function renderRow({ item }: { item: WorkRouteResponse }) {
    const isToday = todayIds.has(item.id)
    return (
      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate('WorkRouteDetail', { workRouteId: item.id })}
      >
        <View style={styles.rowHeader}>
          <Text style={styles.routeName}>{item.routeName}</Text>
          {isToday && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('workRoutes.today')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.clinicName}>{item.clinicName}</Text>
      </Pressable>
    )
  }

  return (
    <View style={styles.container}>
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        data={data}
        isEmpty={(d) => d.items.length === 0}
        emptyMessageKey="workRoutes.emptyList"
      >
        {(page) => (
          <FlatList
            data={page.items}
            keyExtractor={(r) => r.id}
            renderItem={renderRow}
            contentContainerStyle={styles.list}
          />
        )}
      </QueryBoundary>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 8 },
  row: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  routeName: { flex: 1, fontSize: 16, fontWeight: '600' },
  clinicName: { fontSize: 13, color: '#6b7280' },
  badge: {
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeText: { fontSize: 12, color: '#15803d', fontWeight: '600' },
})
