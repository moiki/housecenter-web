import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useConsultations } from 'core/hooks/consultations/useConsultations'
import type { ConsultationResponse } from 'core/types/consultation.types'
import { QueryBoundary } from '../../components/shared/QueryBoundary'
import type { ConsultationsStackParamList } from '../../navigation/ConsultationsStack'

type Props = NativeStackScreenProps<ConsultationsStackParamList, 'ConsultationsList'>

// ConsultationsListScreen (R3, D2): `useConsultations()` relies entirely on the API's server-side
// role filter — a Member sees only consultations they opened, a Doctor sees only consultations
// assigned to them — so there is NO client-side re-filter here. No standalone "+" entry point in
// v1: creating a consultation is patient-scoped and lives on `PatientDetailScreen` ("Escalar a
// Doctor", PR2). Reads render from the persisted TanStack Query cache while offline (R9) — no
// write action lives on this screen, so no `OfflineBanner` here (see `ConsultationDetailScreen`).
export function ConsultationsListScreen({ navigation }: Props) {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useConsultations({ page: 1, pageSize: 20 })

  function renderRow({ item }: { item: ConsultationResponse }) {
    return (
      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate('ConsultationDetail', { consultationId: item.id })}
      >
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t(`consultations.status.${item.status}`)}</Text>
        </View>
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
        emptyMessageKey="consultations.empty"
      >
        {(page) => (
          <FlatList
            data={page.items}
            keyExtractor={(c) => c.id}
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
    gap: 6,
  },
  title: { fontSize: 16, fontWeight: '600' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeText: { fontSize: 12, color: '#374151' },
})
