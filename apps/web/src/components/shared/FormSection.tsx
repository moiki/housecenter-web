import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'

interface Props {
  title: ReactNode
  children: ReactNode
}

// Groups related fields under a quiet uppercase micro-label. Turns a flat wall of
// inputs into a scannable form with hierarchy — part of the elevate-ui design language.
// Promoted from its original local definition in PatientsPage.tsx so other forms
// (e.g. the work route form) can reuse the same pattern.
export function FormSection({ title, children }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography
        component="div"
        sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  )
}
