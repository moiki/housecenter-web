import Constants from 'expo-constants'

const API_BASE_URL: string | undefined = Constants.expoConfig?.extra?.API_BASE_URL

if (!API_BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('[env] API_BASE_URL is not set in app.config.ts extra — falling back to localhost')
}

export const env = {
  API_BASE_URL: API_BASE_URL ?? 'http://localhost:5000',
}
