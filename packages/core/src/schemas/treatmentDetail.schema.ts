import { z } from 'zod'

export const treatmentDetailSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  treatmentDate: z.string().min(1),
  profile: z.string().url().nullable().or(z.literal('')).transform(v => v || null),
})

export type TreatmentDetailFormData = z.infer<typeof treatmentDetailSchema>
