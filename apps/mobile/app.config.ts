import type { ConfigContext, ExpoConfig } from 'expo/config'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5000'

// google-services.json is ops-provided (Firebase project credentials) and is NOT checked into
// this repo — it's required for Android native push-token init (expo-notifications, design.md
// D8) but must never be referenced when absent, or `expo-doctor`/`expo export`/EAS builds break
// on a missing file. Conditional on an env var only (not `fs.existsSync` — this file's tsconfig
// scopes `types` to `expo/types` only, no `@types/node`, so `node:fs`/`node:path`/`__dirname`
// aren't available without widening Node ambient globals project-wide, which risks colliding with
// React Native's own global typings elsewhere, e.g. `setTimeout`). CI/EAS injects
// `GOOGLE_SERVICES_JSON` as the absolute/relative path to the secret file it writes at build time;
// locally, a dev-client build with working FCM registration requires a real
// `google-services.json` to exist AND this env var to point at it before building — there is
// intentionally no repo-relative default path, since checking for one would require `fs`.
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON

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
  ios: { bundleIdentifier: 'net.housecenter.mobile' }, // SDK-55 default floor: iOS 15.1. APNs push
  // capability + key are an EAS/Apple Developer credentials concern (`eas credentials`), not an
  // app.config.ts field — see design.md D8.
  android: {
    package: 'net.housecenter.mobile', // minSdk 24 — verified via expo-doctor (see apply-progress)
    // Conditional (see googleServicesFile above) — omitted entirely when the file isn't present
    // so expo-doctor/expo export/EAS builds stay green without ops-provided Firebase credentials.
    ...(googleServicesFile ? { googleServicesFile } : {}),
  },
  // @react-native-community/datetimepicker (D5, R5/R9/R10) needs its config plugin registered so
  // `expo prebuild`/EAS builds link the native picker module.
  // expo-image-picker (mobile-attachments-camera, D7) needs its config plugin to write the iOS
  // NSCamera/PhotoLibraryUsageDescription strings (Spanish-first, project convention). Neither
  // expo-image-manipulator nor expo-image require a config plugin entry.
  // expo-notifications (mobile-notifications-push PR2b, design.md D8) needs its config plugin for
  // the notification icon/color used on Android; iOS notification sound bundling is optional and
  // omitted here (no custom sound asset shipped in this change).
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
    [
      'expo-notifications',
      {
        color: '#2563eb',
      },
    ],
  ],
  extra: {
    // read at runtime via expo-constants (src/config/env.ts)
    API_BASE_URL,
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
})
