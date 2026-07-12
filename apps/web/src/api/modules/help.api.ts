import { apiClient } from '@/api/client'
import type { HelpTopic, HelpTopicSummary } from 'core/types/help.types'

const BASE = '/help'

export const helpApi = {
  getTopics: () => apiClient.get<HelpTopicSummary[]>(`${BASE}/topics`).then((r) => r.data),

  getTopic: (topicKey: string) =>
    apiClient.get<HelpTopic>(`${BASE}/topics/${topicKey}`).then((r) => r.data),
}
