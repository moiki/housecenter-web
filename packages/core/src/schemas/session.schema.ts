import { z } from 'zod'

export const createSessionSchema = z
  .object({
    collaboratorId: z.string().min(1, 'Collaborator is required'),
    attentionType: z.enum(['Medical', 'EducationalReinforcement']),
    sessionDate: z.string().min(1, 'Date is required'),
    durationMinutes: z.string().optional(),
    notes: z.string().optional(),
    locationMode: z.enum(['clinic', 'workRoute']),
    clinicId: z.string().optional(),
    workRouteId: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.locationMode === 'clinic' && !d.clinicId) {
      ctx.addIssue({ code: 'custom', path: ['clinicId'], message: 'Clinic is required' })
    }
    if (d.locationMode === 'workRoute' && !d.workRouteId) {
      ctx.addIssue({ code: 'custom', path: ['workRouteId'], message: 'Work route is required' })
    }
  })

export type CreateSessionFormData = z.infer<typeof createSessionSchema>

export const sessionStatusSchema = z.object({
  status: z.enum(['Scheduled', 'Completed', 'Missed']),
  durationMinutes: z.string().optional(),
  notes: z.string().optional(),
})

export type SessionStatusFormData = z.infer<typeof sessionStatusSchema>
