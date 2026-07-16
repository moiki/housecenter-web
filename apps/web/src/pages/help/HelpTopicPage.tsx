import { useEffect, useRef } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import Markdown from 'markdown-to-jsx'
import { useHelpTopic } from 'core/hooks/help/useHelpTopics'
import { PageHeader } from '@/components/shared/PageHeader'

export function HelpTopicPage() {
  const { t } = useTranslation()
  const { topicKey = '' } = useParams<{ topicKey: string }>()
  const { data: topic, isLoading, isError } = useHelpTopic(topicKey)
  const titleRef = useRef<HTMLHeadingElement>(null)

  // Move focus to the heading on every topic navigation so keyboard/screen-reader
  // users get an announced landing point — SPA route changes don't move focus by
  // default, which is especially bad on the feature meant to assist navigation.
  useEffect(() => {
    if (topic) titleRef.current?.focus()
  }, [topic])

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={220} height={36} />
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={20} />
          ))}
        </Stack>
      </Box>
    )
  }

  if (isError || !topic) {
    return (
      <Box>
        <Paper variant="outlined" sx={{ borderRadius: 2, py: 8, textAlign: 'center', color: 'text.secondary' }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{t('help.topic.notFound.title')}</Typography>
          <Typography sx={{ mt: 1, fontSize: 14 }}>
            {t('help.topic.notFound.description')}
          </Typography>
          <Button component={RouterLink} to="/help" variant="outlined" sx={{ mt: 3 }}>
            {t('help.topic.backButton')}
          </Button>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/help"
        size="small"
        color="inherit"
        startIcon={<ArrowBackOutlined fontSize="small" />}
        sx={{ mb: 1, ml: -1 }}
      >
        {t('help.topic.backButton')}
      </Button>
      <PageHeader title={topic.title} titleRef={titleRef} />
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
        <Markdown
          options={{
            overrides: {
              h1: { component: Typography, props: { variant: 'h5', sx: { mt: 2, mb: 1, fontWeight: 600, '&:first-of-type': { mt: 0 } } } },
              h2: { component: Typography, props: { variant: 'h6', sx: { mt: 2, mb: 1, fontWeight: 600, '&:first-of-type': { mt: 0 } } } },
              h3: { component: Typography, props: { variant: 'subtitle1', sx: { mt: 2, mb: 1, fontWeight: 600 } } },
              p: { component: Typography, props: { variant: 'body2', sx: { mb: 1.5 } } },
              code: { props: { style: { fontSize: '0.85em' } } },
            },
          }}
        >
          {topic.body}
        </Markdown>
      </Paper>
    </Box>
  )
}
