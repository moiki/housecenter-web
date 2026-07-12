import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { consultationsApi } from 'core/api/modules/consultations.api'
import type {
  ConsultationStatus,
  CreateConsultationRequest,
  PostMessageRequest,
  UpdateConsultationStatusRequest,
} from 'core/types/consultation.types'

const keys = {
  all: ['consultations'] as const,
  list: (filters: { page?: number; status?: ConsultationStatus }) =>
    [...keys.all, 'list', filters] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
}

export function useConsultations(
  filters: { page?: number; pageSize?: number; status?: ConsultationStatus } = {},
) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: () => consultationsApi.list(filters),
    placeholderData: keepPreviousData,
  })
}

export function useConsultationDetail(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => consultationsApi.getDetail(id),
    enabled: !!id,
  })
}

export function useCreateConsultation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateConsultationRequest) => consultationsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export function usePostMessage(consultationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PostMessageRequest) =>
      consultationsApi.postMessage(consultationId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: keys.detail(consultationId) }),
  })
}

export function useUpdateConsultationStatus(consultationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateConsultationStatusRequest) =>
      consultationsApi.updateStatus(consultationId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.detail(consultationId) })
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}
