import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { FormControlLabel, Switch } from '@mui/material'

interface Props<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  disabled?: boolean
}

// RHF-wired MUI Switch (boolean). Use FormControlLabel + Checkbox if a checkbox is preferred.
export function RHFSwitch<T extends FieldValues>({ control, name, label, disabled }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormControlLabel
          control={
            <Switch
              checked={!!field.value}
              onChange={(_, checked) => field.onChange(checked)}
              onBlur={field.onBlur}
              disabled={disabled}
            />
          }
          label={label}
        />
      )}
    />
  )
}
