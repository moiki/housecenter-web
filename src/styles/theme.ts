import { createTheme, alpha, type ThemeOptions } from '@mui/material/styles'

// Brand violet — matches the current Tailwind `brand` token (refine against theme.css if needed).
const brandViolet = '#7c3aed'

// Shared, mode-agnostic options merged into both themes.
// This block is the project's design language — the "elevate-ui" pilot (New Patient form)
// established these tokens; the skill of the same name documents the rationale + how to extend.
const shared: ThemeOptions = {
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
    // Tighter tracking on headings reads more "product" and less "document".
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.015em' },
    h6: { fontWeight: 600, letterSpacing: '-0.01em' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        // Sentence case, not the MUI ALL-CAPS default — the single biggest "cheap → premium" tell.
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
      },
    },
    // Refined input surface: softer resting border, a real hover, and a soft focus
    // ring (the Stripe/Linear signal). Applies to TextField, Select, and DatePicker
    // uniformly since all three render through OutlinedInput.
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          transition: 'box-shadow 120ms ease, border-color 120ms ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.text.primary, 0.15),
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.text.primary, 0.3),
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}`,
          },
        }),
      },
    },
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
