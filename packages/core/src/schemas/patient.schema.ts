import { z } from 'zod'

export const patientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  profile: z.string().url('Must be a valid URL').nullable().or(z.literal('')).transform(v => v || null),
  birthDate: z.string().min(1, 'Birth date is required'),
  gender: z.enum(['Male', 'Female']),
  country: z.string().max(60).nullable().or(z.literal('')).transform(v => v || null),
  state: z.string().max(60).nullable().or(z.literal('')).transform(v => v || null),
  city: z.string().max(60).nullable().or(z.literal('')).transform(v => v || null),
  address: z.string().min(1, 'Address is required').max(200),
  description: z.string().max(500).nullable().or(z.literal('')).transform(v => v || null),
  primaryAttentionType: z.enum(['Medical', 'EducationalReinforcement']),
  clinicId: z.string().uuid().nullable().or(z.literal('')).transform(v => v || null),
  workRouteId: z.string().uuid().nullable().or(z.literal('')).transform(v => v || null),
  routeVisitTime: z.string().nullable().or(z.literal('')).transform(v => v || null),
})

export type PatientFormData = z.infer<typeof patientSchema>
