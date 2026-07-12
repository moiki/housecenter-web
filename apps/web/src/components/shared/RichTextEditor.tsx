import { Box, FormHelperText, FormLabel } from '@mui/material'
import FroalaEditorImport from 'react-froala-wysiwyg'
import { froalaCompactConfig } from '@/lib/froala.config'

// Vite ESM/CJS interop: under Vite the default import resolves to the UMD namespace,
// not the component class — unwrap `.default` (proven in the Phase 0a Froala gate).
const FroalaEditor =
  (FroalaEditorImport as unknown as { default?: typeof FroalaEditorImport }).default ?? FroalaEditorImport

export interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  /** Merged over the compact defaults (e.g. a taller heightMin or extra buttons). */
  config?: object
  error?: boolean
  helperText?: string
}

// Presentational rich-text editor (value/onChange). The RHF-wired version is RHFRichText.
export function RichTextEditor({
  value,
  onChange,
  label,
  placeholder,
  config,
  error,
  helperText,
}: RichTextEditorProps) {
  return (
    <Box>
      {label && (
        <FormLabel
          error={error}
          sx={{ display: 'block', mb: 0.75, fontSize: 14, fontWeight: 500, color: 'text.secondary' }}
        >
          {label}
        </FormLabel>
      )}

      <Box
        sx={(theme) => ({
          // Round the Froala chrome to match MUI inputs.
          '& .fr-toolbar.fr-top': {
            borderTopLeftRadius: theme.shape.borderRadius,
            borderTopRightRadius: theme.shape.borderRadius,
          },
          '& .fr-second-toolbar': {
            borderBottomLeftRadius: theme.shape.borderRadius,
            borderBottomRightRadius: theme.shape.borderRadius,
          },

          // Error state — tint the chrome borders red like an MUI field in error.
          ...(error && {
            '& .fr-toolbar, & .fr-wrapper, & .fr-second-toolbar': {
              borderColor: theme.palette.error.main,
            },
          }),

          // Dark mode — Froala ships a light chrome; repaint it to the MUI palette.
          ...(theme.palette.mode === 'dark' && {
            '& .fr-toolbar, & .fr-second-toolbar, & .fr-wrapper': {
              backgroundColor: theme.palette.background.paper,
              borderColor: theme.palette.divider,
              color: theme.palette.text.primary,
            },
            '& .fr-element, & .fr-element.fr-view': { color: theme.palette.text.primary },
            '& .fr-placeholder': { color: theme.palette.text.disabled },
            '& .fr-command.fr-btn svg path': { fill: theme.palette.text.secondary },
            '& .fr-command.fr-btn.fr-active svg path': { fill: theme.palette.primary.main },
            '& .fr-command.fr-btn:hover:not(.fr-disabled), & .fr-command.fr-btn.fr-active': {
              backgroundColor: theme.palette.action.hover,
            },
            '& .fr-toolbar .fr-newline': { backgroundColor: theme.palette.divider },
            '& .fr-counter': { color: theme.palette.text.disabled },
          }),
        })}
      >
        <FroalaEditor
          model={value}
          onModelChange={onChange}
          config={{ ...froalaCompactConfig, placeholderText: placeholder, ...config }}
        />
      </Box>

      {error && helperText && (
        <FormHelperText error sx={{ mx: 1.75 }}>
          {helperText}
        </FormHelperText>
      )}
    </Box>
  )
}
