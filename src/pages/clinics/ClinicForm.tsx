import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clinicSchema, type ClinicFormData } from '@/schemas/clinic.schema'
import { Input } from '@/components/base/input/input'
import { TextArea } from '@/components/base/textarea/textarea'
import { Button } from '@/components/base/buttons/button'
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
    formState: { errors, isSubmitting },
  } = useForm<ClinicFormData>({
    resolver: zodResolver(clinicSchema),
    defaultValues: defaultValues
      ? { name: defaultValues.name, address: defaultValues.address }
      : { name: '', address: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            label="Name"
            hint={errors.name?.message}
            isInvalid={!!errors.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder="e.g. Clinic Central"
          />
        )}
      />

      <Controller
        control={control}
        name="address"
        render={({ field }) => (
          <TextArea
            label="Address"
            hint={errors.address?.message}
            isInvalid={!!errors.address}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder="Full address"
          />
        )}
      />

      <Button
        type="submit"
        isDisabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
