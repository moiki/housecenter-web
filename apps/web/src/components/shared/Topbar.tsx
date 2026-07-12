import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  AppBar,
  Avatar,
  Box,
  ButtonBase,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import MenuOutlined from '@mui/icons-material/MenuOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import LightModeOutlined from '@mui/icons-material/LightModeOutlined'
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined'
import LogoutOutlined from '@mui/icons-material/LogoutOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import { useAuthStore } from '@/store/auth.store'
import { usersApi } from '@/api/modules/users.api'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface Props {
  onToggleSidebar: () => void
}

export function Topbar({ onToggleSidebar }: Props) {
  const { user, updateUser, logout } = useAuthStore()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const menuOpen = Boolean(anchorEl)

  // Optimistic theme toggle: update the user in the store + toggle the legacy `.dark-mode`
  // class (still needed by un-migrated Tailwind/Untitled UI), then persist. The MUI theme
  // re-renders automatically because AppThemeProvider reads user.darkMode from the store.
  const themeMutation = useMutation({
    mutationFn: usersApi.updateTheme,
    onMutate: ({ isDarkMode }) => {
      if (user) updateUser({ ...user, darkMode: isDarkMode })
      document.documentElement.classList.toggle('dark-mode', isDarkMode)
    },
  })

  const handleThemeToggle = () => themeMutation.mutate({ isDarkMode: !user?.darkMode })
  const handleLogout = () => {
    setAnchorEl(null)
    logout()
    navigate('/login', { replace: true })
  }
  const goSettings = () => {
    setAnchorEl(null)
    navigate('/settings')
  }

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '?'

  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{ bgcolor: 'background.default' }}
    >
      <Toolbar variant="dense" sx={{ gap: 1.5 }}>
        <IconButton edge="start" onClick={onToggleSidebar} aria-label="Toggle sidebar" size="small">
          <MenuOutlined fontSize="small" />
        </IconButton>

        <TextField
          size="small"
          placeholder="Search…"
          type="search"
          sx={{ width: { xs: 140, sm: 280 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title={user?.darkMode ? 'Light mode' : 'Dark mode'}>
          <IconButton onClick={handleThemeToggle} size="small" aria-label="Toggle dark mode">
            {user?.darkMode ? <LightModeOutlined fontSize="small" /> : <DarkModeOutlined fontSize="small" />}
          </IconButton>
        </Tooltip>

        <NotificationBell />

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1 }} />

        <ButtonBase
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, borderRadius: 1, p: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
        >
          <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28, fontSize: 11 }}>{initials}</Avatar>
          <Typography sx={{ fontSize: 12, fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>
            {user?.firstName} {user?.lastName}
          </Typography>
        </ButtonBase>

        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { width: 220, mt: 0.5 } } }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{user?.email}</Typography>
            {user?.roles?.[0] && (
              <Chip
                label={user.roles[0]}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ mt: 0.5, height: 18, fontSize: 10 }}
              />
            )}
          </Box>
          <Divider />
          <MenuItem onClick={goSettings}>
            <ListItemIcon>
              <SettingsOutlined fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <LogoutOutlined fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            Sign out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
