import { Box, type SxProps, type Theme } from '@mui/material'
import FroalaEditorViewImport from 'react-froala-wysiwyg/FroalaEditorView'
import '@/lib/froala.config'

// Same Vite interop unwrap as RichTextEditor (see the Phase 0a gate).
const FroalaEditorView =
  (FroalaEditorViewImport as unknown as { default?: typeof FroalaEditorViewImport }).default ??
  FroalaEditorViewImport

// Read-only renderer for Froala HTML — used wherever stored rich text is displayed
// (comments, treatment details, resolved consultation messages).
export function RichTextView({ content, sx }: { content: string; sx?: SxProps<Theme> }) {
  return (
    <Box
      sx={[
        {
          '& .fr-view': { fontFamily: 'inherit', color: 'text.primary', fontSize: 'inherit' },
          '& .fr-view p': { my: 0.5 },
          '& .fr-view p:first-of-type': { mt: 0 },
          '& .fr-view p:last-child': { mb: 0 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <FroalaEditorView model={content} />
    </Box>
  )
}
