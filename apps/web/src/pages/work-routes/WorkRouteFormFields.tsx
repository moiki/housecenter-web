import { useWatch, type Control, type FieldPath } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
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
import type { WorkRouteFormData, UpdateWorkRouteFormData } from 'core/schemas/workroute.schema'

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
  const { t } = useTranslation()
  const isIndefinite = useWatch({ control, name: 'isRecurrenceIndefinite' as FieldPath<T> }) as unknown as boolean

  return (
    <>
      <FormSection title={t('workRoutes.form.sections.routeInfo')}>
        <RHFTextField
          control={control}
          name={'routeName' as FieldPath<T>}
          label={t('workRoutes.fields.routeName')}
          placeholder={t('workRoutes.form.routeNamePlaceholder')}
        />
        <RHFTextField
          control={control}
          name={'description' as FieldPath<T>}
          label={t('common.fields.description')}
          placeholder={t('workRoutes.form.descriptionPlaceholder')}
          multiline
          rows={2}
        />
        {isCreate && clinicOptions && (
          <RHFSelect
            control={control as unknown as Control<WorkRouteFormData>}
            name="clinicId"
            label={t('workRoutes.fields.clinic')}
            options={clinicOptions}
          />
        )}
        <RHFTextField
          control={control}
          name={'featuredImage' as FieldPath<T>}
          label={t('workRoutes.fields.featuredImage')}
          placeholder={t('workRoutes.form.featuredImagePlaceholder')}
        />
      </FormSection>

      <FormSection title={t('workRoutes.form.sections.recurrence')}>
        <RHFWeekdayToggle control={control} name={'recurrenceDays' as FieldPath<T>} label={t('workRoutes.fields.repeatsOn')} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <RHFDatePicker control={control} name={'recurrenceStartDate' as FieldPath<T>} label={t('workRoutes.fields.startDate')} />
          <RHFDatePicker
            control={control}
            name={'recurrenceEndDate' as FieldPath<T>}
            label={t('workRoutes.fields.endDate')}
            disabled={isIndefinite}
          />
        </Box>
        <RHFSwitch control={control} name={'isRecurrenceIndefinite' as FieldPath<T>} label={t('workRoutes.fields.repeatsIndefinitely')} />
      </FormSection>
    </>
  )
}
