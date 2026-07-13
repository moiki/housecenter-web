import { useMutation } from '@tanstack/react-query'
import { Avatar, Box, Chip, Paper, Stack, Switch, Typography } from '@mui/material'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { usersApi } from 'core/api/modules/users.api'

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
  const { user, updateUser } = useAuthStore()

  // Same optimistic-toggle mutation as Topbar.tsx's theme control — kept inline here
  // to match that existing pattern rather than introducing a shared hook for one caller pair.
  const themeMutation = useMutation({
    mutationFn: usersApi.updateTheme,
    onMutate: ({ isDarkMode }) => {
      if (user) updateUser({ ...user, darkMode: isDarkMode })
      document.documentElement.classList.toggle('dark-mode', isDarkMode)
    },
  })

  if (!user) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  return (
    <Box sx={{ maxWidth: 640 }}>
      <PageHeader title="Settings" description="Manage your account and preferences." />

      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
          <Typography
            sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 2 }}
          >
            Profile
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 20 }}>{initials}</Avatar>
            <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                {user.firstName} {user.lastName}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                {user.roles.map((r) => (
                  <Chip key={r} label={r} size="small" variant="outlined" color="primary" sx={{ height: 20, fontSize: 11 }} />
                ))}
              </Stack>
            </Box>
          </Box>

          <Stack spacing={2}>
            <ReadOnlyField label="Email" value={user.email} />
            {user.phoneNumber && <ReadOnlyField label="Phone" value={user.phoneNumber} />}
            <ReadOnlyField label="Address" value={user.address} />
            {user.profession && <ReadOnlyField label="Profession" value={user.profession} />}
          </Stack>

          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 2.5 }}>
            To update your profile information, contact an administrator.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
          <Typography
            sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 2 }}
          >
            Appearance
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Dark mode</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Switch between light and dark theme.</Typography>
            </Box>
            <Switch
              checked={!!user.darkMode}
              onChange={(e) => themeMutation.mutate({ isDarkMode: e.target.checked })}
            />
          </Box>
        </Paper>
      </Stack>
    </Box>
  )
}
