import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authApi } from 'core/api/modules/auth.api'
import { getAuthStore } from 'core/auth/registry'

export function useMe() {
  const useAuthStore = getAuthStore()
  const { accessToken, refreshToken, setAuth } = useAuthStore()

  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: !!accessToken,
    retry: false,
  })

  useEffect(() => {
    if (query.data && accessToken && refreshToken) {
      setAuth(query.data, accessToken, refreshToken)
    }
  }, [query.data, accessToken, refreshToken, setAuth])

  return query
}
