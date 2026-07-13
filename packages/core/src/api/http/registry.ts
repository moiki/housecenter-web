import type { AxiosInstance } from 'axios'

// Module-scope indirection so the api modules read the client lazily instead of
// importing a concrete singleton. Web wires this first in `bootstrap.ts`.
let client: AxiosInstance | null = null

export function setApiClient(instance: AxiosInstance): void {
  client = instance
}

export function getApiClient(): AxiosInstance {
  if (!client) {
    throw new Error('getApiClient() called before setApiClient() — check bootstrap order.')
  }
  return client
}
