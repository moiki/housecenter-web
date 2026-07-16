import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import dayjs from 'dayjs'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'

interface Props<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label?: string
  helperText?: string
  disabled?: boolean
}

// RHF-wired MUI X TimePicker. Stores a local 'HH:mm:ss' string — the API's TimeOnly?
// converter accepts 'HH:mm', 'HH:mm:ss', and the fully-qualified round-trip format
// alike, so this is a safe, unambiguous middle ground (verified against the real
// converter, not assumed). The '2000-01-01T' prefix is just a fixed anchor date so
// dayjs can parse a time-only string — the date part itself is never used or sent.
export function RHFTimePicker<T extends FieldValues>({ control, name, label, helperText, disabled }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TimePicker
          label={label}
          disabled={disabled}
          value={field.value ? dayjs(`2000-01-01T${field.value as string}`) : null}
          onChange={(d) => field.onChange(d && d.isValid() ? d.format('HH:mm:ss') : null)}
          slotProps={{
            textField: {
              fullWidth: true,
              onBlur: field.onBlur,
              error: !!fieldState.error,
              helperText: fieldState.error?.message ?? helperText,
            },
          }}
        />
      )}
    />
  )
}
