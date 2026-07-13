import { useMutation } from '@tanstack/react-query'
import { notificationsApi } from 'core/api/modules/notifications.api'
import type { PushSubscriptionRequest } from 'core/types/notification.types'

// Push-subscription mutation pair (mobile-notifications-push PR2b, design.md D6). Kept in a new
// file rather than folded into `useNotifications.ts` — that file is a hard zero-diff constraint
// (R1). No `invalidateQueries`: push subscription state isn't cached/rendered anywhere, unlike
// `useMarkNotificationRead`'s list/unread-count invalidation.
export function useSubscribePush() {
  return useMutation({
    mutationFn: (body: PushSubscriptionRequest) => notificationsApi.subscribePush(body),
  })
}

export function useUnsubscribePush() {
  return useMutation({
    mutationFn: (token: string) => notificationsApi.unsubscribePush(token),
  })
}
