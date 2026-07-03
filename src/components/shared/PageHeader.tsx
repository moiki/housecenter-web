import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { HelpTooltip } from '@/components/shared/HelpTooltip'

interface Props {
  title: string
  description?: string
  action?: ReactNode
  helpKey?: string
}

export function PageHeader({ title, description, action, helpKey }: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="h5" sx={{ fontSize: 18, fontWeight: 600 }}>
            {title}
          </Typography>
          {helpKey && <HelpTooltip topicKey={helpKey} />}
        </Box>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: 13 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0, ml: 2 }}>{action}</Box>}
    </Box>
  )
}
