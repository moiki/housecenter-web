import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/modules/auth.api'
import { useAuthStore } from '@/store/auth.store'
import { useEffect } from 'react'

export function useMe() {
  const { accessToken, setAuth, refreshToken } = useAuthStore()

  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: !!accessToken,
    retry: false,
  })

  useEffect(() => {
    if (query.data && accessToken && refreshToken) {
      // Apply dark mode class from user preference
      if (query.data.darkMode) {
        document.documentElement.classList.add('dark-mode')
      } else {
        document.documentElement.classList.remove('dark-mode')
      }
      setAuth(query.data, accessToken, refreshToken)
    }
  }, [query.data, accessToken, refreshToken, setAuth])

  return query
}
