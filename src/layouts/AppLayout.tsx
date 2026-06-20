import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Box } from '@mui/material'
import { useAuthStore } from '@/store/auth.store'
import { Sidebar } from '@/components/shared/Sidebar'
import { Topbar } from '@/components/shared/Topbar'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import type { RoleName } from '@/lib/constants'

export function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Sidebar role={(user?.roles?.[0] ?? 'Member') as RoleName} collapsed={collapsed} />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar onToggleSidebar={() => setCollapsed((c) => !c)} />

        <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {/* Per-route boundary: a page crash is contained here, keeping the shell usable.
              key={pathname} remounts (clears the error) when the user navigates away. */}
          <ErrorBoundary key={location.pathname} label={`route ${location.pathname}`}>
            <Outlet />
          </ErrorBoundary>
        </Box>
      </Box>
    </Box>
  )
}
