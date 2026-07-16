import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Drawer, IconButton, Typography } from '@mui/material'
import CloseOutlined from '@mui/icons-material/CloseOutlined'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  /** Optional one-line context shown under the title. */
  description?: string
  /** Optional action bar pinned to the bottom of the panel (e.g. Cancel + submit). */
  footer?: ReactNode
  children: ReactNode
}

// Right-anchored slide-over panel (MUI Drawer). Drop-in replacement for the legacy
// Untitled UI SlideOver — same core props, so all callers keep working. The Drawer
// handles backdrop, body scroll-lock, Escape, and transitions natively.
//
// Layout is a full-height flex column: fixed header, scrollable body, optional pinned
// footer. The footer is a sibling of the body (not inside it), so a long form scrolls
// while the actions stay reachable — pair it with `<form id>` + `<Button form={id}>`.
export function SlideOver({ open, onClose, title, description, footer, children }: Props) {
  const { t } = useTranslation()
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 460 }, display: 'flex', flexDirection: 'column' } } }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          px: 3,
          py: 2.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</Typography>
          {description && (
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>{description}</Typography>
          )}
        </Box>
        <IconButton onClick={onClose} aria-label={t('common.actions.close')} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
          <CloseOutlined />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>{children}</Box>

      {footer && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
            px: 3,
            py: 2,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          {footer}
        </Box>
      )}
    </Drawer>
  )
}
