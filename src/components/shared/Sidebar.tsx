import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '@/lib/constants'
import type { RoleName } from '@/lib/constants'
import { Icon } from '@/components/shared/Icon'

interface Props {
  role: RoleName
  collapsed: boolean
}

const CORE_PATHS  = ['/', '/patients', '/clinics', '/work-routes', '/consultations']
const REPORT_PATH = ['/reports']
const ADMIN_PATHS = ['/collaborators', '/management/users', '/management/invitations']

export function Sidebar({ role, collapsed }: Props) {
  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role))

  const core    = visible.filter((i) => CORE_PATHS.includes(i.path))
  const reports = visible.filter((i) => REPORT_PATH.includes(i.path))
  const admin   = visible.filter((i) => ADMIN_PATHS.includes(i.path))

  const navItem = (item: typeof NAV_ITEMS[0]) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors select-none
         ${isActive
           ? 'bg-brand-50 text-brand-700'
           : 'text-tertiary hover:bg-secondary hover:text-secondary'
         }
         ${collapsed ? 'justify-center px-2' : ''}`
      }
    >
      <Icon name={item.icon} className="w-[15px] h-[15px] flex-shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )

  const groupLabel = (label: string) =>
    !collapsed ? (
      <p className="px-2.5 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-quaternary">
        {label}
      </p>
    ) : (
      <div className="mt-4 border-t border-secondary" />
    )

  return (
    <aside
      className={`flex flex-col h-full flex-shrink-0 transition-all duration-200 ease-in-out bg-primary border-r border-secondary ${collapsed ? 'w-14' : 'w-56'}`}
    >
      {/* Logo */}
      <div
        className={`flex items-center h-14 flex-shrink-0 border-b border-secondary ${collapsed ? 'justify-center px-2' : 'px-4 gap-2.5'}`}
      >
        <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[11px] font-bold tracking-tight">HC</span>
        </div>
        {!collapsed && (
          <span className="text-[13px] font-semibold text-primary truncate">HouseCenter</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {core.map(navItem)}

        {reports.length > 0 && (
          <>
            {groupLabel('Reports')}
            {reports.map(navItem)}
          </>
        )}

        {admin.length > 0 && (
          <>
            {groupLabel('Management')}
            {admin.map(navItem)}
          </>
        )}
      </nav>

      {/* Settings pinned */}
      <div className="px-2 py-3 border-t border-secondary">
        <NavLink
          to="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={({ isActive }) =>
            `group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors
             ${isActive ? 'bg-brand-50 text-brand-700' : 'text-tertiary hover:bg-secondary hover:text-secondary'}
             ${collapsed ? 'justify-center px-2' : ''}`
          }
        >
          <Icon name="settings" className="w-[15px] h-[15px] flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  )
}
