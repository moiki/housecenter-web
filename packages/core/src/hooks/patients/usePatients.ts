import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { patientsApi } from 'core/api/modules/patients.api'
import { DEFAULT_PAGE_SIZE } from 'core/lib/constants'
import type { CreatePatientRequest, UpdatePatientRequest } from 'core/types/patient.types'

export const patientKeys = {
  all: ['patients'] as const,
  list: (page: number, pageSize: number) => [...patientKeys.all, 'list', page, pageSize] as const,
  detail: (id: string) => [...patientKeys.all, 'detail', id] as const,
  summary: (id: string) => [...patientKeys.all, 'summary', id] as const,
}

export function usePatients(page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: patientKeys.list(page, pageSize),
    queryFn: () => patientsApi.list(page, pageSize),
    placeholderData: keepPreviousData,
  })
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => patientsApi.getById(id),
    enabled: !!id,
  })
}

export function usePatientFullSummary(id: string) {
  return useQuery({
    queryKey: patientKeys.summary(id),
    queryFn: () => patientsApi.getFullSummary(id),
    enabled: !!id,
  })
}

export function useCreatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePatientRequest) => patientsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: patientKeys.all }),
  })
}

export function useUpdatePatient(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePatientRequest) => patientsApi.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(patientKeys.detail(id), updated)
      qc.invalidateQueries({ queryKey: patientKeys.all })
    },
  })
}

export function useDeactivatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => patientsApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: patientKeys.all }),
  })
}
