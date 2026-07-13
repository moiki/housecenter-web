import { useId, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, IconButton, Link, Popover, Typography } from '@mui/material'
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined'
import { useHelpTopics } from 'core/hooks/help/useHelpTopics'

interface Props {
  topicKey: string
  children?: ReactNode
}

// A click-triggered Popover, not a hover Tooltip: the content below includes an
// interactive link ("Leer más"), and the ARIA tooltip pattern forbids interactive
// content inside a tooltip — a screen-reader/keyboard user could never reach that
// link if this stayed a Tooltip, since focus-triggered tooltips aren't tabbable into.
export function HelpTooltip({ topicKey, children }: Props) {
  const { data: topics, isLoading, isError } = useHelpTopics()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const popoverId = useId()

  // Help is an enhancement, never a dependency — render nothing while the shared
  // topics list is loading or has failed, instead of a spinner/error at every anchor.
  if (isLoading || isError) return null

  const topic = topics?.find((t) => t.topicKey === topicKey)

  if (!topic) {
    if (import.meta.env.DEV) {
      console.warn(`HelpTooltip: topicKey "${topicKey}" not found in useHelpTopics() list`)
    }
    return null
  }

  const open = Boolean(anchorEl)
  const close = () => setAnchorEl(null)
  const handleClick = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setAnchorEl(e.currentTarget)
    }
  }

  return (
    <>
      {children ? (
        <Box
          component="span"
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          sx={{ display: 'inline-flex', cursor: 'pointer' }}
        >
          {children}
        </Box>
      ) : (
        <IconButton
          size="small"
          aria-label="Ayuda"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          onClick={handleClick}
        >
          <HelpOutlineOutlined fontSize="small" />
        </IconButton>
      )}
      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { maxWidth: 280, p: 2 } } }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {topic.title}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {topic.summary}
        </Typography>
        <Link
          component={RouterLink}
          to={`/help/${topicKey}`}
          underline="hover"
          onClick={close}
          sx={{ display: 'inline-block', mt: 0.75, fontWeight: 600 }}
        >
          Leer más ›
        </Link>
      </Popover>
    </>
  )
}
