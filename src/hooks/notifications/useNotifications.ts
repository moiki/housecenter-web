import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/api/modules/notifications.api'

const POLL_INTERVAL_MS = 60_000

const keys = {
  all: ['notifications'] as const,
  list: (filters: { page?: number; pageSize?: number; unreadOnly?: boolean }) =>
    [...keys.all, 'list', filters] as const,
  unreadCount: () => [...keys.all, 'unread-count'] as const,
}

export function useNotifications(
  filters: { page?: number; pageSize?: number; unreadOnly?: boolean } = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: () => notificationsApi.list(filters),
    refetchInterval: POLL_INTERVAL_MS,
    enabled: options.enabled ?? true,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: keys.unreadCount(),
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: POLL_INTERVAL_MS,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}
