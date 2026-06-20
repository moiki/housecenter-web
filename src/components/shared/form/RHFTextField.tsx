import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { TextField, type TextFieldProps } from '@mui/material'

type Props<T extends FieldValues> = Omit<
  TextFieldProps,
  'name' | 'error' | 'value' | 'defaultValue'
> & {
  control: Control<T>
  name: FieldPath<T>
}

// RHF-wired MUI text input. Renders null/undefined as '' to stay controlled;
// the Zod schema is responsible for the '' -> null transform at the API boundary.
export function RHFTextField<T extends FieldValues>({ control, name, helperText, ...rest }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          fullWidth
          {...rest}
          {...field}
          value={field.value ?? ''}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
        />
      )}
    />
  )
}
