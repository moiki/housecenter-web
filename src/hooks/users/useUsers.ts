import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api/modules/users.api'
import type { UpdateUserRequest, AssignRolesRequest } from '@/types/user.types'

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
}

export function useUsers() {
  return useQuery({ queryKey: userKeys.list(), queryFn: usersApi.list })
}

export function useUser(id: string) {
  return useQuery({ queryKey: userKeys.detail(id), queryFn: () => usersApi.getById(id), enabled: !!id })
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateUserRequest) => usersApi.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(userKeys.detail(id), updated)
      qc.invalidateQueries({ queryKey: userKeys.list() })
    },
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.list() }),
  })
}

export function useAssignRoles(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AssignRolesRequest) => usersApi.assignRoles(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(userKeys.detail(id), updated)
      qc.invalidateQueries({ queryKey: userKeys.list() })
    },
  })
}
