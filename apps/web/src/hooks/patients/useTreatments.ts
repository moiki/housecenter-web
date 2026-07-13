import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { treatmentsApi } from '@/api/modules/treatments.api'
import { patientKeys } from './usePatients'

export const treatmentKeys = {
  all: (patientId: string) => ['treatments', patientId] as const,
  list: (patientId: string, page: number) => [...treatmentKeys.all(patientId), 'list', page] as const,
}

export const treatmentDetailKeys = {
  all: (treatmentId: string) => ['treatmentDetails', treatmentId] as const,
  list: (treatmentId: string, page: number) => [...treatmentDetailKeys.all(treatmentId), 'list', page] as const,
}

export const treatmentCommentKeys = {
  all: (treatmentId: string) => ['treatmentComments', treatmentId] as const,
  list: (treatmentId: string, page: number) => [...treatmentCommentKeys.all(treatmentId), 'list', page] as const,
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

export function useTreatmentDetails(treatmentId: string, page = 1) {
  return useQuery({
    queryKey: treatmentDetailKeys.list(treatmentId, page),
    queryFn: () => treatmentsApi.listDetails(treatmentId, page),
    enabled: !!treatmentId,
    placeholderData: keepPreviousData,
  })
}

export function useCreateTreatmentDetail(treatmentId: string, patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: object) => treatmentsApi.createDetail(treatmentId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: treatmentKeys.all(patientId) })
      qc.invalidateQueries({ queryKey: treatmentDetailKeys.all(treatmentId) })
    },
  })
}

export function useDeleteTreatmentDetail(treatmentId: string, patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (detailId: string) => treatmentsApi.deleteDetail(treatmentId, detailId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: treatmentKeys.all(patientId) })
      qc.invalidateQueries({ queryKey: treatmentDetailKeys.all(treatmentId) })
    },
  })
}

export function useTreatmentComments(treatmentId: string, page = 1) {
  return useQuery({
    queryKey: treatmentCommentKeys.list(treatmentId, page),
    queryFn: () => treatmentsApi.listComments(treatmentId, page),
    enabled: !!treatmentId,
    placeholderData: keepPreviousData,
  })
}

export function useCreateTreatmentComment(treatmentId: string, patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: object) => treatmentsApi.createComment(treatmentId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: treatmentKeys.all(patientId) })
      qc.invalidateQueries({ queryKey: treatmentCommentKeys.all(treatmentId) })
    },
  })
}

export function useDeleteTreatmentComment(treatmentId: string, patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => treatmentsApi.deleteComment(treatmentId, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: treatmentKeys.all(patientId) })
      qc.invalidateQueries({ queryKey: treatmentCommentKeys.all(treatmentId) })
    },
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

export function useAssignDoctor(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => treatmentsApi.addDoctor(patientId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: patientKeys.summary(patientId) }),
  })
}

export function useRemoveDoctor(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => treatmentsApi.removeDoctor(patientId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: patientKeys.summary(patientId) }),
  })
}
