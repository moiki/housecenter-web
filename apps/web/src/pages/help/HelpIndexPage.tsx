import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import { useHelpTopics } from 'core/hooks/help/useHelpTopics'
import type { HelpTopicSummary } from 'core/types/help.types'

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
  const { t } = useTranslation()
  const { data, isLoading } = useHelpTopics()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Counted from the full list, not the filtered one, so chips don't disappear
  // as soon as a filter narrows the results down.
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const [category, topics] of groupByCategory(data ?? [])) {
      counts.set(category, topics.length)
    }
    return counts
  }, [data])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (data ?? []).filter((t) => {
      if (activeCategory && t.category !== activeCategory) return false
      if (!query) return true
      return t.title.toLowerCase().includes(query) || t.summary.toLowerCase().includes(query)
    })
  }, [data, search, activeCategory])

  const groups = groupByCategory(filtered)
  const hasTopics = (data?.length ?? 0) > 0
  const hasActiveFilters = search.trim() !== '' || activeCategory !== null

  const clearFilters = () => {
    setSearch('')
    setActiveCategory(null)
  }

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: 22, sm: 28 } }}>
          {t('help.index.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('help.index.subtitle')}
        </Typography>
      </Box>

      {hasTopics && (
        <>
          <TextField
            fullWidth
            size="medium"
            placeholder={t('help.index.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ maxWidth: 480, mx: 'auto', display: 'block', mb: 2.5 }}
          />

          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'center', mb: 3 }}>
            <Chip
              label={t('help.index.allCategoriesChip')}
              size="small"
              aria-pressed={activeCategory === null}
              onClick={() => setActiveCategory(null)}
              color={activeCategory === null ? 'primary' : 'default'}
              variant={activeCategory === null ? 'filled' : 'outlined'}
            />
            {[...categoryCounts.entries()].map(([category, count]) => (
              <Chip
                key={category}
                label={`${category} (${count})`}
                size="small"
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                color={activeCategory === category ? 'primary' : 'default'}
                variant={activeCategory === category ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </>
      )}

      {isLoading ? (
        <Stack spacing={1.5}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : groups.size === 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <HelpOutlineOutlined sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>
            {hasTopics ? t('help.index.noResults') : t('help.index.empty')}
          </Typography>
          {hasActiveFilters && (
            <Button size="small" onClick={clearFilters} sx={{ mt: 2 }}>
              {t('help.index.clearFiltersButton')}
            </Button>
          )}
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
