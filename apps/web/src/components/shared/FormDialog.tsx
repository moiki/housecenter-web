import type { FormEvent, ReactNode } from 'react'
import {
  AppBar,
  Box,
  Button,
  Container,
  Dialog,
  IconButton,
  LinearProgress,
  Toolbar,
  Typography,
} from '@mui/material'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import { SlideUpTransition } from './SlideUpTransition'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  loading?: boolean
  submitLabel?: string
  children: ReactNode
}

// Links the AppBar submit button to the <form> without prop drilling (button lives
// outside the form, so it references it by id via the native `form` attribute).
const FORM_ID = 'form-dialog-form'

// Fullscreen slide-up form dialog (mirrors legacy formDialogContainer). Improvement over
// legacy: the submit button lives in the AppBar so it stays visible on long forms.
export function FormDialog({
  open,
  onClose,
  title,
  onSubmit,
  loading,
  submitLabel = 'Save',
  children,
}: Props) {
  return (
    <Dialog fullScreen open={open} onClose={onClose} slots={{ transition: SlideUpTransition }}>
      <AppBar position="relative" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <IconButton edge="start" onClick={onClose} aria-label="Close">
            <CloseOutlined />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>
            {title}
          </Typography>
          <Button type="submit" form={FORM_ID} variant="contained" loading={loading}>
            {submitLabel}
          </Button>
        </Toolbar>
        {loading && <LinearProgress />}
      </AppBar>

      <Container maxWidth="sm">
        <Box id={FORM_ID} component="form" onSubmit={onSubmit} sx={{ mt: 4, pb: 6 }}>
          {children}
        </Box>
      </Container>
    </Dialog>
  )
}
