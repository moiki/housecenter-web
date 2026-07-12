import { useQuery } from '@tanstack/react-query'
import { helpApi } from 'core/api/modules/help.api'

const HELP_STALE_TIME = 24 * 60 * 60 * 1000 // 24h — help content changes rarely

export const helpKeys = {
  all: ['help'] as const,
  list: () => [...helpKeys.all, 'list'] as const,
  detail: (topicKey: string) => [...helpKeys.all, 'detail', topicKey] as const,
}

export function useHelpTopics() {
  return useQuery({
    queryKey: helpKeys.list(),
    queryFn: helpApi.getTopics,
    staleTime: HELP_STALE_TIME,
  })
}

export function useHelpTopic(topicKey: string) {
  return useQuery({
    queryKey: helpKeys.detail(topicKey),
    queryFn: () => helpApi.getTopic(topicKey),
    enabled: !!topicKey,
    staleTime: HELP_STALE_TIME,
  })
}
