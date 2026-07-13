// Deterministic boot wiring — import this FIRST in main.tsx, before App.
// Order matters: auth.store runs setAuthStore(), then api/client runs setApiClient()
// (api/client itself imports auth.store, so the order is guaranteed even if this file's
// import order were reshuffled — but keep it explicit for readability).
import '@/store/auth.store'
import '@/api/client'
