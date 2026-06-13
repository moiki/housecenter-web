import axios from 'axios'
import type { AxiosError } from 'axios'
import { createApiError, type ProblemDetails } from '@/types/common.types'
import { useAuthStore } from '@/store/auth.store'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach Bearer token from store on every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401: try refresh once, retry, else logout
let isRefreshing = false
let pendingQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null) => {
  pendingQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)))
  pendingQueue = []
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ProblemDetails>) => {
    const original = error.config!
    const store = useAuthStore.getState()

    if (error.response?.status === 401 && store.refreshToken) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return apiClient(original)
        })
      }

      isRefreshing = true
      try {
        const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
          { refreshToken: store.refreshToken },
        )
        store.setAuth(store.user!, data.accessToken, data.refreshToken)
        processQueue(null, data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return apiClient(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        store.logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Map ProblemDetails → ApiError
    const problem = error.response?.data
    throw createApiError(
      error.response?.status ?? 0,
      problem?.detail ?? error.message,
      problem?.errors ?? {},
    )
  },
)
