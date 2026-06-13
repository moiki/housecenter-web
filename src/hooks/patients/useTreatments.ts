import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { treatmentsApi } from '@/api/modules/treatments.api'
import { patientKeys } from './usePatients'

export const treatmentKeys = {
  all: (patientId: string) => ['treatments', patientId] as const,
  list: (patientId: string, page: number) => [...treatmentKeys.all(patientId), 'list', page] as const,
}

export function useTreatments(patientId: string, page = 1) {
  return useQuery({
    queryKey: treatmentKeys.list(patientId, page),
    queryFn: () => treatmentsApi.list(patientId, page),
    enabled: !!patientId,
    placeholderData: keepPreviousData,
  })
}

export function useCreateTreatment(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: object) => treatmentsApi.create(patientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: treatmentKeys.all(patientId) })
      qc.invalidateQueries({ queryKey: patientKeys.summary(patientId) })
    },
  })
}

export function useUpdateTreatment(patientId: string, treatmentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: object) => treatmentsApi.update(patientId, treatmentId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: treatmentKeys.all(patientId) }),
  })
}

export function usePatchTreatmentStatus(patientId: string, treatmentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: string) => treatmentsApi.patchStatus(patientId, treatmentId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: treatmentKeys.all(patientId) }),
  })
}

export function useDeactivateTreatment(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (treatmentId: string) => treatmentsApi.deactivate(patientId, treatmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: treatmentKeys.all(patientId) }),
  })
}

export function useCreateTreatmentDetail(treatmentId: string, patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: object) => treatmentsApi.createDetail(treatmentId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: treatmentKeys.all(patientId) }),
  })
}

export function useDeleteTreatmentDetail(treatmentId: string, patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (detailId: string) => treatmentsApi.deleteDetail(treatmentId, detailId),
    onSuccess: () => qc.invalidateQueries({ queryKey: treatmentKeys.all(patientId) }),
  })
}

export function useCreateTreatmentComment(treatmentId: string, patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: object) => treatmentsApi.createComment(treatmentId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: treatmentKeys.all(patientId) }),
  })
}

export function useDeleteTreatmentComment(treatmentId: string, patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => treatmentsApi.deleteComment(treatmentId, commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: treatmentKeys.all(patientId) }),
  })
}

export function useCreatePatientComment(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: object) => treatmentsApi.createPatientComment(patientId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: patientKeys.summary(patientId) }),
  })
}

export function useDeletePatientComment(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => treatmentsApi.deletePatientComment(patientId, commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: patientKeys.summary(patientId) }),
  })
}
