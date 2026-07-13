import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api/modules/users.api'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { UpdateUserRequest, AssignRolesRequest } from '@/types/user.types'

export const userKeys = {
  all: ['users'] as const,
  list: (page: number, pageSize: number) => [...userKeys.all, 'list', page, pageSize] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
}

export function useUsers(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: userKeys.list(page, pageSize),
    queryFn: () => usersApi.list(page, pageSize),
    placeholderData: keepPreviousData,
  })
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
      qc.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useAssignRoles(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AssignRolesRequest) => usersApi.assignRoles(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(userKeys.detail(id), updated)
      qc.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}
