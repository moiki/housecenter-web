import { z } from 'zod'

export const weekdaySchema = z.enum([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
])

// Base shape shared by create/update. Recurrence dates are 'YYYY-MM-DD' strings from
// RHFDatePicker (never the ''->null transform — recurrenceEndDate is date|null already,
// recurrenceStartDate is always set once a value is picked).
const baseWorkRouteSchema = z.object({
  routeName: z.string().min(1, 'Route name is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  featuredImage: z.string().url('Must be a valid URL').nullable().or(z.literal('')).transform(v => v || null),
  clinicId: z.string().uuid('Clinic is required'),
  recurrenceStartDate: z.string().min(1, 'Start date is required'),
  recurrenceEndDate: z.string().nullable(),
  isRecurrenceIndefinite: z.boolean(),
})

// Object-shape branching (`.omit`/`.extend`) MUST happen BEFORE `.refine()` is applied —
// on some zod versions `.refine()` wraps the schema in an effects type that drops
// `.omit`/`.extend`. Each variant below applies its own two cross-field recurrence
// refinements last, once the shape is final.
const recurrenceEndRequiredCheck = {
  path: ['recurrenceEndDate'],
  message: 'End date is required for finite recurrence',
}
const recurrenceEndOrderCheck = {
  path: ['recurrenceEndDate'],
  message: 'End date must be on/after the start date',
}

// CREATE: hard-requires at least one recurrence weekday.
export const workRouteSchema = baseWorkRouteSchema
  .extend({ recurrenceDays: weekdaySchema.array().min(1, 'Select at least one day') })
  .refine((d) => (d.isRecurrenceIndefinite ? d.recurrenceEndDate === null : !!d.recurrenceEndDate), recurrenceEndRequiredCheck)
  .refine(
    (d) => d.isRecurrenceIndefinite || !d.recurrenceEndDate || d.recurrenceEndDate >= d.recurrenceStartDate,
    recurrenceEndOrderCheck,
  )

// UPDATE: allows an empty recurrenceDays (legacy/scheduleless routes stay editable, per D9).
export const updateWorkRouteSchema = baseWorkRouteSchema
  .omit({ clinicId: true })
  .extend({ recurrenceDays: weekdaySchema.array() })
  .refine((d) => (d.isRecurrenceIndefinite ? d.recurrenceEndDate === null : !!d.recurrenceEndDate), recurrenceEndRequiredCheck)
  .refine(
    (d) => d.isRecurrenceIndefinite || !d.recurrenceEndDate || d.recurrenceEndDate >= d.recurrenceStartDate,
    recurrenceEndOrderCheck,
  )

export type WorkRouteFormData = z.infer<typeof workRouteSchema>
export type UpdateWorkRouteFormData = z.infer<typeof updateWorkRouteSchema>
