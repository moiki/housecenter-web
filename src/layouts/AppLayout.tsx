import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { Sidebar } from '@/components/shared/Sidebar'
import { Topbar } from '@/components/shared/Topbar'
import type { RoleName } from '@/lib/constants'

export function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-secondary">
      <Sidebar
        role={(user?.roles?.[0] ?? 'Member') as RoleName}
        collapsed={collapsed}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onToggleSidebar={() => setCollapsed((c) => !c)} />

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
