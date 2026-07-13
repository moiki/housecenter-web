import { getApiClient } from 'core/api/http/registry'
import type { PagedResult } from 'core/types/common.types'
import type {
  NotificationResponse,
  PushSubscriptionRequest,
  UnreadCountResponse,
} from 'core/types/notification.types'

// Unversioned, like /auth/* — see the CLAUDE.md route-versioning gotcha.
const BASE = '/notifications'

export const notificationsApi = {
  list: (params: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}) =>
    getApiClient().get<PagedResult<NotificationResponse>>(BASE, { params }).then((r) => r.data),

  unreadCount: () =>
    getApiClient().get<UnreadCountResponse>(`${BASE}/unread-count`).then((r) => r.data),

  markRead: (id: string) => getApiClient().patch<void>(`${BASE}/${id}/read`).then((r) => r.data),

  markAllRead: () => getApiClient().post<void>(`${BASE}/read-all`).then((r) => r.data),

  // Push-subscription surface (mobile-notifications-push PR2b, design.md D6). Additive only —
  // the 4 exports above keep identical signatures. Backend upserts by token (idempotent).
  subscribePush: (body: PushSubscriptionRequest) =>
    getApiClient()
      .post<void>(`${BASE}/push-subscriptions`, body)
      .then((r) => r.data),

  // Token is URL-encoded — push tokens can contain characters (':', '/') that aren't safe
  // unencoded in a path segment.
  unsubscribePush: (token: string) =>
    getApiClient()
      .delete<void>(`${BASE}/push-subscriptions/${encodeURIComponent(token)}`)
      .then((r) => r.data),
}
