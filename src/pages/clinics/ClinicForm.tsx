import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button } from '@mui/material'
import { RHFTextField } from '@/components/shared/form'
import { clinicSchema, type ClinicFormData } from '@/schemas/clinic.schema'
import type { ClinicResponse } from '@/types/clinic.types'

interface Props {
  defaultValues?: ClinicResponse
  onSubmit: (data: ClinicFormData) => Promise<void>
  submitLabel: string
}

export function ClinicForm({ defaultValues, onSubmit, submitLabel }: Props) {
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
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
    >
      <RHFTextField control={control} name="name" label="Name" placeholder="e.g. Clinic Central" />
      <RHFTextField
        control={control}
        name="address"
        label="Address"
        placeholder="Full address"
        multiline
        rows={3}
      />
      <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
        {submitLabel}
      </Button>
    </Box>
  )
}
