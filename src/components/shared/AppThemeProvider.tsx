import type { ReactNode } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { useAuthStore } from '@/store/auth.store'
import { darkTheme, lightTheme } from '@/styles/theme'

// During the Untitled UI -> MUI migration both systems coexist. MUI dark mode is driven by
// the SAME source as the legacy `.dark-mode` Tailwind class: the server-backed `user.darkMode`
// flag (persisted via PATCH /me/theme). Both stay in sync because both derive from it.
//
// NOTE: <CssBaseline /> is intentionally NOT mounted yet — it would fight Tailwind's preflight
// while both systems coexist. Add it in the final cleanup step, once Tailwind is removed.
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const darkMode = useAuthStore((s) => s.user?.darkMode ?? false)
  return <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>{children}</ThemeProvider>
}
