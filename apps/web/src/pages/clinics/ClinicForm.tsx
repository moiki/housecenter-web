import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button } from '@mui/material'
import { RHFTextField } from '@/components/shared/form'
import { clinicSchema, type ClinicFormData } from 'core/schemas/clinic.schema'
import type { ClinicResponse } from 'core/types/clinic.types'

interface Props {
  defaultValues?: ClinicResponse
  onSubmit: (data: ClinicFormData) => Promise<void>
  /** Renders an inline full-width submit button (standalone usage, e.g. ClinicDetailPage). */
  submitLabel?: string
  /** Set when used inside a SlideOver — tags the form so a pinned footer button can submit via `form={formId}`. */
  formId?: string
}

export function ClinicForm({ defaultValues, onSubmit, submitLabel, formId }: Props) {
  const { t } = useTranslation()
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ClinicFormData>({
    resolver: zodResolver(clinicSchema),
    defaultValues: defaultValues
      ? { name: defaultValues.name, address: defaultValues.address }
      : { name: '', address: '' },
  })

  return (
    <Box
      component="form"
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
    >
      <RHFTextField control={control} name="name" label={t('common.fields.name')} placeholder={t('clinics.form.namePlaceholder')} />
      <RHFTextField
        control={control}
        name="address"
        label={t('common.fields.address')}
        placeholder={t('clinics.form.addressPlaceholder')}
        multiline
        rows={3}
      />
      {submitLabel && (
        <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
          {submitLabel}
        </Button>
      )}
    </Box>
  )
}
