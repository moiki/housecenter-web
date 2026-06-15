import type { ReactNode } from 'react'
import { Box, Drawer, IconButton, Typography } from '@mui/material'
import CloseOutlined from '@mui/icons-material/CloseOutlined'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

// Right-anchored slide-over panel (MUI Drawer). Drop-in replacement for the legacy
// Untitled UI SlideOver — same props, so all callers keep working. The Drawer handles
// backdrop, body scroll-lock, Escape, and transitions natively.
export function SlideOver({ open, onClose, title, children }: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 420 } } } }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{title}</Typography>
        <IconButton onClick={onClose} aria-label="Close">
          <CloseOutlined />
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>{children}</Box>
    </Drawer>
  )
}
