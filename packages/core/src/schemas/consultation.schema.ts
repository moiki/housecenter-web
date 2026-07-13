import { z } from 'zod'

// Hoisted consultation form schemas (R1, D1) — mirrors the comment.schema.ts/session.schema.ts
// precedent: schemas cover only form-managed fields. `patientId` (route param) and
// `attachmentUrl: null` are supplied by the screen/mutation call site, not by the form itself.
// Additive new file — web's existing inline consultation schemas are left untouched, so this
// hoist carries no migration/regression risk for apps/web.
export const createConsultationSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  firstMessage: z.string().trim().min(1, 'Message is required'),
  assignedDoctorId: z.string().trim().min(1, 'Doctor is required'),
  treatmentId: z.null(), // v1: no treatment linking from mobile create
})

export type CreateConsultationFormData = z.infer<typeof createConsultationSchema>

export const postMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message is required'),
})

export type PostMessageFormData = z.infer<typeof postMessageSchema>
