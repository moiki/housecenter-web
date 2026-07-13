import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { MenuItem, TextField, type TextFieldProps } from '@mui/material'

export interface SelectOption {
  value: string | number
  label: string
}

type Props<T extends FieldValues> = Omit<
  TextFieldProps,
  'name' | 'error' | 'value' | 'defaultValue' | 'select'
> & {
  control: Control<T>
  name: FieldPath<T>
  options: SelectOption[]
}

// RHF-wired MUI single-select (TextField select + MenuItem) for short lists.
// For long lists (cities, big pickers) use RHFAutocomplete instead.
export function RHFSelect<T extends FieldValues>({ control, name, options, helperText, ...rest }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          select
          fullWidth
          {...rest}
          {...field}
          value={field.value ?? ''}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
        >
          {options.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  )
}
