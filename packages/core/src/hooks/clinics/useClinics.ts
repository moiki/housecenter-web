import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clinicsApi } from 'core/api/modules/clinics.api'
import { DEFAULT_PAGE_SIZE } from 'core/lib/constants'
import type { CreateClinicRequest, UpdateClinicRequest } from 'core/types/clinic.types'

export const clinicKeys = {
  all: ['clinics'] as const,
  list: (page: number, pageSize: number) => [...clinicKeys.all, 'list', page, pageSize] as const,
  detail: (id: string) => [...clinicKeys.all, 'detail', id] as const,
}

export function useClinics(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: clinicKeys.list(page, pageSize),
    queryFn: () => clinicsApi.list(page, pageSize),
    placeholderData: keepPreviousData,
  })
}

export function useClinic(id: string) {
  return useQuery({ queryKey: clinicKeys.detail(id), queryFn: () => clinicsApi.getById(id) })
}

export function useCreateClinic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateClinicRequest) => clinicsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: clinicKeys.all }),
  })
}

export function useUpdateClinic(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateClinicRequest) => clinicsApi.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(clinicKeys.detail(id), updated)
      qc.invalidateQueries({ queryKey: clinicKeys.all })
    },
  })
}

export function useDeactivateClinic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => clinicsApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: clinicKeys.all }),
  })
}
