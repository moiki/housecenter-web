import { getApiClient } from 'core/api/http/registry'
import type { PagedResult } from 'core/types/common.types'
import type { NotificationResponse, UnreadCountResponse } from 'core/types/notification.types'

// Unversioned, like /auth/* — see the CLAUDE.md route-versioning gotcha.
const BASE = '/notifications'

export const notificationsApi = {
  list: (params: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}) =>
    getApiClient().get<PagedResult<NotificationResponse>>(BASE, { params }).then((r) => r.data),

  unreadCount: () =>
    getApiClient().get<UnreadCountResponse>(`${BASE}/unread-count`).then((r) => r.data),

  markRead: (id: string) => getApiClient().patch<void>(`${BASE}/${id}/read`).then((r) => r.data),

  markAllRead: () => getApiClient().post<void>(`${BASE}/read-all`).then((r) => r.data),
}
