import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import dayjs from 'dayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'

interface Props<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label?: string
  helperText?: string
  disabled?: boolean
}

// RHF-wired MUI X DatePicker. Stores a local 'YYYY-MM-DD' string (NOT toISOString,
// which would shift the day across timezones). Needs <LocalizationProvider> at the
// app root (added in AppThemeProvider).
export function RHFDatePicker<T extends FieldValues>({ control, name, label, helperText, disabled }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DatePicker
          label={label}
          disabled={disabled}
          value={field.value ? dayjs(field.value as string) : null}
          onChange={(d) => field.onChange(d && d.isValid() ? d.format('YYYY-MM-DD') : null)}
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
