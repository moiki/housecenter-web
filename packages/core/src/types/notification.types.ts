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
