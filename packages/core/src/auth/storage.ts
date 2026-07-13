// Persistence adapter (localStorage on web | SecureStore on mobile). Async-capable so a
// single AuthStorage shape works on both platforms.
export interface AuthStorage {
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}

// Sync view the API client needs. Always synchronous — derived from the in-memory
// Zustand state, not read from storage directly, so the axios interceptor's per-request
// token read never has to await anything.
export interface TokenStore {
  getAccessToken(): string | null
  getRefreshToken(): string | null
  setTokens(access: string, refresh: string): void
  clear(): void
}
