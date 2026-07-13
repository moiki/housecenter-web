import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from 'core/hooks/notifications/useNotifications'
import type { NotificationResponse } from 'core/types/notification.types'
import { QueryBoundary } from '../../components/shared/QueryBoundary'
import { useOnline } from '../../hooks/useOnline'

// Notificaciones list/unread UI (R6, R7): reuses core's `useNotifications`/`useMarkNotificationRead`/
// `useMarkAllNotificationsRead` hooks **unmodified** (design.md target structure — zero diff to
// `useNotifications.ts`). All write actions (single mark-read on row tap, mark-all) are gated on
// `useOnline()` — disabled offline, mirroring the write-gating idiom already used by
// `ConsultationDetailScreen`/inline status-patch forms; reads keep rendering from the persisted
// TanStack Query cache regardless of connectivity (R6).
export function NotificationsScreen() {
  const { t } = useTranslation()
  const isOnline = useOnline()
  const { data, isLoading, isError, refetch, isRefetching } = useNotifications({ page: 1, pageSize: 20 })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const hasUnread = (data?.items ?? []).some((n) => !n.isRead)

  function onPressRow(item: NotificationResponse) {
    if (!isOnline || item.isRead || markRead.isPending) return
    markRead.mutate(item.id)
  }

  function renderRow({ item }: { item: NotificationResponse }) {
    const unread = !item.isRead
    return (
      <Pressable
        style={[styles.row, unread && styles.rowUnread]}
        onPress={() => onPressRow(item)}
        disabled={!isOnline || !unread || markRead.isPending}
        accessibilityRole="button"
        accessibilityLabel={unread ? t('notifications.markRead') : undefined}
      >
        <View style={styles.rowHeader}>
          <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          {unread && <View style={styles.dot} />}
        </View>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.date}>{new Date(item.createdDate).toLocaleString()}</Text>
      </Pressable>
    )
  }

  return (
    <View style={styles.container}>
      {hasUnread && (
        <Pressable
          style={[styles.markAllButton, !isOnline && styles.markAllButtonDisabled]}
          onPress={() => markAllRead.mutate()}
          disabled={!isOnline || markAllRead.isPending}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.markAllRead')}
          hitSlop={{ top: 6, bottom: 6 }}
        >
          <Text style={styles.markAllButtonText}>{t('notifications.markAllRead')}</Text>
        </Pressable>
      )}

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        data={data}
        isEmpty={(d) => d.items.length === 0}
        emptyMessageKey="notifications.empty"
      >
        {(page) => (
          <FlatList
            data={page.items}
            keyExtractor={(n) => n.id}
            renderItem={renderRow}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
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
  rowUnread: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { flex: 1, fontSize: 15, fontWeight: '500' },
  titleUnread: { fontWeight: '700' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  body: { fontSize: 13, color: '#6b7280' },
  date: { fontSize: 11, color: '#9ca3af' },
  markAllButton: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#eff6ff',
  },
  markAllButtonDisabled: {
    opacity: 0.5,
  },
  markAllButtonText: {
    color: '#2563eb',
    fontWeight: '600',
  },
})
