import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from 'core/api/modules/auth.api'
import { getAuthStore } from 'core/auth/registry'

// PHI hygiene, layer 1 (core): revoke the device session server-side, then — in
// onSettled, so this still runs if the API call fails offline — clear the local
// auth store and drop the entire query cache (a superset of invalidating just
// `authKeys.deviceSessions()`). Layer 2 (mobile-only: MMKV.clearAll() + nav
// teardown) is wired at the call site in PR3 — core cannot reach mobile's MMKV.
export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (deviceId: string) => authApi.logout(deviceId),
    onSettled: () => {
      getAuthStore().getState().logout()
      qc.clear()
    },
  })
}
