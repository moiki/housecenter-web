import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { usersApi } from '@/api/modules/users.api'
import { Icon } from '@/components/shared/Icon'
import { useOnClickOutside } from '@/hooks/utils/useOnClickOutside'

interface Props {
  onToggleSidebar: () => void
}

export function Topbar({ onToggleSidebar }: Props) {
  const { user, updateUser, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useOnClickOutside(menuRef, () => setMenuOpen(false))

  const themeMutation = useMutation({
    mutationFn: usersApi.updateTheme,
    onMutate: ({ isDarkMode }) => {
      if (user) updateUser({ ...user, darkMode: isDarkMode })
      document.documentElement.classList.toggle('dark-mode', isDarkMode)
    },
  })

  const handleThemeToggle = () => {
    const next = !user?.darkMode
    themeMutation.mutate({ isDarkMode: next })
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '?'

  return (
    <header
      className="h-12 flex items-center justify-between px-4 flex-shrink-0 gap-4 bg-primary border-b border-secondary"
    >
      {/* Left: sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-white/5 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Icon name="menu" className="w-4 h-4" />
      </button>

      {/* Center: search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search…"
            className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-md text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
          />
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* Dark mode toggle */}
        <button
          onClick={handleThemeToggle}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-white/5 transition-colors"
          aria-label="Toggle dark mode"
        >
          <Icon name={user?.darkMode ? 'sun' : 'moon'} className="w-4 h-4" />
        </button>

        {/* Notification bell */}
        <button
          className="relative p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-white/5 transition-colors"
          aria-label="Notifications"
        >
          <Icon name="bell" className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 dark:bg-white/10 mx-1" />

        {/* User avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-semibold">{initials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-[12px] font-medium text-gray-700 dark:text-gray-200 leading-none">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <Icon name="chevron" className="w-3.5 h-3.5 text-gray-400 rotate-90" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl py-1 z-50">
              {/* User info header */}
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                <p className="text-[12px] font-semibold text-gray-900 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{user?.email}</p>
                {user?.roles?.[0] && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    {user.roles[0]}
                  </span>
                )}
              </div>
              <button
                onClick={() => { setMenuOpen(false); navigate('/settings') }}
                className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Icon name="settings" className="w-3.5 h-3.5" />
                Settings
              </button>
              <hr className="my-1 border-gray-100 dark:border-gray-800" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Icon name="logout" className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
