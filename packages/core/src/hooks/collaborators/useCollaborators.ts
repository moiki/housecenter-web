import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { collaboratorsApi } from 'core/api/modules/collaborators.api'
import { getAuthStore } from 'core/auth/registry'
import { DEFAULT_PAGE_SIZE } from 'core/lib/constants'
import { isApiError } from 'core/types/common.types'
import type { CreateCollaboratorRequest, UpdateCollaboratorRequest } from 'core/types/collaborator.types'

export const collaboratorKeys = {
  all: ['collaborators'] as const,
  list: (page: number, pageSize: number) => [...collaboratorKeys.all, 'list', page, pageSize] as const,
  detail: (id: string) => [...collaboratorKeys.all, 'detail', id] as const,
  me: () => [...collaboratorKeys.all, 'me'] as const, // additive (R2)
}

export function useCollaborators(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: collaboratorKeys.list(page, pageSize),
    queryFn: () => collaboratorsApi.list(page, pageSize),
    placeholderData: keepPreviousData,
  })
}

export function useCollaborator(id: string) {
  return useQuery({
    queryKey: collaboratorKeys.detail(id),
    queryFn: () => collaboratorsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateCollaborator() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCollaboratorRequest) => collaboratorsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: collaboratorKeys.all }),
  })
}

export function useUpdateCollaborator(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateCollaboratorRequest) => collaboratorsApi.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(collaboratorKeys.detail(id), updated)
      qc.invalidateQueries({ queryKey: collaboratorKeys.all })
    },
  })
}

export function useDeactivateCollaborator() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => collaboratorsApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: collaboratorKeys.all }),
  })
}

// Additive (R2, D2, mobile-reports-workroutes PR1a): resolves the caller's own Collaborator
// profile, mirroring `useMe.ts`'s `getAuthStore()`/`accessToken` gating exactly. A 404 (no
// matching Collaborator row) is treated as "no profile" — the queryFn catches it and resolves
// `null`, so `isError` stays `false` for this honest, expected case; any other status (500,
// network) rethrows and surfaces as a real query error. Consuming screens get a simple
// three-way `undefined` (loading) | `null` (no match) | `CollaboratorResponse` (match) branch.
export function useMyCollaboratorProfile() {
  const useAuthStore = getAuthStore()
  const { accessToken } = useAuthStore()

  return useQuery({
    queryKey: collaboratorKeys.me(),
    queryFn: async () => {
      try {
        return await collaboratorsApi.getMe()
      } catch (err) {
        if (isApiError(err) && err.status === 404) return null
        throw err
      }
    },
    enabled: !!accessToken,
    retry: false,
  })
}
