import type { DevicePlatform } from './auth.types'

export type NotificationType =
  | 'ConsultationMessage'
  | 'ConsultationOpened'
  | 'ConsultationResolved'
  | 'SessionUpcoming'
  | 'SessionMissed'

export interface NotificationResponse {
  id: string
  type: NotificationType
  title: string
  body: string
  referenceType: string | null
  referenceId: string | null
  isRead: boolean
  readAt: string | null
  createdDate: string
}

export interface UnreadCountResponse {
  count: number
}

// Push-subscription surface (mobile-notifications-push PR2b, design.md D6). Reuses the existing
// `DevicePlatform` union ('Android' | 'iOS' | 'Web') instead of a new `PushPlatform`-like type —
// the backend's enum values are identical, so a second type would be pure duplication.
export interface PushSubscriptionRequest {
  token: string
  platform: DevicePlatform
}
