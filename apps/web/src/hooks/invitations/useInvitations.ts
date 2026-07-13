import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invitationsApi } from '@/api/modules/invitations.api'
import type { CreateInvitationRequest } from 'core/types/invitation.types'
import { userKeys } from '@/hooks/users/useUsers'

export const invitationKeys = {
  all: ['invitations'] as const,
  list: (page: number) => [...invitationKeys.all, 'list', page] as const,
}

export function useInvitations(page = 1) {
  return useQuery({
    queryKey: invitationKeys.list(page),
    queryFn: () => invitationsApi.list(page),
    placeholderData: keepPreviousData,
  })
}

export function useCreateInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInvitationRequest) => invitationsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitationKeys.all }),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all })
      qc.invalidateQueries({ queryKey: invitationKeys.all })
    },
  })
}
