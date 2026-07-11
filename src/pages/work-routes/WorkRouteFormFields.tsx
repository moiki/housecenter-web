import { useWatch, type Control, type FieldPath } from 'react-hook-form'
import { Box } from '@mui/material'
import { FormSection } from '@/components/shared/FormSection'
import {
  RHFTextField,
  RHFSelect,
  RHFDatePicker,
  RHFSwitch,
  RHFWeekdayToggle,
  type SelectOption,
} from '@/components/shared/form'
import type { WorkRouteFormData, UpdateWorkRouteFormData } from '@/schemas/workroute.schema'

type WorkRouteFormValues = WorkRouteFormData | UpdateWorkRouteFormData

interface Props<T extends WorkRouteFormValues> {
  control: Control<T>
  /** Create requires a clinic + at least one recurrence weekday; update does not. */
  isCreate: boolean
  /** Only needed when `isCreate` — update never changes the clinic. */
  clinicOptions?: SelectOption[]
}

// Shared route-info + recurrence fields for both the New Work Route form
// (WorkRoutesPage) and the edit form (WorkRouteDetailPage). Destinations stay
// page-local (each page already owns its own useFieldArray for that repeating
// group) — this component only covers the fields that are common to create/update.
export function WorkRouteFormFields<T extends WorkRouteFormValues>({ control, isCreate, clinicOptions }: Props<T>) {
  const isIndefinite = useWatch({ control, name: 'isRecurrenceIndefinite' as FieldPath<T> }) as unknown as boolean

  return (
    <>
      <FormSection title="Route info">
        <RHFTextField control={control} name={'routeName' as FieldPath<T>} label="Route name" placeholder="e.g. North District" />
        <RHFTextField
          control={control}
          name={'description' as FieldPath<T>}
          label="Description"
          placeholder="Brief description of this route"
          multiline
          rows={2}
        />
        {isCreate && clinicOptions && (
          <RHFSelect
            control={control as unknown as Control<WorkRouteFormData>}
            name="clinicId"
            label="Clinic"
            options={clinicOptions}
          />
        )}
        <RHFTextField control={control} name={'featuredImage' as FieldPath<T>} label="Featured image URL (optional)" placeholder="https://..." />
      </FormSection>

      <FormSection title="Recurrence">
        <RHFWeekdayToggle control={control} name={'recurrenceDays' as FieldPath<T>} label="Repeats on" />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <RHFDatePicker control={control} name={'recurrenceStartDate' as FieldPath<T>} label="Start date" />
          <RHFDatePicker control={control} name={'recurrenceEndDate' as FieldPath<T>} label="End date" disabled={isIndefinite} />
        </Box>
        <RHFSwitch control={control} name={'isRecurrenceIndefinite' as FieldPath<T>} label="Repeats indefinitely" />
      </FormSection>
    </>
  )
}
