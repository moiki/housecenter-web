import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
} from '@mui/material'
import { SlideUpTransition } from './SlideUpTransition'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  // New (optional) — keeps the existing 9 callers source-compatible.
  cancelLabel?: string
  confirmColor?: 'error' | 'primary' | 'warning'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Small slide-up confirmation dialog (mirrors legacy confirmDialog). Destructive by default
// (confirmColor='error'); callers can override to 'warning'/'primary'.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'error',
  loading,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth slots={{ transition: SlideUpTransition }}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading} color="inherit">
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} color={confirmColor} variant="contained" loading={loading}>
          {confirmLabel}
        </Button>
      </DialogActions>
      {loading && <LinearProgress />}
    </Dialog>
  )
}
