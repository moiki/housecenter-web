import type { ReactNode } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { useAuthStore } from '@/store/auth.store'
import { darkTheme, lightTheme } from '@/styles/theme'

// During the Untitled UI -> MUI migration both systems coexist. MUI dark mode and the legacy
// `.dark-mode` Tailwind class (toggled in AuthBootstrap, which also drives the `dark:` variant
// and theme.css) must derive from the exact same source or they drift apart. Pre-auth (no user
// loaded yet) there is no server preference to read, so both stay light unconditionally — do
// NOT fall back to the OS `prefers-color-scheme` media query here. A prior version did, and on
// a dark-OS browser it made MUI silently render darkTheme's text tokens (meant for a near-black
// surface) on top of AuthLayout's hardcoded light background, since AuthBootstrap has no such
// fallback and never added `.dark-mode` — two "is it dark?" signals disagreeing. AuthLayout
// (and its RightPanel) were also never fully built out for a dark presentation, so staying
// light pre-auth is correct, not just a workaround.
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const darkMode = user?.darkMode ?? false
  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>{children}</LocalizationProvider>
    </ThemeProvider>
  )
}
