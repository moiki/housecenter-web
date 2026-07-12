import { z } from 'zod'

export const clinicSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Max 200 characters'),
  address: z.string().min(1, 'Address is required').max(500, 'Max 500 characters'),
})

export type ClinicFormData = z.infer<typeof clinicSchema>
