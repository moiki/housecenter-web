import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, TextField } from '@mui/material'
import { clinicSchema, type ClinicFormData } from '@/schemas/clinic.schema'
import type { ClinicResponse } from '@/types/clinic.types'

interface Props {
  defaultValues?: ClinicResponse
  onSubmit: (data: ClinicFormData) => Promise<void>
  submitLabel: string
}

// RHF + MUI reference pattern: spread {...field} into TextField (MUI's onChange is an
// event, which field.onChange accepts directly — no adapter, unlike the React Aria inputs).
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
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Name"
            placeholder="e.g. Clinic Central"
            fullWidth
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="address"
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Address"
            placeholder="Full address"
            fullWidth
            multiline
            rows={3}
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
          />
        )}
      />

      <Button type="submit" variant="contained" fullWidth loading={isSubmitting}>
        {submitLabel}
      </Button>
    </Box>
  )
}
