import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import type { RoleName } from '@/lib/constants'

interface Props {
  roles: RoleName[]
}

export function RequireRole({ roles }: Props) {
  const user = useAuthStore((s) => s.user)

  if (!user) return <Navigate to="/login" replace />
  if (!user.roles.some((r) => roles.includes(r as RoleName))) return <Navigate to="/" replace />

  return <Outlet />
}
