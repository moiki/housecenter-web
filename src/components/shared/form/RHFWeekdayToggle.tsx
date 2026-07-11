import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { ToggleButton, ToggleButtonGroup, Box, Typography } from '@mui/material'
import type { Weekday } from '@/types/workroute.types'

interface Props<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label?: string
  disabled?: boolean
}

const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 'Monday', label: 'Mon' },
  { value: 'Tuesday', label: 'Tue' },
  { value: 'Wednesday', label: 'Wed' },
  { value: 'Thursday', label: 'Thu' },
  { value: 'Friday', label: 'Fri' },
  { value: 'Saturday', label: 'Sat' },
  { value: 'Sunday', label: 'Sun' },
]

// RHF-wired multi-select weekday toggle (value: Weekday[]). Used to build the
// recurrence rule for a work route (weekly-by-weekday only, per design).
export function RHFWeekdayToggle<T extends FieldValues>({ control, name, label, disabled }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Box>
          {label && (
            <Typography sx={{ fontSize: 13, fontWeight: 500, mb: 0.75 }}>{label}</Typography>
          )}
          <ToggleButtonGroup
            value={(field.value as Weekday[] | undefined) ?? []}
            onChange={(_, next: Weekday[]) => field.onChange(next)}
            disabled={disabled}
            size="small"
            sx={{ flexWrap: 'wrap', gap: 0.5, '& .MuiToggleButtonGroup-grouped': { border: 1, borderColor: 'divider', borderRadius: '8px !important', mx: 0 } }}
          >
            {WEEKDAYS.map((d) => (
              <ToggleButton key={d.value} value={d.value} aria-label={d.value} sx={{ px: 1.5, textTransform: 'none' }}>
                {d.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {fieldState.error?.message && (
            <Typography color="error" sx={{ fontSize: 12, mt: 0.5 }}>
              {fieldState.error.message}
            </Typography>
          )}
        </Box>
      )}
    />
  )
}
