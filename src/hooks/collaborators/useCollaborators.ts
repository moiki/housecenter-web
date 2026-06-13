import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { collaboratorsApi } from '@/api/modules/collaborators.api'
import type { CreateCollaboratorRequest, UpdateCollaboratorRequest } from '@/types/collaborator.types'

export const collaboratorKeys = {
  all: ['collaborators'] as const,
  list: () => [...collaboratorKeys.all, 'list'] as const,
  detail: (id: string) => [...collaboratorKeys.all, 'detail', id] as const,
}

export function useCollaborators() {
  return useQuery({
    queryKey: collaboratorKeys.list(),
    queryFn: collaboratorsApi.list,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: collaboratorKeys.list() }),
  })
}

export function useUpdateCollaborator(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateCollaboratorRequest) => collaboratorsApi.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(collaboratorKeys.detail(id), updated)
      qc.invalidateQueries({ queryKey: collaboratorKeys.list() })
    },
  })
}

export function useDeactivateCollaborator() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => collaboratorsApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: collaboratorKeys.list() }),
  })
}
