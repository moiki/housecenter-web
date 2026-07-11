import type { ReactNode } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import useMediaQuery from '@mui/material/useMediaQuery'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { useAuthStore } from '@/store/auth.store'
import { darkTheme, lightTheme } from '@/styles/theme'

// During the Untitled UI -> MUI migration both systems coexist. Post-auth, MUI dark mode is
// driven by the SAME source as the legacy `.dark-mode` Tailwind class: the server-backed
// `user.darkMode` flag (persisted via PATCH /me/theme). Both stay in sync because both derive
// from it. Pre-auth (no user loaded yet), there is no server preference to read, so we fall
// back to the OS `prefers-color-scheme` media query — once the user logs in, `user.darkMode`
// takes precedence over the OS preference.
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const darkMode = user ? user.darkMode : prefersDark
  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>{children}</LocalizationProvider>
    </ThemeProvider>
  )
}
