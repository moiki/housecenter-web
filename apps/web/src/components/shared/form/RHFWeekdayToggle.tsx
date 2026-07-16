import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ToggleButton, ToggleButtonGroup, Box, Typography } from '@mui/material'
import type { Weekday } from 'core/types/workroute.types'

interface Props<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label?: string
  disabled?: boolean
}

const WEEKDAYS: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// RHF-wired multi-select weekday toggle (value: Weekday[]). Used to build the
// recurrence rule for a work route (weekly-by-weekday only, per design).
export function RHFWeekdayToggle<T extends FieldValues>({ control, name, label, disabled }: Props<T>) {
  const { t } = useTranslation()

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
            {WEEKDAYS.map((d) => {
              const fullName = t(`workRoutes.weekday.${d}`)
              return (
                <ToggleButton key={d} value={d} aria-label={fullName} sx={{ px: 1.5, textTransform: 'none' }}>
                  {fullName.slice(0, 3)}
                </ToggleButton>
              )
            })}
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
