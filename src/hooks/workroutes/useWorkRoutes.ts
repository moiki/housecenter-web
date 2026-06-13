import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workRoutesApi } from '@/api/modules/workroutes.api'
import type { CreateWorkRouteRequest, UpdateWorkRouteRequest } from '@/types/workroute.types'

export const workRouteKeys = {
  all: ['workroutes'] as const,
  list: () => [...workRouteKeys.all, 'list'] as const,
  detail: (id: string) => [...workRouteKeys.all, 'detail', id] as const,
}

export function useWorkRoutes() {
  return useQuery({
    queryKey: workRouteKeys.list(),
    queryFn: workRoutesApi.list,
  })
}

export function useWorkRoute(id: string) {
  return useQuery({
    queryKey: workRouteKeys.detail(id),
    queryFn: () => workRoutesApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateWorkRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWorkRouteRequest) => workRoutesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: workRouteKeys.list() }),
  })
}

export function useUpdateWorkRoute(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateWorkRouteRequest) => workRoutesApi.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(workRouteKeys.detail(id), updated)
      qc.invalidateQueries({ queryKey: workRouteKeys.list() })
    },
  })
}

export function useDeactivateWorkRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workRoutesApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: workRouteKeys.list() }),
  })
}
