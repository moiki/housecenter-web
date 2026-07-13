import { z } from 'zod'

export const collaboratorSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Enter a valid email'),
  phoneNumber: z.string().min(1, 'Phone number is required').max(30),
  address: z.string().min(1, 'Address is required').max(200),
  country: z.string().max(60).nullable().or(z.literal('')).transform(v => v || null),
  state: z.string().max(60).nullable().or(z.literal('')).transform(v => v || null),
  city: z.string().max(60).nullable().or(z.literal('')).transform(v => v || null),
  profilePicture: z.string().url('Must be a valid URL').nullable().or(z.literal('')).transform(v => v || null),
  clinicId: z.string().uuid('Clinic is required'),
  workRouteId: z.string().uuid().nullable().or(z.literal('')).transform(v => v || null),
  positions: z.array(z.string().min(1)).min(1, 'At least one position is required'),
})

export type CollaboratorFormData = z.infer<typeof collaboratorSchema>
