import axios, { type AxiosError } from 'axios'
import { createApiError, type ProblemDetails } from 'core/types/common.types'
import type { TokenStore } from 'core/auth/storage'

export interface CreateApiClientConfig {
  baseURL: string
  tokenStore: TokenStore // replaces useAuthStore.getState() reads/writes
  deviceIdProvider: () => string // sent on the internal /auth/refresh POST
  onRefreshFail: () => void // web maps this to a redirect to the login route — never referenced directly here
}

// Lifted verbatim from apps/web/src/api/client.ts — Bearer interceptor + 401
// single-flight refresh-and-retry queue. Only the three platform seams above are
// parameterized; the queue logic itself is unchanged.
export function createApiClient(cfg: CreateApiClientConfig) {
  const client = axios.create({
    baseURL: cfg.baseURL,
    headers: { 'Content-Type': 'application/json' },
  })

  // Attach Bearer token from the token store on every request
  client.interceptors.request.use((config) => {
    const token = cfg.tokenStore.getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  // On 401: try refresh once, retry, else onRefreshFail
  let isRefreshing = false
  let pendingQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

  const processQueue = (error: unknown, token: string | null) => {
    pendingQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)))
    pendingQueue = []
  }

  client.interceptors.response.use(
    (res) => res,
    async (error: AxiosError<ProblemDetails>) => {
      const original = error.config!
      const refreshToken = cfg.tokenStore.getRefreshToken()

      if (error.response?.status === 401 && refreshToken) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            pendingQueue.push({ resolve, reject })
          }).then((token) => {
            original.headers.Authorization = `Bearer ${token}`
            return client(original)
          })
        }

        isRefreshing = true
        try {
          // Bare axios.post (not the returned instance) to avoid interceptor recursion.
          const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
            `${cfg.baseURL}/auth/refresh`,
            { refreshToken, deviceId: cfg.deviceIdProvider() },
          )
          cfg.tokenStore.setTokens(data.accessToken, data.refreshToken)
          processQueue(null, data.accessToken)
          original.headers.Authorization = `Bearer ${data.accessToken}`
          return client(original)
        } catch (refreshError) {
          processQueue(refreshError, null)
          cfg.tokenStore.clear()
          cfg.onRefreshFail()
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

  return client
}
