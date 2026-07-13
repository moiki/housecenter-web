import type { ConfigContext, ExpoConfig } from 'expo/config'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5000'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'HouseCenter Mobile',
  slug: 'housecenter-mobile',
  scheme: 'housecenter',
  version: '0.0.0',
  orientation: 'portrait',
  // Native-only: apps/web already owns the web target in this monorepo (Vite SPA). Without this,
  // `expo export`/`expo-doctor` default to also bundling web and fail on missing react-native-web.
  platforms: ['ios', 'android'],
  // NOTE: no `newArchEnabled` field — SDK 55's ExpoConfig type dropped it entirely because the
  // New Architecture is now mandatory (not an opt-in toggle); setting it is a tsc error.
  ios: { bundleIdentifier: 'net.housecenter.mobile' }, // SDK-55 default floor: iOS 15.1
  android: { package: 'net.housecenter.mobile' }, // minSdk 24 — verified via expo-doctor (see apply-progress)
  plugins: ['expo-localization'],
  extra: {
    // read at runtime via expo-constants (src/config/env.ts)
    API_BASE_URL,
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
})
