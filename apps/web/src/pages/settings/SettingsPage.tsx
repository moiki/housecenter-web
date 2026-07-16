import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Alert, Avatar, Box, Chip, Paper, Stack, Switch, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { usersApi } from 'core/api/modules/users.api'
import { isApiError } from 'core/types/common.types'
import { translateErrorCode } from 'core/i18n'

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14 }}>{value}</Typography>
    </Box>
  )
}

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const { user, updateUser } = useAuthStore()
  const [actionError, setActionError] = useState<string | null>(null)

  // Same optimistic-toggle mutation as Topbar.tsx's theme control — kept inline here
  // to match that existing pattern rather than introducing a shared hook for one caller pair.
  const themeMutation = useMutation({
    mutationFn: usersApi.updateTheme,
    onMutate: ({ isDarkMode }) => {
      if (user) updateUser({ ...user, darkMode: isDarkMode })
      document.documentElement.classList.toggle('dark-mode', isDarkMode)
    },
    onError: (err) => setActionError(translateErrorCode(isApiError(err) ? err.code : undefined, lang)),
  })

  // Only updates the store — AuthBootstrap.tsx's effect (the single owner of
  // `i18n.changeLanguage()`) reacts to `user.language` and does the actual switch.
  const languageMutation = useMutation({
    mutationFn: usersApi.updateLanguage,
    onMutate: (language) => {
      if (user) updateUser({ ...user, language })
    },
    onError: (err) => setActionError(translateErrorCode(isApiError(err) ? err.code : undefined, lang)),
  })

  if (!user) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  return (
    <Box sx={{ maxWidth: 640 }}>
      <PageHeader title={t('settings.title')} description={t('settings.description')} />

      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)} sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
          <Typography
            sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 2 }}
          >
            {t('settings.profile.header')}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 20 }}>{initials}</Avatar>
            <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                {user.firstName} {user.lastName}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                {user.roles.map((r) => (
                  <Chip key={r} label={t(`roles.${r}`)} size="small" variant="outlined" color="primary" sx={{ height: 20, fontSize: 11 }} />
                ))}
              </Stack>
            </Box>
          </Box>

          <Stack spacing={2}>
            <ReadOnlyField label={t('common.fields.email')} value={user.email} />
            {user.phoneNumber && <ReadOnlyField label={t('common.fields.phone')} value={user.phoneNumber} />}
            <ReadOnlyField label={t('common.fields.address')} value={user.address} />
            {user.profession && <ReadOnlyField label={t('settings.profile.fields.profession')} value={user.profession} />}
          </Stack>

          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 2.5 }}>
            {t('settings.profile.adminHint')}
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
          <Typography
            sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 2 }}
          >
            {t('settings.appearance.header')}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{t('settings.appearance.darkMode.label')}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{t('settings.appearance.darkMode.description')}</Typography>
            </Box>
            <Switch
              checked={!!user.darkMode}
              onChange={(e) => themeMutation.mutate({ isDarkMode: e.target.checked })}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2.5 }}>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{t('settings.appearance.language.label')}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{t('settings.appearance.language.description')}</Typography>
            </Box>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={user.language}
              onChange={(_, next: 'En' | 'Es' | null) => next && languageMutation.mutate(next)}
            >
              <ToggleButton value="En">EN</ToggleButton>
              <ToggleButton value="Es">ES</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Paper>
      </Stack>
    </Box>
  )
}
