import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Autocomplete, TextField } from '@mui/material'

export interface AutocompleteOption {
  value: string
  label: string
}

interface Props<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  options: AutocompleteOption[]
  label?: string
  helperText?: string
  disabled?: boolean
  placeholder?: string
}

// RHF-wired MUI Autocomplete for long option lists. Stores the option's `value`
// (string id), not the whole option object.
export function RHFAutocomplete<T extends FieldValues>({
  control,
  name,
  options,
  label,
  helperText,
  disabled,
  placeholder,
}: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Autocomplete
          options={options}
          disabled={disabled}
          getOptionLabel={(o) => o.label}
          isOptionEqualToValue={(o, v) => o.value === v.value}
          value={options.find((o) => o.value === field.value) ?? null}
          onChange={(_, opt) => field.onChange(opt ? opt.value : null)}
          onBlur={field.onBlur}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              placeholder={placeholder}
              fullWidth
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? helperText}
            />
          )}
        />
      )}
    />
  )
}
