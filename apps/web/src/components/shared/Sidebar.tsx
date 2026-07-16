import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Tooltip,
  Typography,
} from '@mui/material'
import type { SvgIconComponent } from '@mui/icons-material'
import HomeOutlined from '@mui/icons-material/HomeOutlined'
import PeopleOutlined from '@mui/icons-material/PeopleOutlined'
import BusinessOutlined from '@mui/icons-material/BusinessOutlined'
import RouteOutlined from '@mui/icons-material/RouteOutlined'
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined'
import BarChartOutlined from '@mui/icons-material/BarChartOutlined'
import WorkOutlined from '@mui/icons-material/WorkOutlined'
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined'
import MailOutlined from '@mui/icons-material/MailOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined'
import { NAV_ITEMS } from '@/lib/nav'
import type { NavItem } from '@/lib/nav'
import type { RoleName } from 'core/lib/constants'

const EXPANDED = 224
const COLLAPSED = 56

// Maps the string icon names stored in NAV_ITEMS to MUI icons.
const NAV_ICONS: Record<string, SvgIconComponent> = {
  home: HomeOutlined,
  users: PeopleOutlined,
  building: BusinessOutlined,
  map: RouteOutlined,
  message: ChatBubbleOutlineOutlined,
  chart: BarChartOutlined,
  briefcase: WorkOutlined,
  shield: AdminPanelSettingsOutlined,
  mail: MailOutlined,
  settings: SettingsOutlined,
  help: HelpOutlineOutlined,
}

const CORE_PATHS = ['/', '/patients', '/clinics', '/work-routes', '/consultations', '/help']
const REPORT_PATH = ['/reports']
const ADMIN_PATHS = ['/collaborators', '/management/users', '/management/invitations']

interface Props {
  role: RoleName
  collapsed: boolean
}

export function Sidebar({ role, collapsed }: Props) {
  const { t } = useTranslation()
  const width = collapsed ? COLLAPSED : EXPANDED
  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role))
  const core = visible.filter((i) => CORE_PATHS.includes(i.path))
  const reports = visible.filter((i) => REPORT_PATH.includes(i.path))
  const admin = visible.filter((i) => ADMIN_PATHS.includes(i.path))

  const renderItem = (item: NavItem) => {
    const IconComp = NAV_ICONS[item.icon] ?? HomeOutlined
    const label = t(item.label)
    return (
      <Tooltip key={item.path} title={collapsed ? label : ''} placement="right">
        <ListItemButton
          component={NavLink}
          to={item.path}
          end={item.path === '/'}
          sx={{
            borderRadius: 1,
            mx: 0.5,
            minHeight: 40,
            justifyContent: collapsed ? 'center' : 'flex-start',
            px: collapsed ? 1 : 1.5,
            '& .MuiListItemText-primary': { fontSize: 13, fontWeight: 500 },
            '&.active': {
              bgcolor: 'action.selected',
              color: 'primary.main',
              '& .MuiListItemIcon-root': { color: 'primary.main' },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1.5, justifyContent: 'center' }}>
            <IconComp fontSize="small" />
          </ListItemIcon>
          {!collapsed && <ListItemText primary={label} />}
        </ListItemButton>
      </Tooltip>
    )
  }

  const groupHeader = (label: string) =>
    collapsed ? (
      <Divider sx={{ my: 1 }} />
    ) : (
      <ListSubheader
        disableSticky
        sx={{
          bgcolor: 'transparent',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 2.5,
          color: 'text.disabled',
        }}
      >
        {label}
      </ListSubheader>
    )

  return (
    <Drawer
      variant="permanent"
      open={!collapsed}
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          position: 'relative',
          boxSizing: 'border-box',
          bgcolor: 'background.default',
          borderRight: 0, // override MUI's default docked-Drawer right border
          overflowX: 'hidden',
          transition: (t) =>
            t.transitions.create('width', { duration: t.transitions.duration.shorter }),
        },
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          height: 56,
          px: collapsed ? 0 : 2,
          justifyContent: collapsed ? 'center' : 'flex-start',
          flexShrink: 0,
        }}
      >
        <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', width: 28, height: 28, fontSize: 11, fontWeight: 700 }}>
          HC
        </Avatar>
        {!collapsed && <Typography sx={{ fontSize: 13, fontWeight: 600 }}>HouseCenter</Typography>}
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        {core.map(renderItem)}
        {reports.length > 0 && (
          <>
            {groupHeader(t('nav.groupReports'))}
            {reports.map(renderItem)}
          </>
        )}
        {admin.length > 0 && (
          <>
            {groupHeader(t('nav.groupManagement'))}
            {admin.map(renderItem)}
          </>
        )}
      </List>

      {/* Settings pinned */}
      <Box sx={{ py: 0.5 }}>
        <List disablePadding>
          {renderItem({ label: 'nav.settings', path: '/settings', roles: [], icon: 'settings' })}
        </List>
      </Box>
    </Drawer>
  )
}
