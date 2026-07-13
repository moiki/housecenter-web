import { useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  useDeviceSessions,
  useRevokeAllSessions,
  useRevokeSession,
} from 'core/hooks/auth/useDeviceSessions'
import type { DeviceSessionResponse } from 'core/types/auth.types'
import { QueryBoundary } from '../../components/shared/QueryBoundary'
import { getDeviceId } from '../../lib/deviceId'

// Device-mgmt "Más" sub-screen (R11): lists `useDeviceSessions()`, highlights the row matching
// the local device, offers per-row revoke, and "cerrar todas las demás sesiones" (revoke-all).
// "Cerrar sesión" lives on `MoreScreen` (the tab's landing screen), not here — see design.md D8;
// R11 requires the *tab* support logout/revoke-all, not any one specific sub-screen.
export function DevicesScreen() {
  const { t } = useTranslation()
  const { data: sessions, isLoading, isError } = useDeviceSessions()
  const revokeSession = useRevokeSession()
  const revokeAllSessions = useRevokeAllSessions()
  const currentDeviceId = getDeviceId()
  const [revokingId, setRevokingId] = useState<string | null>(null)

  function confirmRevoke(session: DeviceSessionResponse) {
    Alert.alert(t('devices.revokeConfirmTitle'), t('devices.revokeConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('devices.revoke'),
        style: 'destructive',
        onPress: () => {
          setRevokingId(session.id)
          revokeSession.mutate(session.id, { onSettled: () => setRevokingId(null) })
        },
      },
    ])
  }

  function confirmRevokeAll() {
    Alert.alert(t('devices.revokeAllConfirmTitle'), t('devices.revokeAllConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('devices.revokeAll'),
        style: 'destructive',
        onPress: () => revokeAllSessions.mutate(),
      },
    ])
  }

  function renderRow({ item }: { item: DeviceSessionResponse }) {
    const isCurrent = item.deviceId === currentDeviceId
    return (
      <View style={[styles.row, isCurrent && styles.rowCurrent]}>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>
            {item.deviceName ?? item.platform}
            {isCurrent ? ` (${t('devices.thisDevice')})` : ''}
          </Text>
          <Text style={styles.rowSubtitle}>{item.platform}</Text>
        </View>
        {!isCurrent && (
          <Pressable
            style={styles.revokeButton}
            onPress={() => confirmRevoke(item)}
            disabled={revokingId === item.id}
          >
            <Text style={styles.revokeButtonText}>{t('devices.revoke')}</Text>
          </Pressable>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        data={sessions}
        isEmpty={(data) => data.length === 0}
      >
        {(data) => (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderRow}
            contentContainerStyle={styles.list}
          />
        )}
      </QueryBoundary>

      <Pressable style={styles.revokeAllButton} onPress={confirmRevokeAll}>
        <Text style={styles.revokeAllButtonText}>{t('devices.revokeAll')}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  rowCurrent: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  revokeButton: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fee2e2',
  },
  revokeButtonText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  revokeAllButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fee2e2',
  },
  revokeAllButtonText: {
    color: '#dc2626',
    fontWeight: '600',
  },
})
