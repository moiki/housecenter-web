import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, IconButton, Link, Tooltip, Typography } from '@mui/material'
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined'
import { useHelpTopics } from '@/hooks/help/useHelpTopics'

interface Props {
  topicKey: string
  children?: ReactNode
}

export function HelpTooltip({ topicKey, children }: Props) {
  const { data: topics, isLoading, isError } = useHelpTopics()

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

  return (
    <Tooltip
      disableInteractive={false}
      title={
        <Box sx={{ maxWidth: 260 }}>
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
            sx={{ display: 'inline-block', mt: 0.75, fontWeight: 600, color: 'inherit' }}
          >
            Leer más ›
          </Link>
        </Box>
      }
    >
      {children ? (
        <Box component="span" sx={{ display: 'inline-flex' }}>
          {children}
        </Box>
      ) : (
        <IconButton size="small" aria-label="Ayuda">
          <HelpOutlineOutlined fontSize="small" />
        </IconButton>
      )}
    </Tooltip>
  )
}
