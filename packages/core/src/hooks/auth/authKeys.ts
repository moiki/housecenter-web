// Query-key factory for device-bound session management. Deliberately named
// `authKeys` (not `sessionKeys`/`deviceSessionKeys`) per spec.md — see
// auth.types.ts for why the response DTO is `DeviceSessionResponse` rather than
// the backend's `SessionResponse` name (avoids colliding with the unrelated
// AttentionSessions domain's `useSessions`/`AttentionSessionResponse`).
export const authKeys = {
  all: ['auth'] as const,
  deviceSessions: () => [...authKeys.all, 'device-sessions'] as const,
}
