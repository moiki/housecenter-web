import { getApiClient } from 'core/api/http/registry'
import type { HelpTopic, HelpTopicSummary } from 'core/types/help.types'

const BASE = '/help'

export const helpApi = {
  getTopics: () => getApiClient().get<HelpTopicSummary[]>(`${BASE}/topics`).then((r) => r.data),

  getTopic: (topicKey: string) =>
    getApiClient().get<HelpTopic>(`${BASE}/topics/${topicKey}`).then((r) => r.data),
}
