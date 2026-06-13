import { z } from 'zod'

export const destinationPointSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  picture: z.string().url('Must be a valid URL').nullable().or(z.literal('')).transform(v => v || null),
  googleMapUrl: z.string().url('Must be a valid URL').nullable().or(z.literal('')).transform(v => v || null),
})

export const workRouteSchema = z.object({
  routeName: z.string().min(1, 'Route name is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  featuredImage: z.string().url('Must be a valid URL').nullable().or(z.literal('')).transform(v => v || null),
  clinicId: z.string().uuid('Clinic is required'),
  destinations: z.array(destinationPointSchema).min(1, 'At least one destination is required'),
})

export const updateWorkRouteSchema = workRouteSchema.omit({ clinicId: true })

export type WorkRouteFormData = z.infer<typeof workRouteSchema>
export type UpdateWorkRouteFormData = z.infer<typeof updateWorkRouteSchema>
export type DestinationPointFormData = z.infer<typeof destinationPointSchema>
