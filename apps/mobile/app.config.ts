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
  // @react-native-community/datetimepicker (D5, R5/R9/R10) needs its config plugin registered so
  // `expo prebuild`/EAS builds link the native picker module.
  // expo-image-picker (mobile-attachments-camera, D7) needs its config plugin to write the iOS
  // NSCamera/PhotoLibraryUsageDescription strings (Spanish-first, project convention). Neither
  // expo-image-manipulator nor expo-image require a config plugin entry.
  plugins: [
    'expo-localization',
    '@react-native-community/datetimepicker',
    [
      'expo-image-picker',
      {
        cameraPermission: 'Permite a HouseCenter usar la cámara para adjuntar fotos.',
        photosPermission: 'Permite a HouseCenter acceder a tus fotos para adjuntarlas.',
      },
    ],
  ],
  extra: {
    // read at runtime via expo-constants (src/config/env.ts)
    API_BASE_URL,
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
})
