import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invitationsApi } from '@/api/modules/invitations.api'
import type { CreateInvitationRequest } from '@/types/invitation.types'
import { userKeys } from '@/hooks/users/useUsers'

export function useCreateInvitation() {
  return useMutation({
    mutationFn: (data: CreateInvitationRequest) => invitationsApi.create(data),
  })
}

export function useResendInvitation() {
  return useMutation({
    mutationFn: (id: string) => invitationsApi.resend(id),
  })
}

export function useDeleteInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invitationsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.list() }),
  })
}
