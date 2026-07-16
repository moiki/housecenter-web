import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Box, Button, Divider, Paper, Typography } from '@mui/material'
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined'
import RefreshOutlined from '@mui/icons-material/RefreshOutlined'
import i18n from '@/i18n'

interface Props {
  children: ReactNode
  /** Render-prop fallback. Receives the error and a reset fn; overrides the default UI. */
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode
  /** Context label shown in the dev panel (e.g. the route path). */
  label?: string
}

interface State {
  error: Error | null
  errorInfo: ErrorInfo | null
}

const codeSx = {
  m: 0,
  p: 1.5,
  bgcolor: 'action.hover',
  borderRadius: 1,
  fontFamily: 'monospace',
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: 220,
  overflow: 'auto',
} as const

// React error boundaries must be class components (no hook equivalent for componentDidCatch).
// Catches render errors below it and shows a themed fallback — detailed in dev, summarized in prod.
// Wire one at the app root (catch-all) and one around <Outlet/> (so a page crash keeps the shell).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    if (import.meta.env.DEV) {
      // In prod this is where you'd report to Sentry/etc.
      console.error('[ErrorBoundary]', this.props.label ?? '', error, errorInfo)
    }
  }

  reset = () => this.setState({ error: null, errorInfo: null })

  render() {
    const { error, errorInfo } = this.state
    const { children, fallback, label } = this.props

    if (!error) return children
    if (fallback) return fallback({ error, reset: this.reset })

    const isDev = import.meta.env.DEV

    return (
      <Box sx={{ flexGrow: 1, minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Paper
          variant="outlined"
          sx={{ width: '100%', maxWidth: isDev ? 760 : 440, p: 4, borderRadius: 3 }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isDev ? 'flex-start' : 'center', textAlign: isDev ? 'left' : 'center', gap: 1.25 }}>
            <ErrorOutlineOutlined color="error" sx={{ fontSize: 44 }} />
            <Typography variant="h6">{i18n.t('shell.errorBoundary.heading')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {isDev
                ? 'An error was thrown while rendering. Details below (dev only).'
                : i18n.t('shell.errorBoundary.prodDescription')}
            </Typography>

            {isDev && (
              <Box sx={{ width: '100%', mt: 1 }}>
                <Divider sx={{ mb: 1.5 }} />
                {label && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Boundary: {label}
                  </Typography>
                )}
                <Typography variant="subtitle2" color="error" sx={{ fontFamily: 'monospace', mb: 1, wordBreak: 'break-word' }}>
                  {error.name}: {error.message}
                </Typography>
                {error.stack && <Box component="pre" sx={codeSx}>{error.stack}</Box>}
                {errorInfo?.componentStack && (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, mb: 0.5 }}>
                      Component stack
                    </Typography>
                    <Box component="pre" sx={codeSx}>{errorInfo.componentStack}</Box>
                  </>
                )}
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button variant="contained" startIcon={<RefreshOutlined />} onClick={() => window.location.reload()}>
                {i18n.t('shell.errorBoundary.reloadButton')}
              </Button>
              <Button variant="outlined" onClick={this.reset}>
                {i18n.t('shell.errorBoundary.tryAgainButton')}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    )
  }
}
