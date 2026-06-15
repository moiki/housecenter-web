import { createTheme, type ThemeOptions } from '@mui/material/styles'

// Brand violet — matches the current Tailwind `brand` token (refine against theme.css if needed).
const brandViolet = '#7c3aed'

// Shared, mode-agnostic options merged into both themes.
const shared: ThemeOptions = {
  shape: { borderRadius: 10 },
  typography: { fontFamily: '"Inter", system-ui, sans-serif' },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    // v9 slots API (TransitionComponent/PaperProps were removed in the v9 cleanup).
    MuiDialog: { defaultProps: { slotProps: { paper: { elevation: 0 } } } },
  },
}

export const lightTheme = createTheme(shared, {
  palette: {
    mode: 'light',
    primary: { main: brandViolet },
    background: { default: '#f4f4f8', paper: '#ffffff' },
  },
})

export const darkTheme = createTheme(shared, {
  palette: {
    mode: 'dark',
    primary: { main: brandViolet },
    background: { default: '#0d0d12', paper: '#18181f' },
  },
})
