import type { ReactNode } from 'react'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import { SlideUpTransition } from './SlideUpTransition'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  actions?: ReactNode
}

// Fullscreen read-only view dialog (mirrors legacy viewDialogContainer).
export function ViewDialog({ open, onClose, title, children, actions }: Props) {
  return (
    <Dialog fullScreen open={open} onClose={onClose} slots={{ transition: SlideUpTransition }}>
      <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
        <Typography variant="h5" component="span">
          {title}
        </Typography>
        <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseOutlined />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  )
}
