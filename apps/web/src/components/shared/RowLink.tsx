import { Box, type BoxProps } from '@mui/material'

interface RowLinkProps extends Omit<BoxProps, 'onClick'> {
  onClick: () => void
}

// Wraps a table cell's content (name, title) so clicking it opens the same detail view as
// the row's view/edit action — a second, more discoverable way in besides the icon button.
// Keyboard-accessible (role="button" + Enter/Space), not just a mouse convenience.
export function RowLink({ onClick, children, sx, ...rest }: RowLinkProps) {
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      sx={{
        cursor: 'pointer',
        width: 'fit-content',
        borderRadius: 0.5,
        '&:hover': { textDecoration: 'underline' },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  )
}
