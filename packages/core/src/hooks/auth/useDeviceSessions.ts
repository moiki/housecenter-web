import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from 'core/api/modules/auth.api'
import { authKeys } from 'core/hooks/auth/authKeys'

export function useDeviceSessions() {
  return useQuery({
    queryKey: authKeys.deviceSessions(),
    queryFn: authApi.getSessions,
  })
}

export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.deviceSessions() }),
  })
}

export function useRevokeAllSessions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.revokeAllSessions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.deviceSessions() }),
  })
}
