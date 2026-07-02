import { apiClient } from '@/api/client'
import type {
  TreatmentResponse,
  TreatmentDetailResponse,
  TreatmentCommentResponse,
  PatientCommentResponse,
  PagedResult,
} from '@/types/patient.types'

// Treatments
const t = (patientId: string) => `/patients/${patientId}/treatments`
const td = (treatmentId: string) => `/treatments/${treatmentId}/details`
const tc = (treatmentId: string) => `/treatments/${treatmentId}/comments`
const pc = (patientId: string) => `/patients/${patientId}/comments`
const pcol = (patientId: string) => `/patients/${patientId}/collaborators`
const pdoc = (patientId: string) => `/patients/${patientId}/doctors`

export const treatmentsApi = {
  // Treatments
  list: (patientId: string, page = 1, pageSize = 20) =>
    apiClient.get<PagedResult<TreatmentResponse>>(t(patientId), { params: { page, pageSize } }).then(r => r.data),

  create: (patientId: string, data: object) =>
    apiClient.post<TreatmentResponse>(t(patientId), data).then(r => r.data),

  update: (patientId: string, treatmentId: string, data: object) =>
    apiClient.put<TreatmentResponse>(`${t(patientId)}/${treatmentId}`, data).then(r => r.data),

  patchStatus: (patientId: string, treatmentId: string, status: string) =>
    apiClient.patch<TreatmentResponse>(`${t(patientId)}/${treatmentId}/status`, { status }).then(r => r.data),

  deactivate: (patientId: string, treatmentId: string) =>
    apiClient.delete<void>(`${t(patientId)}/${treatmentId}`).then(r => r.data),

  // Treatment details
  listDetails: (treatmentId: string, page = 1, pageSize = 20) =>
    apiClient.get<PagedResult<TreatmentDetailResponse>>(td(treatmentId), { params: { page, pageSize } }).then(r => r.data),

  createDetail: (treatmentId: string, data: object) =>
    apiClient.post<TreatmentDetailResponse>(td(treatmentId), data).then(r => r.data),

  updateDetail: (treatmentId: string, detailId: string, data: object) =>
    apiClient.put<TreatmentDetailResponse>(`${td(treatmentId)}/${detailId}`, data).then(r => r.data),

  deleteDetail: (treatmentId: string, detailId: string) =>
    apiClient.delete<void>(`${td(treatmentId)}/${detailId}`).then(r => r.data),

  // Treatment comments
  listComments: (treatmentId: string, page = 1, pageSize = 20) =>
    apiClient.get<PagedResult<TreatmentCommentResponse>>(tc(treatmentId), { params: { page, pageSize } }).then(r => r.data),

  createComment: (treatmentId: string, data: object) =>
    apiClient.post<TreatmentCommentResponse>(tc(treatmentId), data).then(r => r.data),

  updateComment: (treatmentId: string, commentId: string, data: object) =>
    apiClient.put<TreatmentCommentResponse>(`${tc(treatmentId)}/${commentId}`, data).then(r => r.data),

  deleteComment: (treatmentId: string, commentId: string) =>
    apiClient.delete<void>(`${tc(treatmentId)}/${commentId}`).then(r => r.data),

  // Patient comments
  createPatientComment: (patientId: string, data: object) =>
    apiClient.post<PatientCommentResponse>(pc(patientId), data).then(r => r.data),

  updatePatientComment: (patientId: string, commentId: string, data: object) =>
    apiClient.put<PatientCommentResponse>(`${pc(patientId)}/${commentId}`, data).then(r => r.data),

  deletePatientComment: (patientId: string, commentId: string) =>
    apiClient.delete<void>(`${pc(patientId)}/${commentId}`).then(r => r.data),

  // Collaborators & doctors
  addCollaborator: (patientId: string, userId: string) =>
    apiClient.post<void>(`${pcol(patientId)}/${userId}`).then(r => r.data),

  addDoctor: (patientId: string, userId: string) =>
    apiClient.post<void>(`${pdoc(patientId)}/${userId}`).then(r => r.data),

  removeDoctor: (patientId: string, userId: string) =>
    apiClient.delete<void>(`${pdoc(patientId)}/${userId}`).then(r => r.data),
}
