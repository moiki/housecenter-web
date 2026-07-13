import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Box, Button, Divider, IconButton, List, ListItemButton, Menu, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined'
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/notifications/useNotifications'
import type { NotificationResponse } from 'core/types/notification.types'

// Only reference types with a standalone detail route can be deep-linked to;
// AttentionSession has no such route (sessions only exist inside a patient's tab).
const REFERENCE_ROUTES: Record<string, (id: string) => string> = {
  Consultation: (id) => `/consultations/${id}`,
}

export function NotificationBell() {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const { data: unread } = useUnreadCount()
  const { data: notifications, isLoading } = useNotifications({ page: 1, pageSize: 10 }, { enabled: open })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const hasUnread = (unread?.count ?? 0) > 0
  const items = notifications?.items ?? []

  const handleSelect = (n: NotificationResponse) => {
    if (!n.isRead) markRead.mutate(n.id)
    setAnchorEl(null)
    const toRoute = n.referenceType ? REFERENCE_ROUTES[n.referenceType] : undefined
    if (toRoute && n.referenceId) navigate(toRoute(n.referenceId))
  }

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton size="small" aria-label="Notifications" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Badge color="error" variant="dot" invisible={!hasUnread}>
            <NotificationsOutlined fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 340, maxHeight: 420, mt: 0.5 } } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Notifications</Typography>
          {hasUnread && (
            <Button size="small" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />

        {isLoading ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </Stack>
        ) : !items.length ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 4 }}>
            No notifications yet.
          </Typography>
        ) : (
          <List disablePadding sx={{ overflowY: 'auto' }}>
            {items.map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => handleSelect(n)}
                sx={{ alignItems: 'flex-start', gap: 1, py: 1.25, bgcolor: n.isRead ? 'transparent' : 'action.hover' }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: n.isRead ? 400 : 600 }} noWrap>
                    {n.title}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>
                    {n.body}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25 }}>
                    {new Date(n.createdDate).toLocaleString()}
                  </Typography>
                </Box>
              </ListItemButton>
            ))}
          </List>
        )}
      </Menu>
    </>
  )
}
