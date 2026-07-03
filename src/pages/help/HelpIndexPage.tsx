import { Link as RouterLink } from 'react-router-dom'
import { Box, List, ListItemButton, ListItemText, Paper, Skeleton, Stack, Typography } from '@mui/material'
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined'
import { useHelpTopics } from '@/hooks/help/useHelpTopics'
import { PageHeader } from '@/components/shared/PageHeader'
import type { HelpTopicSummary } from '@/types/help.types'

function groupByCategory(topics: HelpTopicSummary[]) {
  const groups = new Map<string, HelpTopicSummary[]>()
  for (const topic of topics) {
    const group = groups.get(topic.category) ?? []
    group.push(topic)
    groups.set(topic.category, group)
  }
  for (const group of groups.values()) {
    group.sort((a, b) => a.displayOrder - b.displayOrder)
  }
  return groups
}

export function HelpIndexPage() {
  const { data, isLoading } = useHelpTopics()
  const groups = groupByCategory(data ?? [])

  return (
    <Box>
      <PageHeader title="Help" description="Guides for using HouseCenter." />

      {isLoading ? (
        <Stack spacing={1.5}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : groups.size === 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <HelpOutlineOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>No help topics available yet.</Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {[...groups.entries()].map(([category, topics]) => (
            <Paper key={category} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{category}</Typography>
              </Box>
              <List disablePadding>
                {topics.map((topic, i) => (
                  <ListItemButton
                    key={topic.topicKey}
                    component={RouterLink}
                    to={`/help/${topic.topicKey}`}
                    sx={{ px: 2, py: 1.5, borderTop: i === 0 ? 0 : 1, borderColor: 'divider' }}
                  >
                    <ListItemText
                      primary={topic.title}
                      secondary={topic.summary}
                      slotProps={{
                        primary: { sx: { fontSize: 14, fontWeight: 500 } },
                        secondary: { sx: { fontSize: 12 } },
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  )
}
