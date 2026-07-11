import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workRoutesApi } from '@/api/modules/workroutes.api'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { CreateWorkRouteRequest, UpdateWorkRouteRequest } from '@/types/workroute.types'

export const workRouteKeys = {
  all: ['workroutes'] as const,
  list: (page: number, pageSize: number) => [...workRouteKeys.all, 'list', page, pageSize] as const,
  detail: (id: string) => [...workRouteKeys.all, 'detail', id] as const,
}

export function useWorkRoutes(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: workRouteKeys.list(page, pageSize),
    queryFn: () => workRoutesApi.list(page, pageSize),
    placeholderData: keepPreviousData,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: workRouteKeys.all }),
  })
}

export function useUpdateWorkRoute(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateWorkRouteRequest) => workRoutesApi.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(workRouteKeys.detail(id), updated)
      qc.invalidateQueries({ queryKey: workRouteKeys.all })
    },
  })
}

export function useDeactivateWorkRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workRoutesApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: workRouteKeys.all }),
  })
}
