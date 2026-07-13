// Deterministic boot wiring — import this FIRST in index.ts, before App. Mirrors
// apps/web/src/bootstrap.ts:1's import order, plus the mobile-only deviceId kickoff.
// Order matters: auth.store runs setAuthStore(), then api/client runs setApiClient()
// (api/client itself imports auth.store, so the order is guaranteed even if this file's
// import order were reshuffled — but keep it explicit for readability).
import './store/auth.store'
import './api/client'
import { initDeviceId } from './lib/deviceId'

// Kick off the SecureStore deviceId read-or-create. AuthBootstrap awaits completion via
// `whenDeviceIdReady()` before rendering children (deviceId must be cached before
// `getDeviceId()` — the sync getter — is ever called by the login/refresh flow).
initDeviceId()
