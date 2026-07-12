import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sessionsApi } from 'core/api/modules/sessions.api'
import type {
  AttentionType,
  SessionStatus,
  CreateAttentionSessionRequest,
  UpdateSessionStatusRequest,
} from 'core/types/session.types'

const keys = {
  all: (patientId: string) => ['patients', patientId, 'sessions'] as const,
  list: (
    patientId: string,
    filters: { page?: number; pageSize?: number; type?: AttentionType; status?: SessionStatus },
  ) => [...keys.all(patientId), filters] as const,
}

export function useSessions(
  patientId: string,
  filters: { page?: number; pageSize?: number; type?: AttentionType; status?: SessionStatus } = {},
) {
  return useQuery({
    queryKey: keys.list(patientId, filters),
    queryFn: () => sessionsApi.list(patientId, filters),
    enabled: !!patientId,
    placeholderData: keepPreviousData,
  })
}

export function useCreateSession(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAttentionSessionRequest) => sessionsApi.create(patientId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(patientId) }),
  })
}

export function usePatchSessionStatus(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: UpdateSessionStatusRequest }) =>
      sessionsApi.patchStatus(patientId, sessionId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(patientId) }),
  })
}

export function useDeleteSession(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => sessionsApi.delete(patientId, sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all(patientId) }),
  })
}
