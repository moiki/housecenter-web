import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workRoutesApi } from 'core/api/modules/workroutes.api'
import { patientKeys } from 'core/hooks/patients/usePatients'
import { DEFAULT_PAGE_SIZE } from 'core/lib/constants'
import type {
  CreateWorkRouteRequest,
  UpdateWorkRouteRequest,
  AssignPatientToRouteRequest,
} from 'core/types/workroute.types'

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

// Stops are derived from patient assignment — assigning/unassigning changes both the
// route (its Stops) and the patient (workRouteId/routeVisitTime), so both cache trees
// get invalidated.
export function useAssignPatientToRoute(routeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ patientId, data }: { patientId: string; data: AssignPatientToRouteRequest }) =>
      workRoutesApi.assignPatient(routeId, patientId, data),
    onSuccess: (updated) => {
      qc.setQueryData(workRouteKeys.detail(routeId), updated)
      qc.invalidateQueries({ queryKey: workRouteKeys.all })
      qc.invalidateQueries({ queryKey: patientKeys.all })
    },
  })
}

export function useUnassignPatientFromRoute(routeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patientId: string) => workRoutesApi.unassignPatient(routeId, patientId),
    onSuccess: (updated) => {
      qc.setQueryData(workRouteKeys.detail(routeId), updated)
      qc.invalidateQueries({ queryKey: workRouteKeys.all })
      qc.invalidateQueries({ queryKey: patientKeys.all })
    },
  })
}
